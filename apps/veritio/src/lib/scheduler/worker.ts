/**
 * Scheduler Worker
 *
 * BullMQ worker that processes scheduled events when their time arrives.
 * Emits the events directly to Motia's event queues.
 *
 * This worker is initialized by the Motia plugin system on server startup.
 */

import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import { getRedisClient } from '../redis/client'

const SCHEDULER_QUEUE_NAME = 'motia-scheduled-events'
const MOTIA_EVENTS_PREFIX = 'motia:events'

let schedulerWorker: Worker | null = null
let workerConnection: Redis | null = null

/**
 * Get Redis connection configured for BullMQ workers.
 * BullMQ requires maxRetriesPerRequest: null for blocking operations.
 */
function getWorkerConnection(): Redis {
  if (!workerConnection) {
    // Prefer REDIS_URL (includes auth), fallback to individual vars
    const redisUrl = process.env.REDIS_URL

    const connectionConfig = redisUrl
      ? redisUrl
      : {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD, // Required for Railway
        }

    workerConnection = new Redis(connectionConfig as any, {
      maxRetriesPerRequest: null, // Required for BullMQ workers
      enableReadyCheck: false,
      lazyConnect: false, // BullMQ Workers need immediate connection
    })
  }
  return workerConnection
}

interface ScheduledJobData {
  topic: string
  data: unknown
}

/**
 * Get the queue name for a Motia event topic and step.
 * Motia's BullMQ adapter uses format: {prefix}:{topic}.{stepName}
 */
function getMotiaQueueName(topic: string, stepName: string): string {
  return `${topic}.${stepName}`
}

/**
 * Emit an event directly to a Motia step's queue.
 * This bypasses the Motia emit function but achieves the same result.
 */
async function emitToMotiaQueue(
  topic: string,
  stepName: string,
  data: unknown
): Promise<void> {
  const queueName = getMotiaQueueName(topic, stepName)
  // Cast to any due to ioredis version mismatch between bullmq and our redis client
  const queue = new Queue(queueName, {
    connection: getRedisClient() as any,
    prefix: MOTIA_EVENTS_PREFIX,
  })

  const traceId = `scheduled-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  await queue.add(topic, {
    topic,
    data,
    traceId,
    flows: ['study-lifecycle'],
  })

  await queue.close()
}

/**
 * Topic to step name mapping.
 * Maps scheduled event topics to the Motia steps that handle them.
 */
const TOPIC_HANDLERS: Record<string, string> = {
  'study-auto-close': 'HandleStudyAutoClose',
}

/**
 * Initialize the scheduler worker.
 * Now called lazily on first use to avoid blocking Motia startup.
 *
 * @returns The worker instance
 */
export function initSchedulerWorker(): Worker {
  if (schedulerWorker) {
    return schedulerWorker
  }

  schedulerWorker = new Worker<ScheduledJobData>(
    SCHEDULER_QUEUE_NAME,
    async (job) => {
      const { topic, data } = job.data

      const stepName = TOPIC_HANDLERS[topic]
      if (!stepName) {
        throw new Error(`No handler configured for scheduled topic: ${topic}`)
      }

      await emitToMotiaQueue(topic, stepName, data)
    },
    {
      // Cast to any due to ioredis version mismatch between bullmq and our redis client
      connection: getWorkerConnection() as any,
    }
  )

  schedulerWorker.on('completed', (_job) => {
    // Event processed successfully
  })

  schedulerWorker.on('failed', (_job, _err) => {
    // Log will be handled by the calling context if needed
  })

  return schedulerWorker
}

/**
 * Get the scheduler worker instance, initializing it if needed.
 * This enables lazy initialization on first use.
 */
export function getSchedulerWorker(): Worker {
  return initSchedulerWorker()
}

/**
 * Gracefully shutdown the scheduler worker.
 * Call this during server shutdown.
 */
export async function closeSchedulerWorker(): Promise<void> {
  if (schedulerWorker) {
    await schedulerWorker.close()
    schedulerWorker = null
  }
}

/**
 * Check if the scheduler worker is running.
 */
export function isSchedulerWorkerRunning(): boolean {
  return schedulerWorker !== null && !schedulerWorker.closing
}
