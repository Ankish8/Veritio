import type { StreamConfig } from '@/lib/motia/types'
import { z } from 'zod'

/**
 * Comment change-signal stream.
 *
 * Carries NO comment content — only "study X had comment activity at time T".
 * Subscribers re-fetch over the authenticated HTTP API, which is where access
 * control actually lives.
 *
 * That is a deliberate design constraint, not an oversight: on iii 0.22.x a
 * stream's onJoin cannot veto a subscription (verified empirically), and the
 * RBAC listener admits anonymous connections, so anything published here must
 * be assumed readable by whoever holds the group id. The group id is itself a
 * capability (see lib/comments/stream-key.ts), so this is defence in depth:
 * unguessable channel AND nothing sensitive inside it.
 *
 * There is intentionally no onJoin hook — an advisory one would imply an
 * authorization guarantee this layer cannot make.
 */

export const studyCommentSignalSchema = z.object({
  /** Opaque capability key for the study; never the raw study UUID. */
  key: z.string(),
  /** What happened, so the client can decide whether to chime. */
  kind: z.enum(['created', 'updated', 'deleted']),
  /** Author of the change, so a client can skip its own echo. */
  actorUserId: z.string().optional(),
  changedAt: z.string(),
})

export type StudyCommentSignal = z.infer<typeof studyCommentSignalSchema>

export const config: StreamConfig = {
  name: 'studyComments',
  schema: studyCommentSignalSchema as any,
  baseConfig: { storageType: 'default' },
}
