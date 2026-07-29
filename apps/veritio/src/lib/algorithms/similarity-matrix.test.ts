import { describe, it, expect } from 'vitest'
import {
  computeSimilarityMatrix,
  toParticipantResponse,
  type ParticipantResponse,
} from './similarity-matrix'

const CARDS = [
  { id: 'c1', label: 'Card 1' },
  { id: 'c2', label: 'Card 2' },
  { id: 'c3', label: 'Card 3' },
]

function at(
  result: ReturnType<typeof computeSimilarityMatrix>,
  a: string,
  b: string
): number {
  return result.matrix[result.cardIds.indexOf(a)][result.cardIds.indexOf(b)]
}

describe('toParticipantResponse', () => {
  it('keeps the label for display and the id for grouping', () => {
    const response = toParticipantResponse({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
      category_assignments: { c1: 'cat-1', c2: 'cat-2', c3: 'cat-3' },
    })
    expect(response.placements).toEqual([
      { cardId: 'c1', categoryId: 'Other', groupKey: 'cat-1' },
      { cardId: 'c2', categoryId: 'Other', groupKey: 'cat-2' },
      { cardId: 'c3', categoryId: 'Nav', groupKey: 'cat-3' },
    ])
  })

  it('falls back to the label when no ids were stored', () => {
    const response = toParticipantResponse({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other' },
    })
    expect(response.placements.map((p) => p.groupKey)).toEqual(['Other', 'Other'])
  })

  it('tolerates a null or missing placements blob', () => {
    expect(
      toParticipantResponse({ participant_id: 'p1', card_placements: null }).placements
    ).toEqual([])
    expect(
      toParticipantResponse({
        participant_id: 'p1',
        card_placements: { c1: 'A' },
        category_assignments: null,
      }).placements[0].groupKey
    ).toBe('A')
  })
})

describe('computeSimilarityMatrix group identity', () => {
  it('does not pair cards from two same-named groups', () => {
    // One participant made two groups, both called "Other". c1 and c2 were never
    // placed together, so they must not co-occur.
    const responses: ParticipantResponse[] = [
      toParticipantResponse({
        participant_id: 'p1',
        card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
        category_assignments: { c1: 'cat-1', c2: 'cat-2', c3: 'cat-3' },
      }),
    ]
    const result = computeSimilarityMatrix(responses, CARDS)
    expect(at(result, 'c1', 'c2')).toBe(0)
  })

  it('still pairs cards that really were in the same group', () => {
    const responses: ParticipantResponse[] = [
      toParticipantResponse({
        participant_id: 'p1',
        card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
        category_assignments: { c1: 'cat-1', c2: 'cat-1', c3: 'cat-3' },
      }),
    ]
    const result = computeSimilarityMatrix(responses, CARDS)
    expect(at(result, 'c1', 'c2')).toBe(100)
    expect(at(result, 'c1', 'c3')).toBe(0)
  })

  it('merges same-named groups on legacy rows, deliberately', () => {
    // Which card went into which "Other" is unrecoverable without ids, so the
    // old behaviour has to stand for rows predating them. Asserted so nobody
    // "fixes" the fallback later.
    const responses: ParticipantResponse[] = [
      toParticipantResponse({
        participant_id: 'p1',
        card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
      }),
    ]
    const result = computeSimilarityMatrix(responses, CARDS)
    expect(at(result, 'c1', 'c2')).toBe(100)
  })

  it('keeps groups separate across participants that reuse a name', () => {
    // Two participants both used "Group A", for different cards. Grouping is
    // per participant, so this must not create a c1-c3 pair.
    const responses: ParticipantResponse[] = [
      toParticipantResponse({
        participant_id: 'p1',
        card_placements: { c1: 'Group A', c2: 'Group A' },
        category_assignments: { c1: 'x', c2: 'x' },
      }),
      toParticipantResponse({
        participant_id: 'p2',
        card_placements: { c3: 'Group A' },
        category_assignments: { c3: 'y' },
      }),
    ]
    const result = computeSimilarityMatrix(responses, CARDS)
    expect(at(result, 'c1', 'c3')).toBe(0)
    expect(at(result, 'c1', 'c2')).toBe(50) // 1 of 2 responses
  })
})
