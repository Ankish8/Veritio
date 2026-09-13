/**
 * Rate limiter factory.
 * Creates Redis-backed or in-memory rate limiters based on availability.
 */

import { createHash } from 'node:crypto'
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible'
import type Redis from 'ioredis'
import { getRedisClient, isRedisConnected } from '../../lib/redis/client'
import { RATE_LIMIT_CONFIG } from './config'
import { FallbackLimiter } from './fallback-limiter'
import type { RateLimitTier } from './types'

// Cache of created rate limiters
const rateLimiters = new Map<RateLimitTier, RateLimiterRedis | RateLimiterMemory>()
const fallbackLimiter = new FallbackLimiter()

/**
 * Get or create a rate limiter for a specific tier.
 * Prefers Redis, falls back to in-memory if Redis is unavailable.
 */
export function getRateLimiter(tier: RateLimitTier): RateLimiterRedis | RateLimiterMemory {
  // Return cached limiter if exists
  if (rateLimiters.has(tier)) {
    return rateLimiters.get(tier)!
  }

  const config = RATE_LIMIT_CONFIG[tier]
  let redisClient: Redis | null = null

  // Try to get Redis client
  try {
    redisClient = getRedisClient()
    if (!isRedisConnected()) {
      redisClient.connect().catch(() => {
        // Connection failed, will use fallback
      })
    }
  } catch {
    // Redis not available, will use in-memory
  }

  let limiter: RateLimiterRedis | RateLimiterMemory

  if (redisClient) {
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `ratelimit:${tier}`,
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration || 0,
      inMemoryBlockOnConsumed: config.points, // Block in memory if Redis fails
      insuranceLimiter: new RateLimiterMemory({
        points: config.points,
        duration: config.duration,
      }),
    })
  } else {
    // Fallback to in-memory limiter
    limiter = new RateLimiterMemory({
      keyPrefix: tier,
      points: config.points,
      duration: config.duration,
    })
  }

  rateLimiters.set(tier, limiter)
  return limiter
}

/**
 * Consume points using the appropriate rate limiter.
 * Handles Redis failures gracefully by falling back to in-memory.
 */
export async function consumeRateLimit(
  tier: RateLimitTier,
  key: string,
  points: number = 1
): Promise<RateLimiterRes> {
  const limiter = getRateLimiter(tier)

  try {
    return await limiter.consume(key, points)
  } catch (error) {
    // If Redis rate limiter fails, use fallback
    if (error instanceof Error && error.message.includes('Redis')) {
      const config = RATE_LIMIT_CONFIG[tier]
      try {
        const result = await fallbackLimiter.consume(key, points, config.points, config.duration)
        // Convert to RateLimiterRes format
        return {
          msBeforeNext: result.msBeforeNext,
          remainingPoints: result.remaining,
          consumedPoints: points,
          isFirstInDuration: false,
        } as RateLimiterRes
      } catch (fallbackError) {
        // Re-throw fallback errors (middleware will handle them)
        throw fallbackError
      }
    }
    throw error
  }
}

export interface DistributedRateLimitCheck {
  tier: RateLimitTier
  /** Raw identifier. It is hashed before it is used as a Redis key. */
  identifier: string
  points?: number
}

export type DistributedRateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

function retryAfterFromRejection(error: unknown): number | null {
  if (
    error &&
    typeof error === 'object' &&
    'msBeforeNext' in error &&
    typeof (error as { msBeforeNext?: unknown }).msBeforeNext === 'number'
  ) {
    return Math.max(1, Math.ceil((error as { msBeforeNext: number }).msBeforeNext / 1000))
  }
  return null
}

/**
 * Consume several distributed budgets for one operation. This is transport
 * agnostic so Next route handlers/server actions and iii steps share the same
 * enforcement path.
 *
 * Infrastructure failures fail closed. An unavailable limiter must not turn a
 * password or paid-provider endpoint into an unbounded public operation.
 */
export async function consumeDistributedRateLimits(
  checks: DistributedRateLimitCheck[]
): Promise<DistributedRateLimitDecision> {
  for (const check of checks) {
    const key = createHash('sha256').update(check.identifier).digest('base64url')
    try {
      await consumeRateLimit(check.tier, key, check.points ?? 1)
    } catch (error) {
      const retryAfterSeconds = retryAfterFromRejection(error)
      if (retryAfterSeconds !== null) {
        return { allowed: false, retryAfterSeconds }
      }

      console.error('[rate-limit] Distributed limiter unavailable; denying protected operation', {
        tier: check.tier,
      })
      return { allowed: false, retryAfterSeconds: 60 }
    }
  }

  return { allowed: true }
}

/**
 * Give points back to a key (e.g. when the action a point was consumed for
 * ultimately failed). Best-effort: rewarding is never allowed to throw into the
 * caller, since a rate-limiter hiccup must not mask the original outcome.
 */
export async function rewardRateLimit(
  tier: RateLimitTier,
  key: string,
  points: number = 1
): Promise<void> {
  try {
    await getRateLimiter(tier).reward(key, points)
  } catch {
    // Ignore: the point simply stays consumed.
  }
}

/**
 * Clear all rate limiters (useful for testing).
 */
export function clearAllRateLimiters(): void {
  rateLimiters.clear()
  fallbackLimiter.clear()
}
