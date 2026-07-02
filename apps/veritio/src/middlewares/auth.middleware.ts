/**
 * Authentication middleware for Motia API endpoints.
 * Verifies Better Auth session tokens against the database and extracts user ID.
 * Also supports X-PDF-Render-Token for Puppeteer PDF rendering.
 */

import { createHash } from 'crypto'
import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import { validateRenderToken } from '../services/pdf/render-token'
import { cache } from '../lib/cache/memory-cache'

// Short TTL to minimize window where revoked sessions remain valid.
// Trade-off: more frequent auth verification requests to Better Auth.
const SESSION_CACHE_TTL = 30 * 1000 // 30 seconds

// Tokens are hashed so raw session tokens never appear as cache/Redis keys
function sessionCacheKey(token: string): string {
  return `auth:sess:${createHash('sha256').update(token).digest('hex')}`
}

function readHeader(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return typeof value === 'string' ? value : undefined
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readSessionTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null

  for (const pair of cookieHeader.split(';')) {
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex === -1) continue

    const name = pair.slice(0, separatorIndex).trim()
    if (name !== 'better-auth.session_token' && name !== '__Secure-better-auth.session_token') {
      continue
    }

    const rawValue = decodeCookieValue(pair.slice(separatorIndex + 1).trim())
    if (!rawValue) return null

    return rawValue.includes('.') ? rawValue.split('.')[0] : rawValue
  }

  return null
}

function normalizeSessionToken(rawToken: string): string {
  const decoded = decodeCookieValue(rawToken.trim())
  return decoded.includes('.') ? decoded.split('.')[0] : decoded
}

function readSessionToken(req: any): { token: string | null; source: 'authorization' | 'cookie' | null } {
  const authHeader = readHeader(req.headers, 'authorization')
  if (authHeader) {
    return {
      token: normalizeSessionToken(authHeader.replace(/^Bearer\s+/i, '')),
      source: 'authorization',
    }
  }

  return {
    token: readSessionTokenFromCookie(readHeader(req.headers, 'cookie')),
    source: 'cookie',
  }
}

/**
 * Verifies a session token against the database and returns the user ID.
 * Uses caching to reduce database queries for repeated requests.
 */
async function verifySessionToken(token: string): Promise<string | null> {
  // Check cache first (L1 + Redis, so verification survives deploys and is
  // shared across instances — TTL semantics unchanged from the old Map)
  const key = sessionCacheKey(token)
  const cached = await cache.getTiered<{ userId: string }>(key)
  if (cached) {
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

  // Cache entry never outlives the session itself
  cache.set(key, { userId: session.userId }, Math.min(SESSION_CACHE_TTL, expiresAt - Date.now()))

  return session.userId
}

export async function authMiddleware(req: any, ctx: any, next: () => Promise<any>) {
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

  const { token, source } = readSessionToken(req)

  // If we have a session token, verify it against the database
  if (token) {
    try {
      const verifiedUserId = await verifySessionToken(token)

      if (verifiedUserId) {
        req.headers['x-user-id'] = verifiedUserId
        // Continue to next middleware/handler
        return next()
      } else {
        ctx.logger?.warn('Session verification failed', { tokenLength: token.length, source })
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
    body: { error: 'Authorization header or session cookie required' },
  }
}
