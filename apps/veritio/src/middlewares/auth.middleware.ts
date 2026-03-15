/**
 * Authentication middleware for Motia API endpoints.
 * Verifies Better Auth session tokens against the database and extracts user ID.
 * Also supports X-PDF-Render-Token for Puppeteer PDF rendering.
 */

import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import { validateRenderToken } from '../services/pdf/render-token'

// Cache for verified sessions (5 minute TTL)
const sessionCache = new Map<string, { userId: string; expiresAt: number }>()
const SESSION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const SESSION_CACHE_MAX_SIZE = 10000

/**
 * Verifies a session token against the database and returns the user ID.
 * Uses caching to reduce database queries for repeated requests.
 */
async function verifySessionToken(token: string): Promise<string | null> {
  // Check cache first
  const cached = sessionCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId
  }

  // Query the session table
  const supabase = getMotiaSupabaseClient()
  const { data: session, error } = await supabase
    .from('session')
    .select('userId, expiresAt')
    .eq('token', token)
    .single()

  if (error || !session) {
    return null
  }

  // Check if session is expired
  const expiresAt = new Date(session.expiresAt).getTime()
  if (expiresAt < Date.now()) {
    return null
  }

  // Evict oldest entries if cache exceeds max size
  if (sessionCache.size >= SESSION_CACHE_MAX_SIZE) {
    sessionCache.clear()
  }

  // Cache the result
  sessionCache.set(token, {
    userId: session.userId,
    expiresAt: Math.min(expiresAt, Date.now() + SESSION_CACHE_TTL),
  })

  return session.userId
}

/**
 * Cleans up expired entries from the session cache.
 * Called periodically to prevent memory leaks.
 */
function cleanupSessionCache() {
  const now = Date.now()
  for (const [token, entry] of sessionCache.entries()) {
    if (entry.expiresAt < now) {
      sessionCache.delete(token)
    }
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanupSessionCache, 5 * 60 * 1000)

export async function authMiddleware(req: any, ctx: any, next: () => Promise<any>) {
  // Get the Authorization header (Better Auth sends Bearer tokens)
  const authHeader = req.headers['authorization'] || req.headers['Authorization']

  // Always clear any client-supplied x-user-id to prevent auth bypass
  delete req.headers['x-user-id']

  // Check for PDF render token (used by Puppeteer for PDF generation)
  const pdfRenderToken = req.headers['x-pdf-render-token']
  if (pdfRenderToken) {
    try {
      const tokenData = await validateRenderToken(pdfRenderToken)
      if (tokenData) {
        req.headers['x-user-id'] = tokenData.userId
        return next()
      }
    } catch (error) {
      ctx.logger?.warn('PDF render token validation failed', { error: String(error) })
    }
    return {
      status: 401,
      body: { error: 'Invalid PDF render token' },
    }
  }

  // If we have a Bearer token, verify it against the database
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '').trim()

      if (!token) {
        ctx.logger?.warn('Empty auth token')
        return {
          status: 401,
          body: { error: 'Invalid authorization token' },
        }
      }

      const verifiedUserId = await verifySessionToken(token)

      if (verifiedUserId) {
        req.headers['x-user-id'] = verifiedUserId
        // Continue to next middleware/handler
        return next()
      } else {
        ctx.logger?.warn('Session verification failed', { tokenLength: token.length })
        return {
          status: 401,
          body: { error: 'Invalid or expired session' },
        }
      }
    } catch (e) {
      ctx.logger?.error('Failed to verify auth token', { error: String(e) })
      return {
        status: 500,
        body: { error: 'Authentication error' },
      }
    }
  }

  // No valid authorization found
  return {
    status: 401,
    body: { error: 'Authorization header required' },
  }
}
