import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.fn()

vi.mock('../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => ({ rpc }),
}))

const logger = {
  info: vi.fn(),
  error: vi.fn(),
}

describe('orphaned background cleanup cron', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs seven-day background cleanup even when no deleted-study assets exist', async () => {
    rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: 2, error: null })
    const { handler } = await import('./cleanup-orphaned-storage.step')

    await handler(undefined, { logger } as never)

    expect(rpc).toHaveBeenNthCalledWith(1, 'get_orphaned_storage_objects')
    expect(rpc).toHaveBeenNthCalledWith(2, 'cleanup_orphaned_background_storage')
    expect(logger.info).toHaveBeenCalledWith(
      'Background storage cleanup completed',
      { deletedCount: 2 },
    )
  })

  it('keeps background cleanup independent from a deleted-study listing failure', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { message: 'RPC unavailable' } })
      .mockResolvedValueOnce({ data: 0, error: null })
    const { handler } = await import('./cleanup-orphaned-storage.step')

    await handler(undefined, { logger } as never)

    expect(rpc).toHaveBeenCalledWith('cleanup_orphaned_background_storage')
  })
})
