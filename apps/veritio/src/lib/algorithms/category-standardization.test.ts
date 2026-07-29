import { describe, it, expect } from 'vitest'
import {
  calculateAgreementScore,
  calculateGroupingConsistency,
  type CategoryAnalysis,
} from './category-standardization'

const set = (...ids: string[]) => new Set(ids)

describe('calculateGroupingConsistency', () => {
  it('scores identical groupings 100', () => {
    expect(
      calculateGroupingConsistency([set('c1', 'c2', 'c3'), set('c1', 'c2', 'c3')])
    ).toBe(100)
  })

  it('scores groupings that share no cards 0, not half', () => {
    // The old per-card measure returned 50% here, which reads as half-agreement
    // for two groupings with nothing whatsoever in common.
    expect(calculateGroupingConsistency([set('c1', 'c2'), set('c3', 'c4')])).toBe(0)
  })

  it('does not decay as more participants are added', () => {
    // The defect that motivated switching metrics: a fixed level of real
    // agreement (a shared core of 4 cards plus one stray each) used to read 83%
    // across 2 participants and 5% across 100, so the categories the most people
    // agreed on scored the worst in the column.
    const build = (n: number) =>
      Array.from({ length: n }, (_, i) => set('a', 'b', 'c', 'd', `stray${i}`))
    const scores = [2, 5, 10, 50, 100].map((n) => calculateGroupingConsistency(build(n)))
    for (const score of scores) {
      expect(score).toBe(scores[0])
    }
    expect(scores[0]).toBe(67) // 4 shared of 6 combined
  })

  it('drops as participants disagree about contents', () => {
    const agree = calculateGroupingConsistency([
      set('c1', 'c2', 'c3'),
      set('c1', 'c2', 'c3'),
      set('c1', 'c2', 'c3'),
    ])
    const partial = calculateGroupingConsistency([
      set('c1', 'c2', 'c3'),
      set('c1', 'c2'),
      set('c1', 'c4'),
    ])
    expect(agree).toBe(100)
    expect(partial).toBeLessThan(agree as number)
    expect(partial).toBeGreaterThan(0)
  })

  it('scores a grouping against an empty one as no agreement', () => {
    expect(calculateGroupingConsistency([set('c1', 'c2'), set()])).toBe(0)
  })

  it('returns null when there is nothing to compare', () => {
    // The bug this guards: reporting 100% for a single grouping reads as strong
    // consensus when no consensus was measured.
    expect(calculateGroupingConsistency([set('c1', 'c2')])).toBeNull()
    expect(calculateGroupingConsistency([])).toBeNull()
  })

  it('returns null when every grouping is empty', () => {
    expect(calculateGroupingConsistency([set(), set()])).toBeNull()
  })

  it('is order independent', () => {
    const a = calculateGroupingConsistency([set('c1', 'c2'), set('c2', 'c3'), set('c1')])
    const b = calculateGroupingConsistency([set('c1'), set('c2', 'c3'), set('c1', 'c2')])
    expect(a).toBe(b)
  })
})

describe('calculateAgreementScore', () => {
  const asCategory = (name: string, ...cardIds: string[]): CategoryAnalysis => ({
    name,
    normalizedName: name.toLowerCase(),
    frequency: 1,
    cardIds: set(...cardIds),
    participantIds: ['p1'],
  })

  it('keeps reporting 100 for a single-category merge group', () => {
    expect(calculateAgreementScore([asCategory('Nav', 'c1', 'c2')])).toBe(100)
  })

  it('agrees with the shared consistency math for real merge groups', () => {
    const categories = [asCategory('Nav', 'c1', 'c2'), asCategory('Menu', 'c1', 'c3')]
    expect(calculateAgreementScore(categories)).toBe(
      calculateGroupingConsistency(categories.map((c) => c.cardIds))
    )
  })
})
