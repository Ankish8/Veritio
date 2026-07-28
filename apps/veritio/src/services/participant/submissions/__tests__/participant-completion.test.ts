import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ALREADY_SUBMITTED_ERROR,
  COMPLETION_FAILED_ERROR,
  RESPONSE_LIMIT_ERROR,
  completeParticipantSubmission,
  markParticipantCompleted,
  type SupabaseClientType,
} from '../verification'

vi.mock('../../../entitlements-service', () => ({
  getResponseCapForStudy: vi.fn(async () => Number.POSITIVE_INFINITY),
}))

const PARTICIPANT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const STUDY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

interface Deleted {
  table: string
  column: string
  value: string
}

/**
 * Minimal Supabase double: the RPC result is scripted per test and every delete
 * is recorded so the rollback can be asserted.
 */
function client(
  rpcResult: { data?: unknown; error?: { message: string } | null },
  options: { deleteError?: { message: string } } = {}
) {
  const deletes: Deleted[] = []

  const supabase = {
    rpc: vi.fn(async () => ({ data: rpcResult.data ?? null, error: rpcResult.error ?? null })),
    from: (table: string) => ({
      delete: () => ({
        eq: async (column: string, value: string) => {
          deletes.push({ table, column, value })
          return { error: options.deleteError ?? null }
        },
      }),
    }),
  }

  return { supabase: supabase as unknown as SupabaseClientType, deletes }
}

describe('markParticipantCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports completion', async () => {
    const { supabase } = client({ data: 'completed' })

    const result = await markParticipantCompleted(supabase, PARTICIPANT_ID, undefined, undefined, STUDY_ID)

    expect(result).toEqual({ outcome: 'completed', error: null })
  })

  // A full study is an ordinary outcome, not a crash: throwing here escaped the
  // endpoints' error mapping and reached participants as "Internal Server Error".
  it('returns a response-limit outcome rather than throwing', async () => {
    const { supabase } = client({ data: 'response_limit_reached' })

    const result = await markParticipantCompleted(supabase, PARTICIPANT_ID, undefined, undefined, STUDY_ID)

    expect(result.outcome).toBe('response_limit_reached')
    expect(result.error?.message).toBe(RESPONSE_LIMIT_ERROR)
  })

  it('returns an already-completed outcome rather than throwing', async () => {
    const { supabase } = client({ data: 'already_completed' })

    const result = await markParticipantCompleted(supabase, PARTICIPANT_ID, undefined, undefined, STUDY_ID)

    expect(result.outcome).toBe('already_completed')
    expect(result.error?.message).toBe(ALREADY_SUBMITTED_ERROR)
  })

  // The outage this contract exists for: the RPC failed at parse time on every
  // call ("CASE/WHEN could not convert type jsonb to json").
  it('turns a database error into a failed outcome', async () => {
    const { supabase } = client({ error: { message: 'CASE/WHEN could not convert type jsonb to json' } })

    const result = await markParticipantCompleted(supabase, PARTICIPANT_ID, undefined, undefined, STUDY_ID)

    expect(result.outcome).toBe('failed')
    expect(result.error?.message).toBe(COMPLETION_FAILED_ERROR)
  })

  it('treats an unrecognised RPC result as a failure', async () => {
    const { supabase } = client({ data: 'something_new' })

    const result = await markParticipantCompleted(supabase, PARTICIPANT_ID, undefined, undefined, STUDY_ID)

    expect(result.outcome).toBe('failed')
  })
})

describe('completeParticipantSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes nothing back when completion succeeds', async () => {
    const { supabase, deletes } = client({ data: 'completed' })

    const error = await completeParticipantSubmission(supabase, PARTICIPANT_ID, STUDY_ID, {
      rollbackTables: ['card_sort_responses'],
    })

    expect(error).toBeNull()
    expect(deletes).toEqual([])
  })

  // Without this the response row survives a failed submit, and card sort results
  // read every response row regardless of participant status — so an abandoned
  // attempt would be counted in the analysis.
  it('removes the rows this submission wrote when completion fails', async () => {
    const { supabase, deletes } = client({ data: 'response_limit_reached' })

    const error = await completeParticipantSubmission(supabase, PARTICIPANT_ID, STUDY_ID, {
      rollbackTables: ['card_sort_responses'],
    })

    expect(error?.message).toBe(RESPONSE_LIMIT_ERROR)
    expect(deletes).toEqual([
      { table: 'card_sort_responses', column: 'participant_id', value: PARTICIPANT_ID },
    ])
  })

  it('keeps incrementally saved answers when no rollback tables are declared', async () => {
    const { supabase, deletes } = client({ data: 'response_limit_reached' })

    const error = await completeParticipantSubmission(supabase, PARTICIPANT_ID, STUDY_ID)

    expect(error?.message).toBe(RESPONSE_LIMIT_ERROR)
    expect(deletes).toEqual([])
  })

  it('still reports the original error when the rollback itself fails', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const { supabase } = client(
      { data: 'response_limit_reached' },
      { deleteError: { message: 'permission denied' } }
    )

    const error = await completeParticipantSubmission(supabase, PARTICIPANT_ID, STUDY_ID, {
      logger,
      rollbackTables: ['card_sort_responses'],
    })

    expect(error?.message).toBe(RESPONSE_LIMIT_ERROR)
    expect(logger.error).toHaveBeenCalledWith(
      '[completeParticipantSubmission] Failed to roll back response rows',
      expect.objectContaining({ table: 'card_sort_responses' })
    )
  })
})
