/**
 * Simple in-memory cache with TTL support.
 * Used to cache frequently accessed data to reduce DB round-trips.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly defaultTTL = 60 * 1000 // 60 seconds default
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }
  delete(key: string): void {
    this.cache.delete(key)
  }
  deletePattern(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }
  clear(): void {
    this.cache.clear()
  }
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
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
export const cacheTTL = {
  short: 30 * 1000,      // 30 seconds - for frequently changing data
  medium: 60 * 1000,     // 1 minute - default
  long: 5 * 60 * 1000,   // 5 minutes - for stable data
  veryLong: 15 * 60 * 1000, // 15 minutes - for rarely changing data
  results: 10 * 60 * 1000, // 10 minutes - for pre-computed analytics (active studies)
  resultsCompleted: 24 * 60 * 60 * 1000, // 24 hours - for completed studies (never change)
}
