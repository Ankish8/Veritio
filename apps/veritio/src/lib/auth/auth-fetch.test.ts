import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  fetch: vi.fn(),
  getAuthToken: vi.fn(),
  handleSessionExpired: vi.fn(),
  isSessionActuallyExpired: vi.fn(),
}

vi.mock('../../../../../packages/@veritio/auth/src/client', () => ({
  getAuthToken: mocks.getAuthToken,
  handleSessionExpired: mocks.handleSessionExpired,
  isSessionActuallyExpired: mocks.isSessionActuallyExpired,
}))

describe('authenticated fetch 401 handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetch.mockResolvedValue(new Response(null, { status: 401 }))
    mocks.getAuthToken.mockResolvedValue('token')
    vi.stubGlobal('fetch', mocks.fetch)
  })

  it('does not redirect while Better Auth still confirms a valid session', async () => {
    mocks.isSessionActuallyExpired.mockResolvedValue(false)
    const { createAuthFetch } = await import(
      '../../../../../packages/@veritio/auth/src/fetch'
    )

    const response = await createAuthFetch()('/api/studies/study-1/stats')

    expect(response.status).toBe(401)
    expect(mocks.isSessionActuallyExpired).toHaveBeenCalledOnce()
    expect(mocks.handleSessionExpired).not.toHaveBeenCalled()
  })

  it('redirects when Better Auth confirms the session is gone', async () => {
    mocks.isSessionActuallyExpired.mockResolvedValue(true)
    const { createAuthFetch } = await import(
      '../../../../../packages/@veritio/auth/src/fetch'
    )

    await createAuthFetch()('/api/projects')

    expect(mocks.handleSessionExpired).toHaveBeenCalledOnce()
  })
})
