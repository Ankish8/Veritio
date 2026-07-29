import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  getSession: vi.fn(),
}

vi.mock('better-auth/react', () => ({
  createAuthClient: () => ({
    getSession: mocks.getSession,
    listAccounts: vi.fn(),
  }),
}))

describe('session expiration confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('does not expire a valid session because an unrelated endpoint returned 401', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: { token: 'still-valid' },
        user: { id: 'user-1' },
      },
      error: null,
    })

    const { isSessionActuallyExpired } = await import(
      '../../../../../packages/@veritio/auth/src/client'
    )

    await expect(isSessionActuallyExpired()).resolves.toBe(false)
  })

  it('expires only when Better Auth confirms there is no session', async () => {
    mocks.getSession.mockResolvedValue({
      data: null,
      error: null,
    })

    const { isSessionActuallyExpired } = await import(
      '../../../../../packages/@veritio/auth/src/client'
    )

    await expect(isSessionActuallyExpired()).resolves.toBe(true)
  })

  it('keeps the user in place when session validation itself fails', async () => {
    mocks.getSession.mockRejectedValue(new Error('network unavailable'))

    const { isSessionActuallyExpired } = await import(
      '../../../../../packages/@veritio/auth/src/client'
    )

    await expect(isSessionActuallyExpired()).resolves.toBe(false)
  })
})
