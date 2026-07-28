import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  deleteStudyParticipants: vi.fn(),
  invalidateParticipantResultsCache: vi.fn(),
  maybeSingle: vi.fn(),
}

vi.mock('../../../services/participant-deletion-service', () => ({
  deleteStudyParticipants: mocks.deleteStudyParticipants,
  invalidateParticipantResultsCache:
    mocks.invalidateParticipantResultsCache,
}))

vi.mock('../../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => {
    const query: Record<string, unknown> = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.maybeSingle = mocks.maybeSingle

    return {
      from: vi.fn(() => query),
    }
  },
}))

const studyId = '11111111-1111-4111-8111-111111111111'
const participantId = '22222222-2222-4222-8222-222222222222'
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const enqueue = vi.fn().mockResolvedValue(undefined)
const state = {
  delete: vi.fn().mockResolvedValue(null),
}

function request() {
  return {
    pathParams: { studyId },
    body: { participantIds: [participantId] },
  }
}

describe('bulk study participant deletion endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enqueue.mockResolvedValue(undefined)
    state.delete.mockResolvedValue(null)
    mocks.maybeSingle.mockResolvedValue({
      data: { study_type: 'card_sort' },
      error: null,
    })
    mocks.deleteStudyParticipants.mockResolvedValue({
      success: true,
      deletedParticipantIds: [participantId],
      deletedCount: 1,
      deletedRecordingCount: 2,
    })
  })

  it('is editor protected and exposes the study-scoped bulk route', async () => {
    const { config } = await import('./bulk-delete-participants.step')
    const trigger = config.triggers[0]

    expect(trigger.method).toBe('POST')
    expect(trigger.path).toBe(
      '/api/studies/:studyId/participants/bulk-delete',
    )
    expect(trigger.middleware).toHaveLength(3)
  })

  it('invalidates derived results and requests recomputation after deletion', async () => {
    const { handler } = await import('./bulk-delete-participants.step')

    const result = await handler(request() as never, {
      logger,
      enqueue,
      state,
    } as never)

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        deletedCount: 1,
        deletedParticipantIds: [participantId],
        deletedRecordingCount: 2,
      },
    })
    expect(mocks.invalidateParticipantResultsCache).toHaveBeenCalledWith(
      studyId,
    )
    expect(state.delete).toHaveBeenCalledWith('closure-analysis', studyId)
    expect(enqueue).toHaveBeenCalledWith({
      topic: 'results-analysis-requested',
      data: {
        studyId,
        studyType: 'card_sort',
        priority: 'high',
      },
    })
  })

  it('returns not found without invalidating results when IDs are out of scope', async () => {
    const { handler } = await import('./bulk-delete-participants.step')
    mocks.deleteStudyParticipants.mockResolvedValue({
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'No valid participants found for this study',
      errorCode: 'not_found',
    })

    const result = await handler(request() as never, {
      logger,
      enqueue,
      state,
    } as never)

    expect(result.status).toBe(404)
    expect(mocks.invalidateParticipantResultsCache).not.toHaveBeenCalled()
    expect(state.delete).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('returns a server error when complete deletion cannot be guaranteed', async () => {
    const { handler } = await import('./bulk-delete-participants.step')
    mocks.deleteStudyParticipants.mockResolvedValue({
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'Failed to delete participant recordings. Please retry.',
      errorCode: 'media',
    })

    const result = await handler(request() as never, {
      logger,
      enqueue,
      state,
    } as never)

    expect(result.status).toBe(500)
    expect(result.body.error).toContain('retry')
    expect(mocks.invalidateParticipantResultsCache).not.toHaveBeenCalled()
  })
})
