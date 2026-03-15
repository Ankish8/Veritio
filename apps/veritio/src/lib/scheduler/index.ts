/**
 * Scheduler Module
 *
 * Provides scheduled event functionality using BullMQ delayed jobs.
 * Use this instead of cron jobs when you need precise timing.
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

export {
  initSchedulerWorker,
  closeSchedulerWorker,
  isSchedulerWorkerRunning,
} from './worker'
