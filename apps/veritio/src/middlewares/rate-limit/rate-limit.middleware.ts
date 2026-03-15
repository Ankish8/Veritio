/**
 * Rate limiting middleware for Motia API endpoints.
 * Uses Redis for distributed rate limiting with in-memory fallback.
 */

import { RateLimiterRes } from 'rate-limiter-flexible'
import { consumeRateLimit } from './rate-limiter'
import { generateKey, detectTier, addJitter } from './utils'
import type { RateLimitOptions, RateLimitTier } from './types'

/**
 * Create rate limiting middleware.
 *
 * @param options - Optional configuration for tier and points
 *
 * @example
 * // Use default tier detection
 * middleware: [rateLimitMiddleware(), authMiddleware]
 *
 * @example
 * // Specify heavy operation tier
 * middleware: [rateLimitMiddleware({ tier: 'authenticated-heavy' }), ...]
 */
export function rateLimitMiddleware(options?: RateLimitOptions) {
  return async function rateLimitMiddlewareHandler(
    req: any,
    ctx: any,
    next: () => Promise<any>
  ) {
    const tier: RateLimitTier = options?.tier || detectTier(req)
    const points = options?.points || 1
    const key = generateKey(req, tier)

    try {
      // Consume points from rate limiter
      const result = await consumeRateLimit(tier, key, points)

      // Add rate limit headers to context for handler to include in response
      if (!ctx.rateLimitHeaders) {
        ctx.rateLimitHeaders = {}
      }

      Object.assign(ctx.rateLimitHeaders, {
        'X-RateLimit-Limit': String(result.consumedPoints + result.remainingPoints),
        'X-RateLimit-Remaining': String(result.remainingPoints),
        'X-RateLimit-Reset': new Date(
          Date.now() + result.msBeforeNext
        ).toISOString(),
      })

      // Continue to next middleware/handler
      return next()
    } catch (rejRes) {
      // Rate limit exceeded (from rate-limiter-flexible)
      if (rejRes instanceof RateLimiterRes) {
        const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000)
        const jitteredRetry = addJitter(retryAfter, 5)

        ctx.logger?.warn('Rate limit exceeded', {
          key,
          tier,
          retryAfter: jitteredRetry,
          path: req.path,
          method: req.method,
        })

        return {
          status: 429,
          headers: {
            'Retry-After': String(jitteredRetry),
            'X-RateLimit-Limit': String(rejRes.consumedPoints + rejRes.remainingPoints),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + rejRes.msBeforeNext
            ).toISOString(),
          },
          body: {
            error: 'Too many requests',
            retryAfter: jitteredRetry,
            message: `Rate limit exceeded. Please retry after ${jitteredRetry} seconds.`,
          },
        }
      }

      // Check for custom fallback limiter error
      if (
        rejRes instanceof Error &&
        rejRes.name === 'RateLimitExceeded' &&
        'msBeforeNext' in rejRes
      ) {
        const retryAfter = Math.ceil((rejRes as any).msBeforeNext / 1000)
        const jitteredRetry = addJitter(retryAfter, 5)

        ctx.logger?.warn('Rate limit exceeded (fallback)', {
          key,
          tier,
          retryAfter: jitteredRetry,
        })

        return {
          status: 429,
          headers: {
            'Retry-After': String(jitteredRetry),
          },
          body: {
            error: 'Too many requests',
            retryAfter: jitteredRetry,
            message: `Rate limit exceeded. Please retry after ${jitteredRetry} seconds.`,
          },
        }
      }

      // Redis or other error - gracefully degrade (don't block request)
      ctx.logger?.error('Rate limiter error, allowing request', {
        error: rejRes instanceof Error ? rejRes.message : String(rejRes),
        key,
        tier,
      })

      // Continue without rate limiting on error
      return next()
    }
  }
}
