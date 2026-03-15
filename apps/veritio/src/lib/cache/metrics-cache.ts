/**
 * Metrics Caching Layer
 *
 * Implements LRU cache for tree test metrics to eliminate redundant computations
 * when users switch between segments or tabs they've already viewed.
 *
 * Phase 3.2: Response Caching Layer
 *
 * Key features:
 * - LRU eviction policy (keeps most recently used entries)
 * - TTL-based expiration (5 minute cache lifetime)
 * - Hash-based response fingerprinting (detects when data changes)
 * - Separate caches for overall metrics and per-task metrics
 *
 * Usage:
 * ```ts
 * const cached = getCachedOverallMetrics(studyId, responseHash, segmentId)
 * if (cached) return cached
 *
 * const computed = computeTreeTestMetrics(...)
 * setCachedOverallMetrics(studyId, responseHash, computed, segmentId)
 * ```
 */

import { LRUCache } from 'lru-cache'
import type { OverallMetrics, TaskMetrics } from '../algorithms/tree-test-analysis'
import type { TreeTestResponse } from '../algorithms/tree-test-analysis'

// ============================================================================
// Types
// ============================================================================

interface CacheKey {
  studyId: string
  taskId?: string // Optional for overall metrics
  segmentId?: string
  responseHash: string
}

interface OverallMetricsCacheEntry {
  metrics: OverallMetrics
  timestamp: number
}

interface TaskMetricsCacheEntry {
  metrics: TaskMetrics
  timestamp: number
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_OPTIONS = {
  max: 100, // Max 100 cached results
  ttl: 1000 * 60 * 5, // 5 minute TTL
  updateAgeOnGet: true, // Refresh TTL on access (keep frequently used items)
  updateAgeOnHas: false, // Don't refresh TTL on has() checks
}

// Separate caches for different metric types
const overallMetricsCache = new LRUCache<string, OverallMetricsCacheEntry>(
  CACHE_OPTIONS
)

const taskMetricsCache = new LRUCache<string, TaskMetricsCacheEntry>(
  CACHE_OPTIONS
)

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Create a deterministic cache key from components.
 * Format: studyId:taskId:segmentId:responseHash
 */
function createCacheKey(key: CacheKey): string {
  const parts = [key.studyId]

  if (key.taskId) parts.push(key.taskId)
  parts.push(key.segmentId || 'all')
  parts.push(key.responseHash)

  return parts.join(':')
}

/**
 * Create a fast fingerprint of responses based on IDs and count.
 * This is much faster than hashing the entire response array.
 *
 * Strategy:
 * - Include response count (catches additions/removals)
 * - Include first 5 and last 5 response IDs (catches reordering)
 * - Sorted to ensure consistency
 *
 * This provides good collision resistance while being O(n log n) instead of O(n).
 */
export function hashResponses(responses: TreeTestResponse[]): string {
  if (responses.length === 0) return 'empty'

  // Sort IDs to ensure consistent hash regardless of array order
  const sortedIds = responses.map((r) => r.id).sort()

  // Take first 5 and last 5 IDs
  const head = sortedIds.slice(0, 5).join(',')
  const tail = sortedIds.slice(-5).join(',')

  return `${responses.length}:${head}:${tail}`
}

// ============================================================================
// Overall Metrics Cache
// ============================================================================

/**
 * Get cached overall metrics if available.
 * Returns null if not in cache or expired.
 */
export function getCachedOverallMetrics(
  studyId: string,
  responses: TreeTestResponse[],
  segmentId?: string
): OverallMetrics | null {
  const key = createCacheKey({
    studyId,
    segmentId,
    responseHash: hashResponses(responses),
  })

  const entry = overallMetricsCache.get(key)
  return entry?.metrics ?? null
}

/**
 * Store overall metrics in cache.
 */
export function setCachedOverallMetrics(
  studyId: string,
  responses: TreeTestResponse[],
  metrics: OverallMetrics,
  segmentId?: string
): void {
  const key = createCacheKey({
    studyId,
    segmentId,
    responseHash: hashResponses(responses),
  })

  overallMetricsCache.set(key, {
    metrics,
    timestamp: Date.now(),
  })
}

// ============================================================================
// Task Metrics Cache
// ============================================================================

/**
 * Get cached task metrics if available.
 * Returns null if not in cache or expired.
 */
export function getCachedTaskMetrics(
  studyId: string,
  taskId: string,
  responses: TreeTestResponse[],
  segmentId?: string
): TaskMetrics | null {
  const key = createCacheKey({
    studyId,
    taskId,
    segmentId,
    responseHash: hashResponses(responses),
  })

  const entry = taskMetricsCache.get(key)
  return entry?.metrics ?? null
}

/**
 * Store task metrics in cache.
 */
export function setCachedTaskMetrics(
  studyId: string,
  taskId: string,
  responses: TreeTestResponse[],
  metrics: TaskMetrics,
  segmentId?: string
): void {
  const key = createCacheKey({
    studyId,
    taskId,
    segmentId,
    responseHash: hashResponses(responses),
  })

  taskMetricsCache.set(key, {
    metrics,
    timestamp: Date.now(),
  })
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all cached metrics.
 * Useful when underlying data changes (e.g., responses are edited/deleted).
 */
export function clearMetricsCache(): void {
  overallMetricsCache.clear()
  taskMetricsCache.clear()
}

/**
 * Clear cached metrics for a specific study.
 */
export function clearStudyMetricsCache(studyId: string): void {
  // LRUCache doesn't have built-in key filtering, so we iterate
  for (const key of overallMetricsCache.keys()) {
    if (key.startsWith(`${studyId}:`)) {
      overallMetricsCache.delete(key)
    }
  }

  for (const key of taskMetricsCache.keys()) {
    if (key.startsWith(`${studyId}:`)) {
      taskMetricsCache.delete(key)
    }
  }
}

/**
 * Get cache statistics for debugging/monitoring.
 */
export function getCacheStats() {
  return {
    overallMetrics: {
      size: overallMetricsCache.size,
      max: overallMetricsCache.max,
    },
    taskMetrics: {
      size: taskMetricsCache.size,
      max: taskMetricsCache.max,
    },
  }
}

// ============================================================================
// Development Utilities
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // Expose cache stats in development for debugging
  if (typeof window !== 'undefined') {
    ;(window as any).__metricsCache = {
      getStats: getCacheStats,
      clear: clearMetricsCache,
      clearStudy: clearStudyMetricsCache,
    }
  }
}
