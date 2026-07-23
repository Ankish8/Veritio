/**
 * Scheduler Module
 *
 * Durable delayed events on Postgres (scheduled_events table), delivered by
 * the process-scheduled-events cron step every 30 seconds. Use this instead
 * of cron jobs when an event should fire once at a specific time.
 *
 * @example
 * import { scheduleEvent, cancelScheduledEvent } from './index'
 *
 * // Schedule study to close at specific time
 * await scheduleEvent({
 *   topic: 'study-auto-close',
 *   data: { studyId, reason: 'date' },
 *   scheduledFor: closeDate,
 *   jobId: `study-close-${studyId}`,
 * })
 *
 * // Cancel if study is deleted
 * await cancelScheduledEvent(`study-close-${studyId}`)
 */

export {
  scheduleEvent,
  cancelScheduledEvent,
  rescheduleEvent,
  getScheduledEvent,
  listScheduledEvents,
  type ScheduledEvent,
  type ScheduledJobInfo,
} from '../../services/scheduler-service'
