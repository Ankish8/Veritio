import { ApiMiddleware } from 'motia'
import { validateRenderToken } from '../src/services/pdf/render-token'

/**
 * Authentication middleware for Motia API Steps.
 * Verifies Better Auth session token from the Authorization header.
 * Also supports X-PDF-Render-Token for Puppeteer PDF rendering.
 * Sets x-user-id header for downstream handlers.
 *
 * Flow:
 * 1. Check for X-PDF-Render-Token (for PDF rendering)
 * 2. Or extract Bearer token from Authorization header
 * 3. Verify session/token
 * 4. Extract user ID and attach to x-user-id header
 */

// Better Auth base URL for session verification
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'

// Cache for session verification to reduce API calls
const sessionCache = new Map<string, { userId: string; expiresAt: number }>()
const CACHE_TTL = 60 * 1000 // 1 minute cache

export const authMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const authStartTime = Date.now()
  const { logger } = ctx

  // Check for PDF render token first (used by Puppeteer for PDF generation)
  const pdfRenderToken = req.headers['x-pdf-render-token'] as string | undefined
  if (pdfRenderToken) {
    try {
      const tokenData = await validateRenderToken(pdfRenderToken)
      if (tokenData) {
        req.headers['x-user-id'] = tokenData.userId
        return await next()
      }
    } catch (error) {
      logger.warn('PDF render token validation failed', { error })
    }
    return {
      status: 401,
      body: { error: 'Invalid PDF render token' },
    }
  }

  const authHeader = req.headers['authorization'] as string | undefined

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header')
    return {
      status: 401,
      body: { error: 'Authorization header required' },
    }
  }

  const token = authHeader.substring(7)

  try {
    // Check cache first
    const cached = sessionCache.get(token)
    if (cached && cached.expiresAt > Date.now()) {
      req.headers['x-user-id'] = cached.userId
      return await next()
    }

    // Verify session with Better Auth API
    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      logger.warn('Session verification failed', { status: response.status })
      return {
        status: 401,
        body: { error: 'Invalid session' },
      }
    }

    const session = await response.json()
    const authTime = Date.now() - authStartTime

    if (!session?.user?.id) {
      logger.warn('Invalid session payload')
      return {
        status: 401,
        body: { error: 'Invalid session' },
      }
    }

    // Cache the session
    sessionCache.set(token, {
      userId: session.user.id,
      expiresAt: Date.now() + CACHE_TTL,
    })

    // Clean up old cache entries periodically
    if (sessionCache.size > 1000) {
      const now = Date.now()
      for (const [key, value] of sessionCache.entries()) {
        if (value.expiresAt < now) {
          sessionCache.delete(key)
        }
      }
    }

    // Attach userId to headers for downstream handlers
    req.headers['x-user-id'] = session.user.id

    // Log auth timing (only if slow)
    if (authTime > 100) {
      logger.warn('Slow auth verification', { authTime })
    }

    return await next()
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Authentication failed', { error: errorMessage })
    return {
      status: 401,
      body: { error: 'Authentication failed' },
    }
  }
}
