/**
 * Scheduler Service — durable delayed events on Postgres.
 *
 * Rows land in scheduled_events; src/steps/cron/process-scheduled-events
 * polls every 30s, atomically claims due rows, and enqueues {topic, data}
 * onto the iii durable queue (≤30s delivery precision — fine for study
 * close dates and retry backoff).
 *
 * History: this used to push BullMQ delayed jobs onto a
 * 'motia-scheduled-events' Redis queue whose consumer worker was never
 * initialized — scheduled events were silently dropped. The exported API is
 * unchanged, so callers (update-study, delete-study, process-transcription)
 * did not move.
 */

import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'

interface ScheduledEventRow {
  id: string
  job_id: string
  topic: string
  data: unknown
  scheduled_for: string
  status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
  attempts: number
}

// scheduled_events postdates the generated Database types — same single-point
// cast the other post-typegen tables use (see lifetime-purchase-service.ts).
function scheduledEvents() {
  const supabase = getMotiaSupabaseClient()
   
  return supabase.from('scheduled_events' as any) as any
}

export interface ScheduledEvent<T = unknown> {
  topic: string
  data: T
  scheduledFor: Date
  jobId?: string
}

export interface ScheduledJobInfo {
  jobId: string
  topic: string
  data: unknown
  scheduledFor: Date
  state: string
}

/** BullMQ-era state names preserved for API compatibility. */
function toJobState(status: string): string {
  switch (status) {
    case 'pending':
      return 'delayed'
    case 'processing':
      return 'active'
    case 'done':
      return 'completed'
    default:
      return status // failed | cancelled
  }
}

/**
 * Schedule (or overwrite) a delayed event. jobId is the idempotency key —
 * re-scheduling an existing jobId resets its topic/data/time and revives
 * cancelled/processed entries back to pending.
 */
export async function scheduleEvent<T>(event: ScheduledEvent<T>): Promise<string> {
  const jobId = event.jobId ?? crypto.randomUUID()

  const { error } = await scheduledEvents()
    .upsert(
      {
        job_id: jobId,
        topic: event.topic,
        data: event.data as Record<string, unknown>,
        scheduled_for: event.scheduledFor.toISOString(),
        status: 'pending',
        attempts: 0,
        last_error: null,
        processed_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'job_id' }
    )

  if (error) {
    throw new Error(`Failed to schedule event ${jobId} (${event.topic}): ${error.message}`)
  }

  return jobId
}

/**
 * Cancel a scheduled event. Returns true only when a still-pending event was
 * cancelled (parity with the BullMQ version, which only removed
 * delayed/waiting jobs).
 */
export async function cancelScheduledEvent(jobId: string): Promise<boolean> {
  const { data, error } = await scheduledEvents()
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    throw new Error(`Failed to cancel scheduled event ${jobId}: ${error.message}`)
  }

  return (data?.length ?? 0) > 0
}

/**
 * Move an existing scheduled event to a new time (optionally with new data).
 * Falls back to creating the event when it doesn't exist and data is given.
 */
export async function rescheduleEvent<T>(
  jobId: string,
  newScheduledFor: Date,
  topic: string,
  newData?: T
): Promise<string> {
  const { data: existing, error } = (await scheduledEvents()
    .select('topic, data')
    .eq('job_id', jobId)
    .maybeSingle()) as { data: Pick<ScheduledEventRow, 'topic' | 'data'> | null; error: { message: string } | null }

  if (error) {
    throw new Error(`Failed to look up scheduled event ${jobId}: ${error.message}`)
  }

  if (!existing && newData === undefined) {
    throw new Error(`Cannot reschedule non-existent job without data: ${jobId}`)
  }

  return scheduleEvent({
    topic: existing?.topic ?? topic,
    data: (newData ?? existing?.data) as T,
    scheduledFor: newScheduledFor,
    jobId,
  })
}

export async function getScheduledEvent(jobId: string): Promise<ScheduledJobInfo | null> {
  const { data, error } = (await scheduledEvents()
    .select('job_id, topic, data, scheduled_for, status')
    .eq('job_id', jobId)
    .maybeSingle()) as { data: Omit<ScheduledEventRow, 'id' | 'attempts'> | null; error: { message: string } | null }

  if (error) {
    throw new Error(`Failed to fetch scheduled event ${jobId}: ${error.message}`)
  }

  // Cancelled events read as gone — the BullMQ version physically removed them.
  if (!data || data.status === 'cancelled') return null

  return {
    jobId: data.job_id,
    topic: data.topic,
    data: data.data,
    scheduledFor: new Date(data.scheduled_for),
    state: toJobState(data.status),
  }
}

export async function listScheduledEvents(limit = 100): Promise<ScheduledJobInfo[]> {
  const { data, error } = (await scheduledEvents()
    .select('job_id, topic, data, scheduled_for, status')
    .eq('status', 'pending')
    .order('scheduled_for', { ascending: true })
    .limit(limit)) as { data: Array<Omit<ScheduledEventRow, 'id' | 'attempts'>> | null; error: { message: string } | null }

  if (error) {
    throw new Error(`Failed to list scheduled events: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    jobId: row.job_id,
    topic: row.topic,
    data: row.data,
    scheduledFor: new Date(row.scheduled_for),
    state: 'delayed',
  }))
}
