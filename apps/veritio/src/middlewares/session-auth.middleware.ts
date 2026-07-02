/**
 * Session authentication middleware for participant API endpoints.
 * Verifies participant session tokens (X-Session-Token header).
 */

import { createHash } from 'crypto'
import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import { cache } from '../lib/cache/memory-cache'

// Cache for verified participant sessions (15 minute TTL)
const PARTICIPANT_SESSION_CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Tokens are hashed so raw session tokens never appear as cache/Redis keys
function participantCacheKey(token: string): string {
  return `auth:part:${createHash('sha256').update(token).digest('hex')}`
}

/**
 * Verifies a participant session token against the database.
 * Returns participant ID if valid, null otherwise.
 */
async function verifyParticipantSessionToken(token: string): Promise<string | null> {
  // Check cache first (L1 + Redis; TTL semantics unchanged from the old Map)
  const key = participantCacheKey(token)
  const cached = await cache.getTiered<{ participantId: string }>(key)
  if (cached) {
    return cached.participantId
  }

  // Query the participants table
  const supabase = getMotiaSupabaseClient()
  const { data: participant, error } = await supabase
    .from('participants')
    .select('id, session_token, started_at')
    .eq('session_token', token)
    .single()

  if (error || !participant || participant.session_token !== token) {
    return null
  }

  cache.set(key, { participantId: participant.id }, PARTICIPANT_SESSION_CACHE_TTL)

  return participant.id
}

/**
 * Middleware that verifies participant session tokens.
 * Expects X-Session-Token header with participant session token.
 * Sets x-participant-id header if valid.
 */
export async function sessionAuthMiddleware(req: any, ctx: any, next: () => Promise<any>) {
  const sessionToken = req.headers['x-session-token']

  // Always clear any client-supplied x-participant-id to prevent auth bypass
  delete req.headers['x-participant-id']

  // Verify session token
  if (sessionToken) {
    try {
      const verifiedParticipantId = await verifyParticipantSessionToken(sessionToken)

      if (verifiedParticipantId) {
        req.headers['x-participant-id'] = verifiedParticipantId
        return next()
      } else {
        ctx.logger?.warn('Participant session verification failed')
        return {
          status: 401,
          body: { error: 'Invalid or expired session' },
        }
      }
    } catch (e) {
      ctx.logger?.error('Failed to verify participant session token', { error: String(e) })
      return {
        status: 500,
        body: { error: 'Authentication error' },
      }
    }
  }

  // No valid session token
  return {
    status: 401,
    body: { error: 'Session token required' },
  }
}
