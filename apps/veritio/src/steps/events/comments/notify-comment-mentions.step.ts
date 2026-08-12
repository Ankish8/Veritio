import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { EventHandlerContext } from '../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  loadCommentNotificationContext,
  resolveCommentNotificationTargets,
  COMMENT_MENTION_NOTIFICATION_TYPE,
  COMMENT_REPLY_NOTIFICATION_TYPE,
} from '../../../services/comment-notification-service'

/**
 * Turns a new comment into notifications for the people it concerns.
 *
 * Enqueues onto the existing `notification` topic rather than sending directly,
 * so comment notifications inherit in-app persistence, email delivery and
 * rate limiting from the one place that already does all three.
 */

const inputSchema = z.object({
  commentId: z.string(),
  studyId: z.string().uuid(),
  kind: z.enum(['created', 'updated', 'deleted']).optional(),
  authorUserId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  isReply: z.boolean().optional(),
  parentCommentId: z.string().nullable().optional(),
})

export const config = {
  name: 'NotifyCommentMentions',
  description: 'Notify mentioned users and thread participants about a new comment',
  triggers: [{
    type: 'queue',
    topic: 'comment-created',
    input: inputSchema as any,
  }],
  enqueues: ['notification'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger, enqueue }: EventHandlerContext
) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  const context = await loadCommentNotificationContext(supabase, data.commentId)
  if (!context) {
    logger.info('Comment gone before notification; skipping', { commentId: data.commentId })
    return
  }

  const targets = await resolveCommentNotificationTargets(supabase, {
    commentId: data.commentId,
    studyId: data.studyId,
    authorUserId: data.authorUserId ?? context.authorUserId,
    // Trust the persisted, membership-validated ids over anything in the
    // event payload.
    mentions: data.mentions ?? [],
    parentCommentId: data.parentCommentId ?? null,
  })

  if (targets.length === 0) {
    logger.info('No comment notification recipients', { commentId: data.commentId })
    return
  }

  for (const target of targets) {
    const isMention = target.reason === 'mention'
    const title = isMention
      ? `${context.authorName} mentioned you`
      : `${context.authorName} replied to your thread`

    await enqueue({
      topic: 'notification',
      data: {
        userId: target.userId,
        type: isMention ? COMMENT_MENTION_NOTIFICATION_TYPE : COMMENT_REPLY_NOTIFICATION_TYPE,
        title,
        message: `${context.studyTitle}: ${context.preview}`,
        studyId: context.studyId,
        metadata: {
          commentId: context.commentId,
          projectId: context.projectId,
          authorName: context.authorName,
          preview: context.preview,
          studyTitle: context.studyTitle,
          reason: target.reason,
          // Per-recipient: already filtered for opt-outs and the email quiet
          // period, so the notification step doesn't have to re-derive it.
          sendEmail: target.email,
        },
      },
    }).catch(() => {})
  }

  logger.info('Comment notifications enqueued', {
    commentId: data.commentId,
    recipients: targets.length,
    emailed: targets.filter((t) => t.email).length,
  })
}
