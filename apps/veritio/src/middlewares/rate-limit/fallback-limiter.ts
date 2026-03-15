/**
 * In-memory fallback rate limiter.
 * Used when Redis is unavailable for graceful degradation.
 */

import { LRUCache } from 'lru-cache'

interface RateLimitEntry {
  count: number
  resetAt: number
}

export class RateLimitExceeded extends Error {
  constructor(
    public readonly msBeforeNext: number,
    public readonly limit: number
  ) {
    super('Rate limit exceeded')
    this.name = 'RateLimitExceeded'
  }
}

export interface FallbackRateLimitResult {
  remaining: number
  msBeforeNext: number
  limit: number
}

/**
 * In-memory rate limiter using LRU cache.
 * Provides basic rate limiting when Redis is unavailable.
 */
export class FallbackLimiter {
  private cache: LRUCache<string, RateLimitEntry>

  constructor() {
    this.cache = new LRUCache<string, RateLimitEntry>({
      max: 10000, // Store up to 10k unique keys
      ttl: 60 * 1000, // 1 minute TTL
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    })
  }

  /**
   * Consume points for a given key.
   * Throws RateLimitExceeded if limit is exceeded.
   */
  async consume(
    key: string,
    points: number,
    limit: number,
    duration: number // in seconds
  ): Promise<FallbackRateLimitResult> {
    const now = Date.now()
    const durationMs = duration * 1000
    const entry = this.cache.get(key)

    // No entry or expired - create new
    if (!entry || entry.resetAt < now) {
      this.cache.set(key, {
        count: points,
        resetAt: now + durationMs,
      })

      return {
        remaining: limit - points,
        msBeforeNext: durationMs,
        limit,
      }
    }

    // Check if we would exceed the limit
    if (entry.count + points > limit) {
      const msBeforeNext = entry.resetAt - now
      throw new RateLimitExceeded(msBeforeNext, limit)
    }

    // Consume points
    entry.count += points
    this.cache.set(key, entry)

    return {
      remaining: limit - entry.count,
      msBeforeNext: entry.resetAt - now,
      limit,
    }
  }

  /**
   * Get current state for a key without consuming points.
   */
  async get(key: string, limit: number): Promise<FallbackRateLimitResult | null> {
    const entry = this.cache.get(key)
    const now = Date.now()

    if (!entry || entry.resetAt < now) {
      return null
    }

    return {
      remaining: limit - entry.count,
      msBeforeNext: entry.resetAt - now,
      limit,
    }
  }

  /**
   * Clear all rate limit entries.
   * Useful for testing or emergency reset.
   */
  clear(): void {
    this.cache.clear()
  }
}
