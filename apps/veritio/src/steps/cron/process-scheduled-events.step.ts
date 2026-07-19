import type { StepConfig } from '@/lib/motia/types'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'

interface DueRow {
  id: string
  job_id: string
  topic: string
  data: unknown
  attempts: number
}

// scheduled_events postdates the generated Database types — single-point cast
// (same pattern as lifetime-purchase-service).
function scheduledEvents() {
  const supabase = getMotiaSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from('scheduled_events' as any) as any
}

const MAX_ATTEMPTS = 5
const BATCH_LIMIT = 100

export const config = {
  name: 'ProcessScheduledEvents',
  description:
    'Delivers due scheduled_events rows (scheduler-service) onto the durable queue every 30 seconds',
  triggers: [{ type: 'cron', expression: '*/30 * * * * * *' }],
  // Dynamic topics: whatever scheduler-service callers scheduled
  // (study-auto-close, recording-finalized retries, ...)
  enqueues: ['study-auto-close', 'recording-finalized'],
  flows: ['study-lifecycle'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {
  // Atomic claim: one UPDATE ... WHERE status='pending' AND due RETURNING *.
  // A claimed row is invisible to the next tick, so a slow batch never
  // double-delivers.
  const { data: due, error } = (await scheduledEvents()
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .select('id, job_id, topic, data, attempts')
    .limit(BATCH_LIMIT)) as { data: DueRow[] | null; error: { message: string } | null }

  if (error) {
    logger.error('Failed to claim due scheduled events', { error: error.message })
    return
  }
  if (!due || due.length === 0) return

  logger.info('Delivering scheduled events', { count: due.length })

  for (const row of due) {
    try {
      await enqueue({ topic: row.topic, data: (row.data ?? {}) as Record<string, unknown> })
      await scheduledEvents()
        .update({ status: 'done', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', row.id)
    } catch (err) {
      const attempts = (row.attempts ?? 0) + 1
      const giveUp = attempts >= MAX_ATTEMPTS
      logger.error('Scheduled event delivery failed', {
        jobId: row.job_id,
        topic: row.topic,
        attempts,
        givingUp: giveUp,
        error: err instanceof Error ? err.message : String(err),
      })
      await scheduledEvents()
        .update({
          status: giveUp ? 'failed' : 'pending',
          attempts,
          last_error: err instanceof Error ? err.message : String(err),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
    }
  }
}
