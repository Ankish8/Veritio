/**
 * Session authentication middleware for participant API endpoints.
 * Verifies participant session tokens (X-Session-Token header).
 */

import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'

// Cache for verified participant sessions (15 minute TTL)
const participantSessionCache = new Map<string, { participantId: string; expiresAt: number }>()
const PARTICIPANT_SESSION_CACHE_TTL = 15 * 60 * 1000 // 15 minutes
const PARTICIPANT_SESSION_CACHE_MAX_SIZE = 10000

/**
 * Verifies a participant session token against the database.
 * Returns participant ID if valid, null otherwise.
 */
async function verifyParticipantSessionToken(token: string): Promise<string | null> {
  // Check cache first
  const cached = participantSessionCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
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

  // Evict oldest entries if cache exceeds max size
  if (participantSessionCache.size >= PARTICIPANT_SESSION_CACHE_MAX_SIZE) {
    participantSessionCache.clear()
  }

  // Cache the result (expire after 15 minutes)
  participantSessionCache.set(token, {
    participantId: participant.id,
    expiresAt: Date.now() + PARTICIPANT_SESSION_CACHE_TTL,
  })

  return participant.id
}

/**
 * Cleans up expired entries from the participant session cache.
 */
function cleanupParticipantSessionCache() {
  const now = Date.now()
  for (const [token, entry] of participantSessionCache.entries()) {
    if (entry.expiresAt < now) {
      participantSessionCache.delete(token)
    }
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanupParticipantSessionCache, 5 * 60 * 1000)

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
