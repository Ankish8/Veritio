import type { ApiMiddleware } from '@/lib/motia/types'
import { getMotiaSupabaseClient } from '../src/lib/supabase/motia-client'
import { validateRenderToken } from '../src/services/pdf/render-token'

const sessionCache = new Map<string, { userId: string; expiresAt: number }>()
const SESSION_CACHE_TTL = 30 * 1000
const SESSION_CACHE_MAX_SIZE = 10000

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

function normalizeSessionToken(rawToken: string): string {
  const decoded = decodeCookieValue(rawToken.trim())
  return decoded.includes('.') ? decoded.split('.')[0] : decoded
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

    const token = normalizeSessionToken(pair.slice(separatorIndex + 1))
    return token || null
  }

  return null
}

function readSessionToken(req: Parameters<ApiMiddleware>[0]): {
  token: string | null
  source: 'authorization' | 'cookie' | null
} {
  const authHeader = readHeader(req.headers as Record<string, unknown>, 'authorization')
  if (authHeader) {
    return {
      token: normalizeSessionToken(authHeader.replace(/^Bearer\s+/i, '')),
      source: 'authorization',
    }
  }

  return {
    token: readSessionTokenFromCookie(readHeader(req.headers as Record<string, unknown>, 'cookie')),
    source: 'cookie',
  }
}

async function verifySessionToken(token: string): Promise<string | null> {
  const cached = sessionCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.userId
  }

  const supabase = getMotiaSupabaseClient()
  const { data: session, error } = await supabase
    .from('session')
    .select('userId, expiresAt')
    .eq('token', token)
    .single()

  if (error || !session) {
    return null
  }

  const expiresAt = new Date(session.expiresAt).getTime()
  if (expiresAt < Date.now()) {
    return null
  }

  if (sessionCache.size >= SESSION_CACHE_MAX_SIZE) {
    sessionCache.clear()
  }

  sessionCache.set(token, {
    userId: session.userId,
    expiresAt: Math.min(expiresAt, Date.now() + SESSION_CACHE_TTL),
  })

  return session.userId
}

export const authMiddleware: ApiMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  delete req.headers['x-user-id']

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

  const { token, source } = readSessionToken(req)
  if (!token) {
    logger.warn('Missing session token')
    return {
      status: 401,
      body: { error: 'Authorization header or session cookie required' },
    }
  }

  try {
    const verifiedUserId = await verifySessionToken(token)
    if (!verifiedUserId) {
      logger.warn('Session verification failed', { tokenLength: token.length, source })
      return {
        status: 401,
        body: { error: 'Invalid or expired session' },
      }
    }

    req.headers['x-user-id'] = verifiedUserId
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
