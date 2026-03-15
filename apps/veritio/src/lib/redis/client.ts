/**
 * Shared Redis client singleton for Motia backend.
 * Used by rate limiting, caching, and BullMQ event processing.
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Get or create the shared Redis client instance.
 * Connection is lazy - only connects when first needed.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    // Prefer REDIS_URL (includes auth), fallback to individual vars
    const redisUrl = process.env.REDIS_URL

    const connectionConfig = redisUrl
      ? redisUrl // Use full URL which includes password
      : {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD, // Required for Railway
        }

    const MAX_RETRY_ATTEMPTS = 20

    redisClient = new Redis(connectionConfig as any, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > MAX_RETRY_ATTEMPTS) {
          console.error(`[Redis] Max retry attempts (${MAX_RETRY_ATTEMPTS}) exhausted. Exiting process for restart.`)
          process.exit(1)
        }
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNREFUSED', 'ETIMEDOUT']
        if (targetErrors.some((target) => err.message.includes(target))) {
          return true // Reconnect on these errors
        }
        return false
      },
    })

    // Handle connection events
    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })
  }

  return redisClient
}

/**
 * Close the Redis connection gracefully.
 * Call this during application shutdown.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

/**
 * Check if Redis is connected and ready.
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready'
}
