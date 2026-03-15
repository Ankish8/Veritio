/**
 * Utility functions for rate limiting.
 */

import type { RateLimitTier } from './types'
import crypto from 'crypto'

/**
 * Generate a unique rate limit key based on request and tier.
 */
export function generateKey(req: any, tier: RateLimitTier): string {
  // For authenticated users - use user ID
  const userId = req.headers['x-user-id']
  if (userId && tier.startsWith('authenticated')) {
    return `user:${userId}`
  }

  // For participants - use participant ID or session token hash
  const participantId = req.headers['x-participant-id']
  const sessionToken = req.headers['x-session-token']
  if ((participantId || sessionToken) && tier.startsWith('participant')) {
    if (participantId) {
      return `participant:${participantId}`
    }
    // Hash session token for privacy
    const hash = crypto.createHash('sha256').update(sessionToken).digest('hex').substring(0, 16)
    return `session:${hash}`
  }

  // For public/global - use IP address
  const ip = getClientIP(req)
  return `ip:${ip || 'unknown'}`
}

/**
 * Extract client IP from request headers.
 * Handles proxies and load balancers.
 */
export function getClientIP(req: any): string | null {
  // Check X-Forwarded-For header (from proxies/load balancers)
  const forwardedFor = req.headers?.['x-forwarded-for']
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0]
    return ip?.trim() || null
  }

  // Check X-Real-IP header
  const realIp = req.headers?.['x-real-ip']
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp
  }

  // Fallback to connection remote address (if available)
  return req.connection?.remoteAddress || null
}

/**
 * Detect appropriate rate limit tier based on request.
 */
export function detectTier(req: any): RateLimitTier {
  const method = req.method?.toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'

  // Authenticated user
  if (req.headers['x-user-id']) {
    return isRead ? 'authenticated-read' : 'authenticated-mutation'
  }

  // Participant
  if (req.headers['x-participant-id'] || req.headers['x-session-token']) {
    return isRead ? 'participant-read' : 'participant-mutation'
  }

  // Public
  return isRead ? 'public-read' : 'public-mutation'
}

/**
 * Add random jitter to retry delay to prevent thundering herd.
 */
export function addJitter(baseDelay: number, maxJitter: number = 5): number {
  return baseDelay + Math.floor(Math.random() * maxJitter)
}
