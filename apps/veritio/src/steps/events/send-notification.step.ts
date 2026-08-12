import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, wrapInEmailLayout, generateCommentMentionEmail } from '../../services/email-service'
import { buildStudyCommentUrl } from '../../lib/email/study-links'
import {
  NOTIFICATION_CATEGORY,
  stripEngineEnvelope,
  type NotificationCategory,
  type NotificationType,
} from '../../lib/events/notify'
import { resolveChannels } from '../../services/notification-preferences-service'
import { sendStudyClosedEmail } from '../../services/study-notification-service'

/**
 * Strict on the DOMAIN payload only.
 *
 * Unknown keys used to be stripped silently, which is how four emitters shipped
 * malformed payloads that produced incomplete rows without anyone noticing — a
 * nested `data:`, a top-level `urgent`, a top-level `projectId`. Strictness is
 * what surfaces that class of mistake.
 *
 * But it can only be applied AFTER `stripEngineEnvelope`. The iii engine injects
 * its own fields into every queue message (`_caller_worker_id`), so parsing the
 * raw input strictly rejects every single notification — which is exactly what
 * happened: 11 messages straight to the dead-letter queue, silently, because the
 * throw occurs before the first log line.
 *
 * Build payloads with `buildNotificationEvent`/`notify` (lib/events/notify.ts)
 * rather than by hand; the types there make the rejected shapes unrepresentable.
 */
