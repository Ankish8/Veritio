/**
 * LRU Memory Cache with TTL Support
 *
 * Used to cache frequently accessed data to reduce DB round-trips.
 * Uses LRU eviction to prevent unbounded memory growth.
 *
 * Key improvements over simple Map-based cache:
 * - Bounded size (max 500 entries by default)
 * - LRU eviction when full (least recently used items removed first)
 * - Proactive TTL enforcement (not lazy)
 * - Memory-efficient for high-traffic scenarios
 */

import { LRUCache } from 'lru-cache'

// Default configuration
const DEFAULT_MAX_SIZE = 500
const DEFAULT_TTL_MS = 60_000 // 60 seconds

// Wrapper type to store any value in the cache
interface CacheEntry {
  value: unknown
}

class MemoryCache {
  private cache: LRUCache<string, CacheEntry>
  private defaultTTL: number

  constructor(maxSize = DEFAULT_MAX_SIZE, defaultTTL = DEFAULT_TTL_MS) {
    this.defaultTTL = defaultTTL
    this.cache = new LRUCache<string, CacheEntry>({
      max: maxSize,
      ttl: defaultTTL,
      updateAgeOnGet: true, // Refresh TTL on access (sliding window)
      allowStale: false, // Don't return expired entries
    })
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired (backward compatible)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    return entry !== undefined ? (entry.value as T) : null
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, { value: data }, { ttl: ttlMs ?? this.defaultTTL })
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all keys matching a pattern (prefix-based)
   */
  deletePattern(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache stats for debugging
   */
  stats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Singleton instance
export const cache = new MemoryCache()

// Cache key generators for consistent key naming
export const cacheKeys = {
  // Study-related data (cards, categories, etc.)
  cards: (studyId: string) => `cards:${studyId}`,
  categories: (studyId: string) => `categories:${studyId}`,
  treeNodes: (studyId: string) => `tree-nodes:${studyId}`,
  tasks: (studyId: string) => `tasks:${studyId}`,
  flowQuestions: (studyId: string, section?: string) =>
    section ? `flow-questions:${studyId}:${section}` : `flow-questions:${studyId}`,

  // Prototype test data
  prototype: (studyId: string) => `prototype:${studyId}`,
  prototypeFrames: (studyId: string) => `prototype-frames:${studyId}`,
  prototypeTasks: (studyId: string) => `prototype-tasks:${studyId}`,

  // First impression test data
  firstImpressionDesigns: (studyId: string) => `first-impression-designs:${studyId}`,
  firstImpressionAnalytics: (studyId: string) => `first-impression-analytics:${studyId}`,

  // Study data
  study: (studyId: string) => `study:${studyId}`,
  studiesByProject: (projectId: string) => `studies:${projectId}`,

  // Project data
  project: (projectId: string) => `project:${projectId}`,
  projectsByUser: (userId: string) => `projects:${userId}`,

  // Organization data
  memberCount: (organizationId: string) => `member-count:${organizationId}`,

  // Results analytics (pre-computed, cached for performance)
  resultsAnalytics: (studyId: string) => `results-analytics:${studyId}`,
  resultsOverview: (studyId: string) => `results-overview:${studyId}`,
  cardSortAnalytics: (studyId: string) => `card-sort-analytics:${studyId}`,
  treeTestAnalytics: (studyId: string) => `tree-test-analytics:${studyId}`,
  prototypeTestAnalytics: (studyId: string) => `prototype-test-analytics:${studyId}`,
  firstClickAnalytics: (studyId: string) => `first-click-analytics:${studyId}`,
  surveyAnalytics: (studyId: string) => `survey-analytics:${studyId}`,

  // Invalidation patterns
  studyPattern: (studyId: string) => `study:${studyId}`,
  allStudyData: (studyId: string) => studyId, // Matches cards:studyId, categories:studyId, etc.
  allResultsData: (studyId: string) => `results-analytics:${studyId}`, // Matches all results cache keys
}

// Cache TTLs (in milliseconds)
// Extended for US-only deployment to reduce latency impact for high-latency users
export const cacheTTL = {
  short: 60 * 1000, // 60 seconds (was 30s) - for frequently changing data
  medium: 2 * 60 * 1000, // 2 minutes (was 1 min) - default
  long: 10 * 60 * 1000, // 10 minutes (was 5 min) - for stable data
  veryLong: 30 * 60 * 1000, // 30 minutes (was 15 min) - for rarely changing data
  results: 15 * 60 * 1000, // 15 minutes (was 10 min) - for pre-computed analytics (active studies)
  resultsCompleted: 24 * 60 * 60 * 1000, // 24 hours - for completed studies (never change)
}
