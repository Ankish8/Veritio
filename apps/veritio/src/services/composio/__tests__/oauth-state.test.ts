import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createComposioOAuthState, verifyComposioOAuthState } from '../oauth-state'

describe('Composio OAuth state', () => {
  let originalStateSecret: string | undefined
  let dateNowSpy: { mockReturnValue: (value: number) => unknown }

  beforeEach(() => {
    originalStateSecret = process.env.COMPOSIO_OAUTH_STATE_SECRET
    process.env.COMPOSIO_OAUTH_STATE_SECRET = 'test-state-secret'
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_782_918_000_000)
  })

  afterEach(() => {
    if (originalStateSecret === undefined) {
      delete process.env.COMPOSIO_OAUTH_STATE_SECRET
    } else {
      process.env.COMPOSIO_OAUTH_STATE_SECRET = originalStateSecret
    }
    vi.restoreAllMocks()
  })

  it('round-trips a signed state payload', () => {
    const state = createComposioOAuthState({
      userId: 'user_123',
      toolkit: 'slack',
      returnUrl: '/settings?tab=integrations',
    })

    const result = verifyComposioOAuthState(state)

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      userId: 'user_123',
      toolkit: 'slack',
      returnUrl: '/settings?tab=integrations',
      timestamp: 1_782_918_000_000,
    })
  })

  it('rejects tampered payloads', () => {
    const state = createComposioOAuthState({
      userId: 'user_123',
      toolkit: 'slack',
    })
    const [payload, signature] = state.split('.')
    const tamperedPayload = Buffer.from(JSON.stringify({
      userId: 'user_456',
      toolkit: 'slack',
      timestamp: 1_782_918_000_000,
    })).toString('base64url')

    const result = verifyComposioOAuthState(`${tamperedPayload}.${signature}`)

    expect(payload).not.toBe(tamperedPayload)
    expect(result.data).toBeNull()
    expect(result.error?.message).toContain('signature')
  })

  it('rejects expired state', () => {
    const state = createComposioOAuthState({
      userId: 'user_123',
      toolkit: 'slack',
    })

    dateNowSpy.mockReturnValue(1_782_918_000_000 + 11 * 60 * 1000)
    const result = verifyComposioOAuthState(state)

    expect(result.data).toBeNull()
    expect(result.error?.message).toContain('expired')
  })
})
