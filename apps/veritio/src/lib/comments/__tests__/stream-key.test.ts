/**
 * Tests for the comment change-signal capability key.
 *
 * This key is load-bearing security, not a convenience: the iii stream layer
 * cannot authorize a subscription (onJoin's veto is advisory on 0.22.x and the
 * RBAC listener admits anonymous connections), so the ONLY thing standing
 * between an anonymous client and a study's comment activity signal is that it
 * cannot guess the group id.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getCommentStreamKey, COMMENT_STREAM_NAME } from '../stream-key'

const STUDY_A = '3f5b2c10-0000-4000-8000-abcdef123456'
const STUDY_B = '3f5b2c10-0000-4000-8000-abcdef123457'

const ENV_KEYS = ['STREAM_TOKEN_SECRET', 'BETTER_AUTH_SECRET', 'AUTH_SECRET'] as const
let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
  for (const k of ENV_KEYS) delete process.env[k]
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]!
  }
})

describe('getCommentStreamKey', () => {
  it('is deterministic for a study, so subscriptions survive reconnects', () => {
    process.env.STREAM_TOKEN_SECRET = 'test-secret'
    expect(getCommentStreamKey(STUDY_A)).toBe(getCommentStreamKey(STUDY_A))
  })

  it('never returns the raw study id, or anything containing it', () => {
    process.env.STREAM_TOKEN_SECRET = 'test-secret'
    const key = getCommentStreamKey(STUDY_A)!

    expect(key).not.toBe(STUDY_A)
    expect(key).not.toContain(STUDY_A)
    // Not even a fragment of the UUID should survive into the channel name.
    expect(key).not.toContain('3f5b2c10')
  })

  it('separates studies that differ by a single character', () => {
    process.env.STREAM_TOKEN_SECRET = 'test-secret'
    expect(getCommentStreamKey(STUDY_A)).not.toBe(getCommentStreamKey(STUDY_B))
  })

  it('changes completely when the secret rotates', () => {
    process.env.STREAM_TOKEN_SECRET = 'secret-one'
    const first = getCommentStreamKey(STUDY_A)!
    process.env.STREAM_TOKEN_SECRET = 'secret-two'
    expect(getCommentStreamKey(STUDY_A)).not.toBe(first)
  })

  it('carries enough entropy to be unguessable', () => {
    process.env.STREAM_TOKEN_SECRET = 'test-secret'
    const key = getCommentStreamKey(STUDY_A)!

    // 22 base64url chars ≈ 132 bits, on top of the `sc_` prefix.
    expect(key).toMatch(/^sc_[A-Za-z0-9_-]{22}$/)
  })

  it('falls back to BETTER_AUTH_SECRET, then AUTH_SECRET', () => {
    process.env.BETTER_AUTH_SECRET = 'better-auth'
    expect(getCommentStreamKey(STUDY_A)).not.toBeNull()

    delete process.env.BETTER_AUTH_SECRET
    process.env.AUTH_SECRET = 'auth'
    expect(getCommentStreamKey(STUDY_A)).not.toBeNull()
  })

  it('returns null with no secret, so callers skip publishing rather than use a guessable channel', () => {
    expect(getCommentStreamKey(STUDY_A)).toBeNull()
  })

  it('exports the stream name the publisher and subscriber must agree on', () => {
    expect(COMMENT_STREAM_NAME).toBe('studyComments')
  })
})
