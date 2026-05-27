import { describe, expect, it, vi } from 'vitest'
import {
  getAnalysisIncludedParticipantCount,
  getExcludedParticipantCountsByStudyId,
  getParticipantAnalysisCounts,
} from '../participant-analysis-counts'

type SupabaseClientMock = Parameters<typeof getExcludedParticipantCountsByStudyId>[0]

function createSupabaseMock(
  rows: Array<{ study_id: string; participant_id: string }>,
  error: { message: string } | null = null
): SupabaseClientMock {
  return {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: async () => ({ data: rows, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClientMock
}

describe('participant analysis counts', () => {
  it('calculates included and excluded counts from total participants', () => {
    expect(getParticipantAnalysisCounts(3, 1)).toEqual({
      participant_count: 3,
      excluded_participant_count: 1,
      analysis_included_participant_count: 2,
    })
  })

  it('clamps invalid excluded counts to the participant total', () => {
    expect(getParticipantAnalysisCounts(3, 10)).toEqual({
      participant_count: 3,
      excluded_participant_count: 3,
      analysis_included_participant_count: 0,
    })
  })

  it('falls back to computed included counts when the server field is absent', () => {
    expect(
      getAnalysisIncludedParticipantCount({
        participant_count: 4,
        excluded_participant_count: 2,
      })
    ).toBe(2)
  })

  it('counts distinct excluded participants per study', async () => {
    const counts = await getExcludedParticipantCountsByStudyId(
      createSupabaseMock([
        { study_id: 'study-1', participant_id: 'participant-1' },
        { study_id: 'study-1', participant_id: 'participant-1' },
        { study_id: 'study-1', participant_id: 'participant-2' },
        { study_id: 'study-2', participant_id: 'participant-3' },
      ]),
      ['study-1', 'study-2']
    )

    expect(counts.get('study-1')).toBe(2)
    expect(counts.get('study-2')).toBe(1)
  })

  it('returns an empty count map when the flag query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const counts = await getExcludedParticipantCountsByStudyId(
        createSupabaseMock([], { message: 'database unavailable' }),
        ['study-1']
      )

      expect(counts.size).toBe(0)
    } finally {
      consoleError.mockRestore()
    }
  })
})
