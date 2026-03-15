import { Queue } from 'bullmq'
import { getRedisClient } from '../lib/redis/client'

const SCHEDULER_QUEUE_NAME = 'motia-scheduled-events'

let schedulerQueue: Queue | null = null

// Worker must be initialized manually via initSchedulerWorker() from worker.ts
function getSchedulerQueue(): Queue {
  if (!schedulerQueue) {
    schedulerQueue = new Queue(SCHEDULER_QUEUE_NAME, {
      // Cast to any due to ioredis version mismatch between bullmq and our redis client
      connection: getRedisClient() as any,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      },
    })
  }
  return schedulerQueue
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

export async function scheduleEvent<T>(event: ScheduledEvent<T>): Promise<string> {
  const queue = getSchedulerQueue()
  const delay = Math.max(0, event.scheduledFor.getTime() - Date.now())

  const job = await queue.add(
    event.topic,
    { topic: event.topic, data: event.data },
    {
      delay,
      jobId: event.jobId,
      removeOnComplete: true,
      removeOnFail: false,
    }
  )

  return job.id!
}

export async function cancelScheduledEvent(jobId: string): Promise<boolean> {
  const queue = getSchedulerQueue()
  const job = await queue.getJob(jobId)

  if (job) {
    const state = await job.getState()
    // Only remove if not already completed or failed
    if (state === 'delayed' || state === 'waiting') {
      await job.remove()
      return true
    }
    return false
  }

  return false
}

export async function rescheduleEvent<T>(
  jobId: string,
  newScheduledFor: Date,
  topic: string,
  newData?: T
): Promise<string> {
  const queue = getSchedulerQueue()
  const existingJob = await queue.getJob(jobId)

  if (existingJob) {
    const data = newData ?? existingJob.data.data
    const state = await existingJob.getState()

    // Only remove if in a removable state
    if (state === 'delayed' || state === 'waiting') {
      await existingJob.remove()
    }

    return scheduleEvent({
      topic: existingJob.data.topic || topic,
      data,
      scheduledFor: newScheduledFor,
      jobId,
    })
  }

  // Job doesn't exist, create new one
  if (!newData) {
    throw new Error(`Cannot reschedule non-existent job without data: ${jobId}`)
  }

  return scheduleEvent({
    topic,
    data: newData,
    scheduledFor: newScheduledFor,
    jobId,
  })
}

export async function getScheduledEvent(jobId: string): Promise<ScheduledJobInfo | null> {
  const queue = getSchedulerQueue()
  const job = await queue.getJob(jobId)

  if (!job) return null

  const state = await job.getState()
  const delay = job.opts.delay || 0
  const scheduledFor = new Date(job.timestamp + delay)

  return {
    jobId: job.id!,
    topic: job.data.topic,
    data: job.data.data,
    scheduledFor,
    state,
  }
}

export async function listScheduledEvents(limit = 100): Promise<ScheduledJobInfo[]> {
  const queue = getSchedulerQueue()
  const delayed = await queue.getDelayed(0, limit - 1)

  return delayed.map((job) => {
    const delay = job.opts.delay || 0
    return {
      jobId: job.id!,
      topic: job.data.topic,
      data: job.data.data,
      scheduledFor: new Date(job.timestamp + delay),
      state: 'delayed',
    }
  })
}
