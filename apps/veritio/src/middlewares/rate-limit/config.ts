/**
 * Rate limit configurations by tier.
 * Early stage limits - generous to support growth.
 */

import type { RateLimitTier, RateLimitConfig } from './types'

export const RATE_LIMIT_CONFIG: Record<RateLimitTier, RateLimitConfig> = {
  // Authenticated users - read operations
  'authenticated-read': {
    points: 300, // 300 requests per minute
    duration: 60,
    blockDuration: 60, // 1 minute block
  },

  // Authenticated users - mutations (create, update, delete)
  'authenticated-mutation': {
    points: 60, // 60 requests per minute
    duration: 60,
    blockDuration: 120, // 2 minute block
  },

  // Authenticated users - heavy operations (PDF, analysis, transcription)
  'authenticated-heavy': {
    points: 10, // 10 requests per minute
    duration: 60,
    blockDuration: 300, // 5 minute block
  },

  // Participants - read operations (fetching study data)
  'participant-read': {
    points: 120, // 120 requests per minute
    duration: 60,
    blockDuration: 60,
  },

  // Participants - mutations (submitting responses)
  'participant-mutation': {
    points: 30, // 30 requests per minute
    duration: 60,
    blockDuration: 120,
  },

  // Public endpoints - read operations (get study by share code)
  'public-read': {
    points: 60, // 60 requests per minute per IP
    duration: 60,
    blockDuration: 60,
  },

  // Public endpoints - mutations (create participant)
  'public-mutation': {
    points: 20, // 20 requests per minute per IP
    duration: 60,
    blockDuration: 120,
  },

  // Global limit - overall cap per IP regardless of auth status
  'global': {
    points: 600, // 600 requests per minute per IP
    duration: 60,
    blockDuration: 60,
  },
}
