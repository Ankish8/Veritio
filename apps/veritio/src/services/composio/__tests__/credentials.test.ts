import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  describeComposioError,
  isComposioAuthError,
  isComposioAuthRejected,
  noteComposioError,
  resetComposioCredentialState,
} from '../credentials'

/** Shape of the real failure: AuthenticationError: 401 {... APIKey_InvalidAPIKey ...} */
function authError() {
  const err = new Error(
    '401 {"error":{"message":"Invalid API key: ak_**UbOz","code":801,"slug":"APIKey_InvalidAPIKey","status":401}}',
  )
  err.name = 'AuthenticationError'
  return err
}

beforeEach(() => {
  resetComposioCredentialState()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('isComposioAuthError', () => {
  it('recognises the real rejected-key error', () => {
    expect(isComposioAuthError(authError())).toBe(true)
  })

  it('recognises a 401 status on the error object', () => {
    expect(isComposioAuthError({ status: 401 })).toBe(true)
    expect(isComposioAuthError({ statusCode: 401 })).toBe(true)
  })

  it('recognises the message forms', () => {
    expect(isComposioAuthError(new Error('Invalid API key: ak_x'))).toBe(true)
    expect(isComposioAuthError(new Error('APIKey_InvalidAPIKey'))).toBe(true)
  })

  // Narrow on purpose: a per-request or quota failure must not latch the whole
  // integration off, only a rejected key should.
  it('ignores non-auth failures', () => {
    expect(isComposioAuthError(new Error('network timeout'))).toBe(false)
    expect(isComposioAuthError({ status: 403 })).toBe(false)
    expect(isComposioAuthError({ status: 429 })).toBe(false)
    expect(isComposioAuthError({ status: 500 })).toBe(false)
    expect(isComposioAuthError(null)).toBe(false)
    expect(isComposioAuthError(undefined)).toBe(false)
  })
})

describe('noteComposioError', () => {
  it('latches rejection and logs once', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(isComposioAuthRejected()).toBe(false)

    noteComposioError(authError())
    expect(isComposioAuthRejected()).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)

    // Repeated failures must not spam the logs.
    noteComposioError(authError())
    noteComposioError(authError())
    expect(spy).toHaveBeenCalledTimes(1)
    expect(isComposioAuthRejected()).toBe(true)
  })

  it('names the variable so the log is actionable', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    noteComposioError(authError())
    const logged = String(spy.mock.calls[0]?.[0] ?? '')
    expect(logged).toContain('composio.credentials_rejected')
    expect(logged).toContain('COMPOSIO_API_KEY')
  })

  it('does not latch on a transient failure', () => {
    noteComposioError(new Error('socket hang up'))
    expect(isComposioAuthRejected()).toBe(false)
  })
})

describe('describeComposioError', () => {
  it('records the failure as a side effect', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    describeComposioError(authError())
    expect(isComposioAuthRejected()).toBe(true)
  })

  it('returns an actionable message for a rejected key', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(describeComposioError(authError())).toContain('COMPOSIO_API_KEY')
  })

  // Matches the previous toErrorMessage behaviour exactly, so nothing changes
  // for non-auth failures: Error messages pass through, anything else becomes
  // 'Unknown error'.
  it('passes other messages through unchanged', () => {
    expect(describeComposioError(new Error('boom'))).toBe('boom')
    expect(describeComposioError('weird')).toBe('Unknown error')
    expect(describeComposioError(undefined)).toBe('Unknown error')
  })
})
