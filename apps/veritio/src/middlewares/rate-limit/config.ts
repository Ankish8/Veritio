/**
 * Rate limit configurations by tier.
 * Early stage limits - generous to support growth.
 */

import type { RateLimitTier, RateLimitConfig } from './types'

export const RATE_LIMIT_CONFIG: Record<RateLimitTier, RateLimitConfig> = {
  // Public REST API (/api/v1), keyed per credential rather than per IP so one
  // noisy integration cannot exhaust a whole office's shared address.
  'api-read': {
    points: 600, // 600 requests per minute
    duration: 60,
    blockDuration: 0, // capacity frees up as the window rolls; no punitive block
  },

  'api-write': {
    points: 120, // 120 requests per minute
    duration: 60,
    blockDuration: 0,
  },

  // Exports, insight reports, full results reads: expensive server-side and
  // rarely wanted in bulk.
  'api-heavy': {
    points: 20, // 20 requests per minute
    duration: 60,
    blockDuration: 0,
  },

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

  // Password-protected public results: keep the IP budget tight to slow a
  // single attacker, while the token budget stops distributed guessing.
  'public-results-password-ip': {
    points: 10,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  },

  'public-results-password-token': {
    points: 25,
    duration: 15 * 60,
    blockDuration: 15 * 60,
  },

  // AI follow-up quotas use one point per estimated 100 model tokens. They are
  // consumed only when a request reaches the paid provider.
  'ai-followup-participant': {
    points: 120,
    duration: 60 * 60,
    blockDuration: 60 * 60,
  },

  'ai-followup-study': {
    points: 3000,
    duration: 60 * 60,
    blockDuration: 15 * 60,
  },

  'ai-followup-organization': {
    points: 12000,
    duration: 60 * 60,
    blockDuration: 15 * 60,
  },

  // Global limit - overall cap per IP regardless of auth status
  'global': {
    points: 600, // 600 requests per minute per IP
    duration: 60,
    blockDuration: 60,
  },

  // Outbound notification email - per-study cap to avoid inbox spam / provider abuse
  'email': {
    points: 10, // 10 emails per hour per study
    duration: 3600,
    blockDuration: 0, // no extra block: capacity frees up as the window rolls
  },
}
