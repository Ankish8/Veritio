import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { EventHandlerContext } from '../../../lib/motia/types'
import { getCommentStreamKey, COMMENT_STREAM_NAME } from '../../../lib/comments/stream-key'

/**
 * Publishes a content-free "comments changed" tick for a study.
 *
 * The three comment-* topics have been enqueued since the feature shipped with
 * no subscriber at all — every comment fired an event into the void. This is
 * that subscriber.
 *
 * The payload carries NO comment content: the stream layer cannot authorize
 * subscriptions (onJoin's veto is advisory on iii 0.22.x, verified empirically),
 * so anything published here must be assumed readable by whoever holds the
 * group id. Clients treat the tick as "go re-fetch over the authenticated API".
 */

const inputSchema = z.object({
  commentId: z.string(),
  studyId: z.string().uuid(),
  // Carried explicitly in the payload rather than inferred from the topic:
  // queue handlers are invoked as handler(data, ctx) and the dispatching topic
  // is not passed through, so deriving it from context would silently collapse
  // every signal to one kind.
  kind: z.enum(['created', 'updated', 'deleted']),
  authorUserId: z.string().optional(),
  userId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  isReply: z.boolean().optional(),
  parentCommentId: z.string().nullable().optional(),
})

export const config = {
  name: 'PublishCommentSignal',
  description: 'Broadcast a content-free comment change signal on the studyComments stream',
  triggers: [
    { type: 'queue', topic: 'comment-created', input: inputSchema as any },
    { type: 'queue', topic: 'comment-updated', input: inputSchema as any },
    { type: 'queue', topic: 'comment-deleted', input: inputSchema as any },
  ],
  enqueues: [],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { logger, streams }: EventHandlerContext
) => {
  const data = inputSchema.parse(input)

  const key = getCommentStreamKey(data.studyId)
  if (!key) {
    // No signing secret configured — publishing to a guessable channel would
    // be worse than being slow, so clients just stay on their polling path.
    logger.warn('No stream secret configured; skipping comment signal', { studyId: data.studyId })
    return
  }

  const { kind } = data
  const changedAt = new Date().toISOString()
  const signalId = `${kind}-${data.commentId}`

  try {
    await (streams as any)[COMMENT_STREAM_NAME].set(key, signalId, {
      key,
      kind,
      actorUserId: data.authorUserId ?? data.userId,
      changedAt,
    })
  } catch (error) {
    // Best-effort: the panel's polling fallback still converges.
    logger.warn('Failed to publish comment signal', {
      studyId: data.studyId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
