/**
 * Redis Watchdog - Process-level health monitor.
 *
 * Sends a PING to Redis every 10 seconds on its own connection.
 * After 9 consecutive failures (90s), exits the process so Railway
 * can restart it via restartPolicyType = "ON_FAILURE".
 *
 * This catches cases where BullMQ's internal connections silently degrade
 * and the process stays alive but unable to serve requests.
 */

import Redis from 'ioredis'

const PING_INTERVAL_MS = 10_000
const MAX_CONSECUTIVE_FAILURES = 9

let watchdogInterval: NodeJS.Timeout | null = null

export function startRedisWatchdog(connection: {
  host?: string
  port?: number
  password?: string
  username?: string
}) {
  if (watchdogInterval) return // Already running

  const watchdogClient = new Redis({
    host: connection.host || 'localhost',
    port: connection.port || 6379,
    password: connection.password,
    username: connection.username,
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy() {
      return null // Don't retry — let the watchdog logic handle failures
    },
  })

  watchdogClient.on('error', () => {
    // Suppress unhandled error events — failures are tracked via ping
  })

  let consecutiveFailures = 0

  watchdogInterval = setInterval(async () => {
    try {
      await watchdogClient.ping()
      consecutiveFailures = 0
    } catch {
      consecutiveFailures++
      console.error(
        `[Redis Watchdog] PING failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`
      )

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(
          `[Redis Watchdog] ${MAX_CONSECUTIVE_FAILURES} consecutive failures (~${(MAX_CONSECUTIVE_FAILURES * PING_INTERVAL_MS) / 1000}s). Exiting process for restart.`
        )
        process.exit(1)
      }
    }
  }, PING_INTERVAL_MS)

  // Ensure watchdog doesn't prevent process exit
  watchdogInterval.unref()
  // Attempt initial connection
  watchdogClient.connect().catch(() => {
    console.error('[Redis Watchdog] Initial connection failed — monitoring will retry')
  })
}
