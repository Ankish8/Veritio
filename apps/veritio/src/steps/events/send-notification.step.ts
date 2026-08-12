import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getUserEmail } from '../../services/user-service'
import { sendEmail, wrapInEmailLayout, generateCommentMentionEmail } from '../../services/email-service'
import { buildStudyCommentUrl } from '../../lib/email/study-links'
import { sendStudyClosedEmail } from '../../services/study-notification-service'

const inputSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  studyId: z.string().uuid().optional(),
  originalStudyId: z.string().uuid().optional(),
  metadata: z.any().optional(),
})

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
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Sending notification to user ${data.userId}: ${data.type}`)

  try {
    const { error: insertError } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        study_id: data.studyId || null,
        metadata: data.metadata || {},
        read: false,
      })

    if (insertError) {
      // If notifications table doesn't exist, just log and continue
      if (insertError.code === '42P01') {
        logger.info('Notifications table does not exist, skipping in-app notification')
      } else {
        logger.warn('Failed to store in-app notification', { error: insertError })
      }
    } else {
      logger.info(`In-app notification stored for user ${data.userId}`)
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
