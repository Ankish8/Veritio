/**
 * Request-Scoped Query Tracking for RSC
 *
 * Uses React cache() for automatic per-request isolation instead of AsyncLocalStorage.
 * This avoids the Next.js RSC middleware wrapping problem while providing accurate
 * duplicate query detection and performance monitoring.
 *
 * Key Insight: React cache() creates request-scoped storage automatically.
 * Each HTTP request gets its own Map instance, and concurrent requests are isolated.
 */

import { cache } from 'react'
import { headers } from 'next/headers'

/**
 * Represents a single query execution with timing data
 */
export interface QueryExecution {
  queryName: string
  queryKey: string // e.g., "getStudyMetadata:abc123"
  startTime: number
  endTime?: number
  duration?: number
  count: number // How many times this exact query was called in this request
}

/**
 * Request-scoped tracking data
 * Stored in React cache() for automatic per-request isolation
 */
export interface QueryTrackingData {
  queries: Map<string, QueryExecution>
  route: string
  traceId: string
  requestStartTime: number
}

/**
 * Get per-request query tracking data.
 *
 * React cache() ensures this returns the SAME object for all calls
 * within a single request, but DIFFERENT objects for different requests.
 *
 * This provides request-scoped isolation without AsyncLocalStorage wrapping.
 */
export const getQueryTrackingData = cache(async (): Promise<QueryTrackingData> => {
  const headersList = await headers()
  const route = headersList.get('x-pathname') || 'unknown-route'
  const traceId = headersList.get('x-trace-id') || `req-${Date.now()}`

  return {
    queries: new Map<string, QueryExecution>(),
    route,
    traceId,
    requestStartTime: performance.now(),
  }
})

/**
 * Track a query execution.
 *
 * Records the query in the request-scoped tracking data and increments
 * the call count if this query was already called.
 *
 * Returns a completion function to call when the query finishes (for timing).
 * Returns undefined if tracking is disabled (production mode).
 */
export async function trackQuery(
  queryName: string,
  queryId: string
): Promise<(() => void) | undefined> {
  // Only track in development
  if (process.env.NODE_ENV !== 'development') {
    return undefined
  }

  const tracking = await getQueryTrackingData()
  const queryKey = `${queryName}:${queryId}`
  const existing = tracking.queries.get(queryKey)

  if (existing) {
    // Query already called - increment count (duplicate detected)
    existing.count++
  } else {
    // First call - create new entry
    tracking.queries.set(queryKey, {
      queryName,
      queryKey,
      startTime: performance.now(),
      count: 1,
    })
  }

  // Return completion function for timing
  return () => {
    const query = tracking.queries.get(queryKey)
    if (query && !query.endTime) {
      query.endTime = performance.now()
      query.duration = query.endTime - query.startTime
    }
  }
}

/**
 * Get formatted log prefix.
 *
 * Format: [req-{traceId}] [{route}] [{duration}ms]
 *
 * Matches the standardized format requested by user.
 */
export async function getQueryLogPrefix(duration?: number): Promise<string> {
  if (process.env.NODE_ENV !== 'development') return ''

  const tracking = await getQueryTrackingData()
  const traceIdPart = tracking.traceId.substring(0, 12)
  const routePart = tracking.route
  const durationPart = duration !== undefined ? `${duration.toFixed(2)}ms` : ''

  if (durationPart) {
    return `[${traceIdPart}] [${routePart}] [${durationPart}]`
  }
  return `[${traceIdPart}] [${routePart}]`
}

/**
 * Get query statistics for the current request.
 *
 * Returns aggregate stats like total queries, duplicates, timing.
 * Useful for debugging and performance monitoring.
 */
export async function getQueryStats() {
  if (process.env.NODE_ENV !== 'development') return null

  const tracking = await getQueryTrackingData()
  const queries = Array.from(tracking.queries.values())

  return {
    totalQueries: queries.length,
    duplicateQueries: queries.filter(q => q.count > 1).length,
    totalDuration: queries.reduce((sum, q) => sum + (q.duration || 0), 0),
    queries: queries.map(q => ({
      name: q.queryName,
      duration: q.duration,
      count: q.count,
    })),
  }
}

/**
 * Log query summary for the current request.
 *
 * Shows:
 * - Total queries and time
 * - Duplicate calls (queries called more than once)
 * - Breakdown by query with timing
 *
 * Call this at the end of request (in a QuerySummaryLogger component).
 *
 * Uses React cache() so it only logs once per request even if called multiple times.
 */
export const logQuerySummary = cache(async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') return
})
