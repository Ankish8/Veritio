import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  single: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('../../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => {
    const query: Record<string, unknown> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.single = mocks.single

    return {
      from: vi.fn(() => query),
      rpc: mocks.rpc,
    }
  },
}))

const studyId = '11111111-1111-4111-8111-111111111111'
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('study stats authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.single.mockResolvedValue({
      data: {
        id: studyId,
        last_response_at: '2026-07-29T06:30:00.000Z',
      },
      error: null,
    })
    mocks.rpc.mockResolvedValue({
      data: {
        participantStats: {
          total: 3,
          completed: 2,
          inProgress: 1,
          abandoned: 0,
          screened: 0,
        },
        completionRate: 67,
        averageDurationSeconds: 42,
        responsesByDay: [],
      },
      error: null,
    })
  })

  it('uses viewer permission middleware instead of an owner-only handler check', async () => {
    const { config, handler } = await import('./get-study-stats.step')
    const trigger = config.triggers[0]

    expect(trigger.middleware).toHaveLength(3)
    expect(trigger.responseSchema).toHaveProperty('403')

    const result = await handler(
      {
        headers: { 'x-user-id': 'collaborator-user' },
        pathParams: { studyId },
      } as never,
      { logger } as never,
    )

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      studyId,
      participantStats: {
        total: 3,
        completed: 2,
      },
      lastResponseAt: '2026-07-29T06:30:00.000Z',
    })
  })
})
