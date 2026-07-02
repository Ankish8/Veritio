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
import {
  initRedisL2,
  l2Set,
  l2Get,
  l2Delete,
  l2DeletePrefix,
  l2Clear,
} from './redis-l2'

// Default configuration
// 2000 entries: session cache entries now live here too (previously separate
// 10k Maps in the auth middlewares); most entries are small config objects
const DEFAULT_MAX_SIZE = 2000
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
   * Get a value from cache (in-process L1 only — stays synchronous)
   * Returns null if not found or expired (backward compatible)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    return entry !== undefined ? (entry.value as T) : null
  }

  /**
   * Get a value from L1, falling back to Redis (L2). L2 hits hydrate L1 with
   * the remaining TTL. Opt-in per call site: hot paths that must survive
   * restarts and be shared across instances (e.g. precomputed analytics).
   */
  async getTiered<T>(key: string): Promise<T | null> {
    const local = this.get<T>(key)
    if (local !== null) return local

    const remote = await l2Get<T>(key)
    if (remote === null) return null

    this.cache.set(key, { value: remote.value }, {
      ttl: remote.ttlMs > 0 ? remote.ttlMs : this.defaultTTL,
    })
    return remote.value
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds).
   * Mirrored to Redis fire-and-forget so other instances can read it via
   * getTiered; L1 write is the guarantee.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL
    this.cache.set(key, { value: data }, { ttl })
    l2Set(key, data, ttl)
  }

  /**
   * Delete a specific key from cache (all instances + Redis)
   */
  delete(key: string): void {
    this.cache.delete(key)
    l2Delete(key)
  }

  /** L1-only delete, used when reacting to a broadcast from another instance */
  localDelete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all keys matching a pattern (prefix-based, all instances + Redis)
   */
  deletePattern(prefix: string): void {
    this.localDeletePattern(prefix)
    l2DeletePrefix(prefix)
  }

  /** L1-only pattern delete, used when reacting to a broadcast */
  localDeletePattern(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries (all instances + Redis)
   */
  clear(): void {
    this.cache.clear()
    l2Clear()
  }

  /** L1-only clear, used when reacting to a broadcast */
  localClear(): void {
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

// Cross-instance invalidation: when another instance deletes a key, drop the
// local L1 copy. No-op when Redis isn't configured (e.g. Next.js on Vercel).
initRedisL2((msg) => {
  if (msg.type === 'key' && msg.value) {
    cache.localDelete(msg.value)
  } else if (msg.type === 'prefix' && msg.value) {
    cache.localDeletePattern(msg.value)
  } else if (msg.type === 'clear') {
    cache.localClear()
  }
})

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

  // Participant-facing study payload, keyed by share code or url slug
  participateStudy: (shareCodeOrSlug: string) => `participate:${shareCodeOrSlug}`,

  // Project data
  project: (projectId: string) => `project:${projectId}`,
  projectsByUser: (userId: string) => `projects:${userId}`,

  // Organization data
  memberCount: (organizationId: string) => `member-count:${organizationId}`,
  orgPlan: (organizationId: string) => `org-plan:${organizationId}`,

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
  participate: 30 * 1000, // 30 seconds - participant study config (bounds staleness after edits)
  short: 60 * 1000, // 60 seconds (was 30s) - for frequently changing data
  medium: 2 * 60 * 1000, // 2 minutes (was 1 min) - default
  long: 10 * 60 * 1000, // 10 minutes (was 5 min) - for stable data
  veryLong: 30 * 60 * 1000, // 30 minutes (was 15 min) - for rarely changing data
  results: 15 * 60 * 1000, // 15 minutes (was 10 min) - for pre-computed analytics (active studies)
  resultsCompleted: 24 * 60 * 60 * 1000, // 24 hours - for completed studies (never change)
}
