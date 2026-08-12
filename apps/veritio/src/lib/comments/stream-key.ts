import { createHmac } from 'node:crypto'

/**
 * Capability key for a study's comment change-signal stream.
 *
 * WHY THIS EXISTS — verified empirically on iii engine 0.22.x (2026-08-12):
 * a stream's `onJoin` hook returning `{ unauthorized: true }` does NOT veto the
 * subscription. It only logs. And `veritio::stream::auth` admits tokenless
 * connections with an empty context (by design, for assistantChat). So the
 * stream layer offers NO per-group authorization whatsoever: subscribing to
 * `<streamName>:<groupId>` requires only knowing the group id.
 *
 * Using the raw study UUID as the group id would therefore make comment
 * activity readable by any anonymous client that guessed a study id — exactly
 * the leak that 20260812000000_drop_public_comment_broadcast.sql closed.
 *
 * So the group id is an unguessable HMAC of the study id instead, handed out
 * only by the authenticated list-comments endpoint after it has already checked
 * study access. This is the same capability-URL model assistantChat relies on,
 * made explicit.
 *
 * DEFENCE IN DEPTH: the payload published to this channel is deliberately
 * content-free — a bare "something changed at T" tick. Even if a key leaks,
 * it reveals comment *activity timing* and nothing else: no bodies, no author
 * names, no emails. The client re-fetches over the authenticated API.
 *
 * The key is a capability, not a session: it's stable per study (so a
 * subscription survives reconnects) and carries no user identity. Revoking one
 * means rotating STREAM_TOKEN_SECRET, which is acceptable for a change signal
 * that exposes nothing on its own.
 */

const STREAM_NAME = 'studyComments'
const KEY_PREFIX = 'sc'

function getSecret(): string | null {
  return (
    process.env.STREAM_TOKEN_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    null
  )
}

/** The iii stream name comment change signals are published on. */
export const COMMENT_STREAM_NAME = STREAM_NAME

/**
 * Derive the capability group id for a study.
 *
 * Returns null when no secret is configured — callers must then fall back to
 * polling rather than publishing to a guessable channel.
 */
export function getCommentStreamKey(studyId: string): string | null {
  const secret = getSecret()
  if (!secret) return null

  const digest = createHmac('sha256', secret)
    .update(`${KEY_PREFIX}:${studyId}`)
    .digest('base64url')

  // 128 bits of the digest is far beyond guessable and keeps the channel name short.
  return `${KEY_PREFIX}_${digest.slice(0, 22)}`
}
