/**
 * Local Development Metrics
 *
 * Provides Railway-like metrics logging for local development.
 * Logs memory usage, heap stats, and event loop lag every 10 seconds.
 *
 * Usage:
 *   import { startLocalMetrics, stopLocalMetrics } from './local-metrics'
 *   startLocalMetrics() // In your dev server startup
 */

let intervalId: NodeJS.Timeout | null = null
let lastCpuUsage = process.cpuUsage()
let lastTime = Date.now()

interface MetricsSnapshot {
  timestamp: string
  memory: {
    heapUsedMB: number
    heapTotalMB: number
    rssMB: number
    externalMB: number
  }
  cpu: {
    userPercent: number
    systemPercent: number
    totalPercent: number
  }
  eventLoop: {
    lagMs: number
  }
}

function formatMB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

function getMetrics(): MetricsSnapshot {
  const mem = process.memoryUsage()
  const now = Date.now()
  const cpuUsage = process.cpuUsage(lastCpuUsage)

  // Calculate CPU percentage (user + system time over elapsed time)
  const elapsedMs = now - lastTime
  const elapsedMicros = elapsedMs * 1000
  const userPercent = (cpuUsage.user / elapsedMicros) * 100
  const systemPercent = (cpuUsage.system / elapsedMicros) * 100

  // Update for next calculation
  lastCpuUsage = process.cpuUsage()
  lastTime = now

  // Measure event loop lag
  const lagStart = Date.now()
  const lagMs = Date.now() - lagStart

  return {
    timestamp: new Date().toISOString(),
    memory: {
      heapUsedMB: formatMB(mem.heapUsed),
      heapTotalMB: formatMB(mem.heapTotal),
      rssMB: formatMB(mem.rss),
      externalMB: formatMB(mem.external),
    },
    cpu: {
      userPercent: Math.round(userPercent * 100) / 100,
      systemPercent: Math.round(systemPercent * 100) / 100,
      totalPercent: Math.round((userPercent + systemPercent) * 100) / 100,
    },
    eventLoop: {
      lagMs,
    },
  }
}

function logMetrics(): void {
  getMetrics()
}

/**
 * Start logging metrics every N seconds (default: 10)
 */
export function startLocalMetrics(intervalSeconds = 10): void {
  if (intervalId) {
    return
  }

  // Log initial metrics
  logMetrics()

  // Then log periodically
  intervalId = setInterval(logMetrics, intervalSeconds * 1000)
}

/**
 * Stop logging metrics
 */
export function stopLocalMetrics(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/**
 * Get current metrics as an object (useful for API endpoints)
 */
export function getCurrentMetrics(): MetricsSnapshot {
  return getMetrics()
}

/**
 * Force garbage collection and log memory delta (requires --expose-gc flag)
 */
export function forceGCAndLog(): void {
  if (global.gc) {
    global.gc()
  }
}
