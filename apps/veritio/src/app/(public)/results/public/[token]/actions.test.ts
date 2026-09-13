import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  consumeLimits: vi.fn(),
  cookieSet: vi.fn(),
  headers: vi.fn(),
  single: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: mocks.cookieSet })),
  headers: mocks.headers,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mocks.single })),
      })),
    })),
  })),
}))

vi.mock('@/middlewares/rate-limit', () => ({
  consumeDistributedRateLimits: mocks.consumeLimits,
}))

vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }))

import { verifyAccessCookie, verifyPublicResultsPassword } from './actions'

const TOKEN = 'abcdefghijklmnopqrstuvwx'

describe('public results password protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-characters-long'
    mocks.headers.mockResolvedValue(new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }))
    mocks.consumeLimits.mockResolvedValue({ allowed: true })
    mocks.single.mockResolvedValue({
      data: { sharing_settings: { publicResults: { passwordHash: 'stored-hash' } } },
    })
    mocks.compare.mockResolvedValue(false)
  })

  it('rejects malformed and oversized input before rate limiting or bcrypt work', async () => {
    await expect(verifyPublicResultsPassword('../bad', 'password')).resolves.toEqual({
      valid: false,
      error: 'invalid_credentials',
    })
    await expect(verifyPublicResultsPassword(TOKEN, 'x'.repeat(257))).resolves.toEqual({
      valid: false,
      error: 'invalid_credentials',
    })

    expect(mocks.consumeLimits).not.toHaveBeenCalled()
    expect(mocks.single).not.toHaveBeenCalled()
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it('enforces separate IP and token budgets before database and bcrypt work', async () => {
    mocks.consumeLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 900 })

    await expect(verifyPublicResultsPassword(TOKEN, 'password')).resolves.toEqual({
      valid: false,
      error: 'rate_limited',
      retryAfterSeconds: 900,
    })

    expect(mocks.consumeLimits).toHaveBeenCalledWith([
      { tier: 'public-results-password-ip', identifier: 'public-results-password:ip:203.0.113.10' },
      { tier: 'public-results-password-token', identifier: `public-results-password:token:${TOKEN}` },
    ])
    expect(mocks.single).not.toHaveBeenCalled()
    expect(mocks.compare).not.toHaveBeenCalled()
  })

  it('returns the same failure for an unknown token and an incorrect password', async () => {
    mocks.single.mockResolvedValueOnce({ data: null })
    const unknownToken = await verifyPublicResultsPassword(TOKEN, 'password')

    mocks.single.mockResolvedValueOnce({
      data: { sharing_settings: { publicResults: { passwordHash: 'stored-hash' } } },
    })
    const wrongPassword = await verifyPublicResultsPassword(TOKEN, 'password')

    expect(unknownToken).toEqual({ valid: false, error: 'invalid_credentials' })
    expect(wrongPassword).toEqual(unknownToken)
    expect(mocks.compare).toHaveBeenNthCalledWith(1, 'password', expect.stringMatching(/^\$2b\$10\$/))
    expect(mocks.compare).toHaveBeenNthCalledWith(2, 'password', 'stored-hash')
  })

  it('sets a scoped httpOnly cookie after a valid password', async () => {
    mocks.compare.mockResolvedValue(true)

    await expect(verifyPublicResultsPassword(TOKEN, 'correct password')).resolves.toEqual({ valid: true })
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      `pr_access_${TOKEN}`,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: `/results/public/${TOKEN}`,
      })
    )
  })

  it('verifies signed cookies without accepting length or content mismatches', async () => {
    mocks.compare.mockResolvedValue(true)
    await verifyPublicResultsPassword(TOKEN, 'correct password')
    const signedCookie = mocks.cookieSet.mock.calls[0][1] as string
    const changedLastCharacter = signedCookie.endsWith('0') ? '1' : '0'

    await expect(verifyAccessCookie(TOKEN, signedCookie)).resolves.toBe(true)
    await expect(verifyAccessCookie(TOKEN, `${signedCookie.slice(0, -1)}${changedLastCharacter}`)).resolves.toBe(false)
    await expect(verifyAccessCookie(TOKEN, signedCookie.slice(1))).resolves.toBe(false)
    await expect(verifyAccessCookie('../bad', signedCookie)).resolves.toBe(false)
  })
})
