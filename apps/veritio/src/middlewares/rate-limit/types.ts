/**
 * TypeScript types for rate limiting middleware
 */

export type RateLimitTier =
  | 'authenticated-read'
  | 'authenticated-mutation'
  | 'authenticated-heavy'
  | 'participant-read'
  | 'participant-mutation'
  | 'public-read'
  | 'public-mutation'
  | 'global'

export interface RateLimitConfig {
  points: number // Number of requests allowed
  duration: number // Time window in seconds
  blockDuration?: number // Block duration in seconds when exceeded
}

export interface RateLimitOptions {
  tier?: RateLimitTier
  points?: number // Cost per request (default: 1)
  blockDuration?: number
}

export interface RateLimitResult {
  consumed: number
  remaining: number
  msBeforeNext: number
  limit: number
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}
