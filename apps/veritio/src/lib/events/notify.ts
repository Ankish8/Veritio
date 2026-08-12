/**
 * The single way to raise a user notification.
 *
 * Every emitter used to hand-write an `enqueue({ topic: 'notification', data })`
 * literal, and `send-notification.step.ts` parsed it with a non-strict Zod
 * schema that silently dropped unknown keys. Four emitters independently made
 * the same mistake and nobody noticed, because the notification still appeared
 * — just lossy:
 *
 *   - the export service nested a second `data:` inside `data`, so `jobId`,
 *     `resourceUrl` and `studyId` all vanished and rows landed with a NULL
 *     `study_id`
 *   - the recording-retention cron passed `urgent: true` top-level
 *   - project creation passed `projectId` top-level, so its notification could
 *     never deep-link
 *
 * Routing through one typed helper makes those shapes unrepresentable, and the
 * matching `.strict()` on the consumer turns any remaining drift into a loud
 * queue failure instead of a quietly incomplete row.
 */

/**
 * Every notification the product can raise.
 *
 * Kebab-case throughout: `export_completed`/`export_failed` were the lone
 * snake_case outliers and are renamed here.
 */
export type NotificationType =
  // study lifecycle
  | 'study-created'
  | 'study-auto-closed'
  | 'study-closed-manual'
  | 'project-created'
  | 'analysis-complete'
  | 'study-duplication-complete'
  | 'study-duplication-failed'
  // recordings
  | 'recordings-deleted'
  | 'retention-warning'
  // collaboration
  | 'comment-mention'
  | 'comment-reply'
  // jobs
  | 'export-completed'
  | 'export-failed'
  // billing
  | 'trial-ending-soon'
  | 'trial-expired'
  // workspace / system
  | 'workspace-ready'
  | 'workspace-setup-failed'
  | 'composio-trigger'

/**
 * Buckets used for read-side filtering and per-user channel preferences.
 * A category, not a type, is what a person mutes.
 */
export type NotificationCategory = 'mention' | 'study' | 'job' | 'system' | 'billing'

export const NOTIFICATION_CATEGORY: Record<NotificationType, NotificationCategory> = {
  'comment-mention': 'mention',
  'comment-reply': 'mention',

  'study-created': 'study',
  'study-auto-closed': 'study',
  'study-closed-manual': 'study',
  'project-created': 'study',
  'analysis-complete': 'study',
  'study-duplication-complete': 'study',
  'study-duplication-failed': 'study',
  'recordings-deleted': 'study',
  'retention-warning': 'study',

  'export-completed': 'job',
  'export-failed': 'job',

  'trial-ending-soon': 'billing',
  'trial-expired': 'billing',

  'workspace-ready': 'system',
  'workspace-setup-failed': 'system',
  'composio-trigger': 'system',
}

/**
 * Drop engine-injected envelope fields from a queue payload.
 *
 * The iii engine adds its own keys to every delivered message (currently
 * `_caller_worker_id`). They are transport metadata, not part of any step's
 * domain contract — so a step that validates its input strictly MUST strip them
 * first. Skipping this rejects every message before the first log line and
 * silently fills the dead-letter queue, which is exactly what happened when
 * `.strict()` was first added to the notification consumer.
 *
 * Filters on the `_` prefix rather than the exact key so a future engine field
 * doesn't reproduce the same outage.
 */
export function stripEngineEnvelope(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([key]) => !key.startsWith('_'))
  )
}

export interface NotifyInput {
  /** Recipient. Must be a real user id — never a placeholder. */
  userId: string
  type: NotificationType
  title: string
  message: string
  /** Set whenever the notification concerns a study, so it can deep-link. */
  studyId?: string
  /** The source study for a duplication; carried through by the consumer. */
  originalStudyId?: string
  /**
   * Collapses repeats into a single inbox row carrying a count.
   *
   * Set for high-frequency events (`response:<studyId>:<YYYY-MM-DD>`) so a
   * hundred-response study reads as one line rather than a hundred. Leave unset
   * for anything discrete — a mention or a finished export should never merge
   * with another.
   */
  groupKey?: string
  /**
   * Anything else the UI needs — `projectId`, `commentId`, `jobId`, `urgent`.
   * Everything extra belongs HERE. Top-level keys outside this interface are
   * rejected by the consumer's strict schema.
   */
  metadata?: Record<string, unknown>
}

type EnqueueFn = (event: { topic: string; data: Record<string, unknown> }) => Promise<void>

/**
 * Build the queue payload. Split out from `notify` so emitters that already
 * hold their own emit function (the export service uses `emit`, not `enqueue`)
 * can reuse the same shape.
 */
export function buildNotificationEvent(input: NotifyInput): {
  topic: 'notification'
  data: Record<string, unknown>
} {
  return {
    topic: 'notification',
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      category: NOTIFICATION_CATEGORY[input.type],
      ...(input.studyId ? { studyId: input.studyId } : {}),
      ...(input.groupKey ? { groupKey: input.groupKey } : {}),
      ...(input.originalStudyId ? { originalStudyId: input.originalStudyId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  }
}

/**
 * Enqueue a notification. Never throws: a failed notification must not fail
 * the operation that triggered it — an export that succeeded should not be
 * reported as failed because its "done" message didn't enqueue.
 */
export async function notify(enqueue: EnqueueFn, input: NotifyInput): Promise<void> {
  try {
    await enqueue(buildNotificationEvent(input))
  } catch {
    // Best-effort by design.
  }
}
