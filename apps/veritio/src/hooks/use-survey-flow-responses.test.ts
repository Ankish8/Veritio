import { describe, expect, it } from 'vitest'
import type { StudyFlowResponseRow } from '@veritio/study-types'
import { filterFlowResponsesByParticipantScope } from './use-survey-flow-responses'

const responses = [
  { id: 'r1', participant_id: 'included-participant' },
  { id: 'r2', participant_id: 'excluded-participant' },
] as StudyFlowResponseRow[]

describe('filterFlowResponsesByParticipantScope', () => {
  it('returns all responses when no participant scope is provided', () => {
    expect(filterFlowResponsesByParticipantScope(responses, null)).toBe(responses)
  })

  it('keeps only responses for scoped participants', () => {
    const filtered = filterFlowResponsesByParticipantScope(
      responses,
      new Set(['included-participant'])
    )

    expect(filtered).toEqual([responses[0]])
  })

  it('returns no responses for an empty participant scope', () => {
    expect(filterFlowResponsesByParticipantScope(responses, new Set())).toEqual([])
  })
})