const inputSchema = z
  .object({
    userId: z.string().min(1),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    category: z.string().optional(),
    groupKey: z.string().max(200).optional(),
    studyId: z.string().uuid().optional(),
    originalStudyId: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

/** Notification types that mean "this study just closed", from any close path. */
const CLOSURE_NOTIFICATION_TYPES = ['study-auto-closed', 'study-closed-manual']

/** Fallback reason when the emitter didn't supply one in metadata. */
const DEFAULT_CLOSE_REASON: Record<string, string | undefined> = {
  'study-closed-manual': 'manual',
}

/** Operational emails that always go out, independent of study settings. */
const DIRECT_EMAIL_TYPES = ['study-duplication-failed']

/**
 * Comment notifications. These carry their own rendered email and a
 * per-recipient `metadata.sendEmail` decision, already filtered upstream for
 * the user's mention-email preference and the quiet period that stops a burst
 * of mentions becoming a burst of emails.
 */
const COMMENT_EMAIL_TYPES = ['comment-mention', 'comment-reply']

export const config = {
  name: 'SendNotification',
  description: 'Handle sending notifications to users (email and in-app)',
  triggers: [{
    type: 'queue',
    topic: 'notification',
    input: inputSchema as any,
  }],
  enqueues: [],
  flows: ['notifications'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger }: EventHandlerContext) => {
  // safeParse, not parse: a malformed payload should be a loud log line, not an
  // exception thrown before logging that lands the message in the DLQ where
  // nobody looks. Retrying can't fix a bad shape, so this doesn't rethrow.
  const parsed = inputSchema.safeParse(stripEngineEnvelope(input))
  if (!parsed.success) {
    logger.error('Rejected malformed notification payload', {
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      receivedKeys: Object.keys((input ?? {}) as object),
    })
    return
  }
  const data = parsed.data
  const supabase = getMotiaSupabaseClient()

  const category = (data.category ??
    NOTIFICATION_CATEGORY[data.type as NotificationType] ??
    'system') as NotificationCategory

  // One lookup drives both channels, replacing the hard-coded type arrays that
  // used to decide who got email with no user say in it.
  const channels = await resolveChannels(supabase, data.userId, category)

  logger.info(`Sending notification to user ${data.userId}: ${data.type}`, {
    category,
    inApp: channels.inApp,
    email: channels.email,
  })

  try {
    if (!channels.inApp) {
      logger.info('In-app notification muted by user preference', {
        userId: data.userId,
        category,
      })
    } else if (data.groupKey) {
      // Roll up into one row per group. Atomic in SQL because concurrent
      // events are the normal case for anything worth grouping.
      const { data: rolled, error: rollupError } = await (supabase as any).rpc(
        'upsert_grouped_notification',
        {
          p_user_id: data.userId,
          p_type: data.type,
          p_category: category,
          p_title: data.title,
          p_message: data.message,
          p_group_key: data.groupKey,
          p_study_id: data.studyId ?? null,
          p_metadata: data.metadata ?? {},
        }
      )

      if (rollupError) {
        logger.warn('Failed to roll up notification', { error: rollupError.message })
      } else {
        logger.info('Grouped notification upserted', {
          userId: data.userId,
          groupKey: data.groupKey,
          count: Array.isArray(rolled) ? rolled[0]?.count : undefined,
        })
      }
    } else {
    const { error: insertError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        // Falls back by type so an emitter that predates the category field
        // still lands in the right bucket rather than defaulting to 'system'.
        category,
        study_id: data.studyId || null,
        metadata: data.metadata || {},
        read: false,
      })

    if (insertError) {
      // The table exists as of 20260812010000_comments_v2.sql. Before that this
      // swallowed 42P01 on every insert, which is why years of notifications
      // silently went nowhere — so a missing table is now a loud warning.
      if (insertError.code === '42P01') {
        logger.error('Notifications table missing — in-app notification dropped', {
          type: data.type,
        })
      } else {
        logger.warn('Failed to store in-app notification', { error: insertError })
      }
    } else {
      logger.info(`In-app notification stored for user ${data.userId}`)
    }
    }

    // Email is gated on the same category preference. A user who muted a
    // category should stop hearing about it on every channel, not just one.
    if (!channels.email) {
      logger.info('Email suppressed by user preference', { userId: data.userId, category })
      return
    }

    // Closure emails are gated on the study's own "Study Closes" toggle, and
    // the helper resolves the title, response count and results link straight
    // from the row so every closure path produces the same email.
    if (CLOSURE_NOTIFICATION_TYPES.includes(data.type)) {
      if (!data.studyId) {
        logger.warn('Closure notification without a studyId, skipping email', { type: data.type })
        return
      }

      await sendStudyClosedEmail({
        supabase,
        studyId: data.studyId,
        reason: (data.metadata?.reason as string | undefined) ?? DEFAULT_CLOSE_REASON[data.type],
        logger,
      })
      return
    }

    if (COMMENT_EMAIL_TYPES.includes(data.type)) {
      // The in-app row above is always written; email is the opt-out-able part.
      if (data.metadata?.sendEmail !== true) {
        logger.info('Comment notification stored without email', {
          userId: data.userId,
          type: data.type,
        })
        return
      }

      const userEmail = await getUserEmail(data.userId)
      if (!userEmail) {
        logger.warn('Could not get user email for comment notification', { userId: data.userId })
        return
      }

      const reason = data.type === 'comment-mention' ? 'mention' : 'reply'
      const html = generateCommentMentionEmail({
        authorName: String(data.metadata?.authorName ?? 'A teammate'),
        studyTitle: String(data.metadata?.studyTitle ?? 'your study'),
        preview: String(data.metadata?.preview ?? ''),
        commentUrl: buildStudyCommentUrl(
          (data.metadata?.projectId as string | null) ?? null,
          data.studyId!,
          String(data.metadata?.commentId ?? '')
        ),
        reason,
      })

      const result = await sendEmail({
        to: userEmail,
        subject: data.title,
        html,
        studyId: data.studyId,
      })

      if (result.success) {
        logger.info('Comment notification email sent', { emailId: result.id, type: data.type })
      } else {
        logger.warn('Failed to send comment notification email', { error: result.error })
      }
      return
    }

    if (DIRECT_EMAIL_TYPES.includes(data.type)) {
      const userEmail = await getUserEmail(data.userId)

      if (userEmail) {
        const html = wrapInEmailLayout(
          `<h2>${data.title}</h2><p>${data.message}</p>`,
          data.title
        )

        const result = await sendEmail({
          to: userEmail,
          subject: data.title,
          html,
          studyId: data.studyId,
        })

        if (result.success) {
          logger.info(`Email notification sent for ${data.type}`, { emailId: result.id })
        } else {
          logger.warn(`Failed to send email notification for ${data.type}`, {
            error: result.error,
          })
        }
      } else {
        logger.warn('Could not get user email for notification', { userId: data.userId })
      }
    }
  } catch (error) {
    logger.error('Error sending notification', { error, userId: data.userId, type: data.type })
  }
}
