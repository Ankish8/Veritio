import { describe, it, expect } from 'vitest'
import {
  buildPCAModel,
  buildPairKeySet,
  calculateIASimilarity,
  extractParticipantIA,
  performPCAAnalysis,
  selectPCAStrategies,
  simAt,
  type PCAResponseInput,
} from './pca-analysis'
import {
  PCA_STRATEGY_DEFAULT_THRESHOLD,
  PCA_TOP_STRATEGIES_COUNT,
} from '@/lib/constants/analysis-thresholds'

// ---------------------------------------------------------------------------
// Fixtures: an 8-card deck, so 28 pairs are possible.
// ---------------------------------------------------------------------------

const CARD_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
const CARDS = CARD_IDS.map((id) => ({ id, label: `Card ${id.slice(1)}` }))

/** Build a response from group label -> card ids. */
function response(
  participantId: string,
  groups: Record<string, string[]>,
  extra: Partial<PCAResponseInput> = {}
): PCAResponseInput {
  const card_placements: Record<string, string> = {}
  for (const [label, cardIds] of Object.entries(groups)) {
    for (const cardId of cardIds) card_placements[cardId] = label
  }
  return { participant_id: participantId, card_placements, ...extra }
}

const HALVES = { A: ['c1', 'c2', 'c3', 'c4'], B: ['c5', 'c6', 'c7', 'c8'] }
const HALVES_RENAMED = { X: ['c1', 'c2', 'c3', 'c4'], Y: ['c5', 'c6', 'c7', 'c8'] }
const HALVES_RENAMED_2 = { Nav: ['c1', 'c2', 'c3', 'c4'], Menu: ['c5', 'c6', 'c7', 'c8'] }
const ALL_ONE_GROUP = { Everything: CARD_IDS }
const ALL_SINGLETONS = Object.fromEntries(CARD_IDS.map((id, i) => [`G${i}`, [id]]))

const ia = (r: PCAResponseInput) =>
  extractParticipantIA(r, new Map(CARDS.map((c) => [c.id, c.label])))

describe('extractParticipantIA', () => {
  it('generates every within-group pair and no cross-group pair', () => {
    const result = ia(response('p1', HALVES))
    // Two groups of four: 6 pairs each.
    expect(result.pairCount).toBe(12)
    expect(result.categories).toHaveLength(2)
    expect(result.placedCardCount).toBe(8)
    expect(buildPairKeySet(result).has('c1:c5')).toBe(false)
    expect(buildPairKeySet(result).has('c1:c2')).toBe(true)
  })

  it('keeps two same-named groups apart when category ids were persisted', () => {
    const withIds = ia({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
      category_assignments: { c1: 'cat-1', c2: 'cat-2', c3: 'cat-3' },
    })
    expect(withIds.categories).toHaveLength(3)
    expect(withIds.pairCount).toBe(0)
    expect(withIds.hasCategoryIdentity).toBe(true)
  })

  it('merges two same-named groups when only labels were stored', () => {
    // Asserted deliberately: legacy rows cannot recover which card went where,
    // so this fallback must stay. It is why such rows are barred from candidacy.
    const labelsOnly = ia({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
    })
    expect(labelsOnly.categories).toHaveLength(2)
    expect(labelsOnly.pairCount).toBe(1)
    expect(labelsOnly.hasCategoryIdentity).toBe(false)
  })

  it('flags suspected merged groups from duplicate custom category labels', () => {
    const dupes = ia({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav' },
      custom_categories: ['Other', 'Other', 'Nav'],
    })
    expect(dupes.degeneracy).toBe('merged-groups')

    const clean = ia({
      participant_id: 'p2',
      card_placements: { c1: 'Other', c2: 'Other', c3: 'Nav', c4: 'Nav' },
      custom_categories: ['Other', 'Nav'],
    })
    expect(clean.degeneracy).toBeNull()
  })

  it('reads custom_categories in both the string[] and {label}[] shapes', () => {
    const asObjects = ia({
      participant_id: 'p1',
      card_placements: { c1: 'Other', c2: 'Other' },
      custom_categories: [{ id: 'a', label: 'Other' }, { id: 'b', label: 'Other' }],
    })
    expect(asObjects.degeneracy).toBe('merged-groups')
  })

  it('ignores placements for cards no longer in the study', () => {
    const result = ia({
      participant_id: 'p1',
      card_placements: { c1: 'A', c2: 'A', 'deleted-card': 'A' },
    })
    expect(result.placedCardCount).toBe(2)
    expect(result.pairCount).toBe(1)
  })

  it('classifies degenerate sorts', () => {
    expect(ia(response('p1', ALL_ONE_GROUP)).degeneracy).toBe('all-one-group')
    expect(ia(response('p2', ALL_SINGLETONS)).degeneracy).toBe('all-singletons')
    expect(ia(response('p3', HALVES)).degeneracy).toBeNull()
  })

  describe('Unclear bucket', () => {
    const withUnclear = {
      participant_id: 'p1',
      card_placements: {
        c1: 'A',
        c2: 'A',
        c3: 'Unclear',
        c4: 'Unclear',
      },
    }

    it('counts Unclear as a real group when included', () => {
      const included = extractParticipantIA(
        withUnclear,
        new Map(CARDS.map((c) => [c.id, c.label])),
        { excludeUnclear: false }
      )
      expect(included.categories).toHaveLength(2)
      expect(included.pairCount).toBe(2) // c1:c2 plus the spurious c3:c4
      expect(included.unclearCardCount).toBe(2)
    })

    it('drops Unclear cards from both the pairs and the group count when excluded', () => {
      const excluded = extractParticipantIA(
        withUnclear,
        new Map(CARDS.map((c) => [c.id, c.label])),
        { excludeUnclear: true }
      )
      expect(excluded.categories).toHaveLength(1)
      expect(excluded.pairCount).toBe(1)
      expect(excluded.placedCardCount).toBe(2)
      expect(excluded.unclearCardCount).toBe(2)
    })

    it("treats a researcher's own category named Unclear as real", () => {
      const excluded = extractParticipantIA(
        withUnclear,
        new Map(CARDS.map((c) => [c.id, c.label])),
        { excludeUnclear: true, predefinedCategoryLabels: ['A', 'Unclear'] }
      )
      expect(excluded.categories).toHaveLength(2)
      expect(excluded.unclearCardCount).toBe(0)
    })
  })
})

describe('agreement metric', () => {
  it('is symmetric', () => {
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', HALVES_RENAMED),
        response('p3', ALL_ONE_GROUP),
        response('p4', { A: ['c1', 'c2'], B: ['c3', 'c4'], C: ['c5', 'c6', 'c7', 'c8'] }),
      ],
      CARDS
    )
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        expect(simAt(model, i, j)).toBeCloseTo(simAt(model, j, i), 10)
      }
    }
  })

  it('ignores category names', () => {
    const model = buildPCAModel(
      [response('p1', HALVES), response('p2', HALVES_RENAMED)],
      CARDS
    )
    expect(simAt(model, 0, 1)).toBe(1)
  })

  it('does not let a lumper agree fully with a structured sort', () => {
    // The regression that mattered: under the old asymmetric metric this was
    // 12/12 = 100%, because a single-group sort contains every possible pair.
    const model = buildPCAModel(
      [response('p1', HALVES), response('p2', ALL_ONE_GROUP)],
      CARDS
    )
    expect(simAt(model, 0, 1)).toBeCloseTo(12 / 28, 6)
  })

  it('excludes a lumper from the supporters of a structured strategy', () => {
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', HALVES_RENAMED),
        response('p3', ALL_ONE_GROUP),
      ],
      CARDS
    )
    const { strategies } = selectPCAStrategies(model, 0.5, 3)
    expect(strategies).toHaveLength(1)
    expect(strategies[0].supportingParticipantIds).not.toContain('p3')
    expect(strategies[0].supportingParticipantIds.sort()).toEqual(['p1', 'p2'])
  })

  it('scores two structureless sorts as agreeing on nothing', () => {
    const model = buildPCAModel(
      [response('p1', ALL_SINGLETONS), response('p2', ALL_SINGLETONS)],
      CARDS
    )
    expect(simAt(model, 0, 1)).toBe(0)
  })

  it('scores a structureless sort against a structured one as zero', () => {
    const model = buildPCAModel(
      [response('p1', ALL_SINGLETONS), response('p2', HALVES)],
      CARDS
    )
    expect(simAt(model, 0, 1)).toBe(0)
  })

  it('matches the reference Set implementation on a varied set', () => {
    // Guards the bitset pair indexing and popcount against the readable version.
    const responses = [
      response('p1', HALVES),
      response('p2', HALVES_RENAMED),
      response('p3', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5'], C: ['c6', 'c7', 'c8'] }),
      response('p4', { A: ['c1'], B: ['c2', 'c3', 'c4', 'c5', 'c6'], C: ['c7', 'c8'] }),
      response('p5', ALL_ONE_GROUP),
      response('p6', ALL_SINGLETONS),
      response('p7', { A: ['c1', 'c8'], B: ['c2', 'c7'], C: ['c3', 'c4', 'c5', 'c6'] }),
    ]
    const model = buildPCAModel(responses, CARDS)
    for (let i = 0; i < model.totalParticipants; i++) {
      for (let j = i + 1; j < model.totalParticipants; j++) {
        expect(simAt(model, i, j)).toBeCloseTo(
          calculateIASimilarity(model.ias[i], model.ias[j]),
          6
        )
      }
    }
  })

  it('indexes pairs uniquely and densely for every deck size it supports', () => {
    for (let cardCount = 2; cardCount <= 40; cardCount++) {
      const deck = Array.from({ length: cardCount }, (_, i) => ({
        id: `k${i}`,
        label: `K${i}`,
      }))
      // One participant with everything together exercises every pair index.
      const model = buildPCAModel(
        [
          response(
            'p1',
            { All: deck.map((d) => d.id) } as Record<string, string[]>
          ),
          response('p2', { All: deck.map((d) => d.id) } as Record<string, string[]>),
        ],
        deck
      )
      const expectedPairs = (cardCount * (cardCount - 1)) / 2
      expect(model.pairCounts[0]).toBe(expectedPairs)
      // Identical sorts, so every pair must line up: no index collisions.
      expect(simAt(model, 0, 1)).toBe(1)
    }
  })
})

describe('selectPCAStrategies', () => {
  /** Four participants: three agreeing on halves, one splitter with 8 groups. */
  const threeAgreeingPlusSplitter = [
    response('p-splitter', ALL_SINGLETONS),
    response('p-a', HALVES),
    response('p-b', HALVES_RENAMED),
    response('p-c', HALVES_RENAMED_2),
  ]

  it('holds the support-equals-votes invariant at every threshold', () => {
    const model = buildPCAModel(threeAgreeingPlusSplitter, CARDS)
    for (const threshold of [0.3, 0.5, 0.7]) {
      const { strategies, votes } = selectPCAStrategies(model, threshold, 3)
      for (const s of strategies) {
        expect(s.supportingParticipantIds.length).toBe(votes[s.representativeIndex])
        expect(s.supportRatio).toBeCloseTo(
          votes[s.representativeIndex] / model.totalParticipants,
          10
        )
      }
    }
  })

  it('never seeds a strategy from the splitter', () => {
    const model = buildPCAModel(threeAgreeingPlusSplitter, CARDS)
    const { strategies } = selectPCAStrategies(model, 0.5, 3)
    expect(strategies).toHaveLength(1)
    expect(['p-a', 'p-b', 'p-c']).toContain(strategies[0].representativeParticipantId)
  })

  it('is independent of input order', () => {
    const forward = buildPCAModel(threeAgreeingPlusSplitter, CARDS)
    const reversed = buildPCAModel([...threeAgreeingPlusSplitter].reverse(), CARDS)
    for (const threshold of [0.3, 0.5, 0.7]) {
      const a = selectPCAStrategies(forward, threshold, 3)
      const b = selectPCAStrategies(reversed, threshold, 3)
      expect(a.strategies.map((s) => s.representativeParticipantId)).toEqual(
        b.strategies.map((s) => s.representativeParticipantId)
      )
      expect(a.strategies.map((s) => s.supportRatio)).toEqual(
        b.strategies.map((s) => s.supportRatio)
      )
    }
  })

  it('emits only mutually distinct strategies', () => {
    // Two blocks of agreeing participants that disagree across blocks.
    const blockA = [
      response('a1', HALVES),
      response('a2', HALVES_RENAMED),
      response('a3', HALVES_RENAMED_2),
    ]
    const quarters = {
      P: ['c1', 'c2'],
      Q: ['c3', 'c4'],
      R: ['c5', 'c6'],
      S: ['c7', 'c8'],
    }
    const blockB = [
      response('b1', quarters),
      response('b2', { W: ['c1', 'c2'], X: ['c3', 'c4'], Y: ['c5', 'c6'], Z: ['c7', 'c8'] }),
    ]
    const model = buildPCAModel([...blockA, ...blockB], CARDS)
    const { strategies } = selectPCAStrategies(model, 0.5, 3)

    expect(strategies).toHaveLength(2)
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        expect(
          simAt(model, strategies[i].representativeIndex, strategies[j].representativeIndex)
        ).toBeLessThan(0.5)
      }
    }
  })

  it('requires at least one other participant to agree before showing a strategy', () => {
    // Three mutually distinct sorts: every vote count is 1.
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', { A: ['c1', 'c2'], B: ['c3', 'c4'], C: ['c5', 'c6'], D: ['c7', 'c8'] }),
        response('p3', { A: ['c1', 'c5'], B: ['c2', 'c6'], C: ['c3', 'c7'], D: ['c4', 'c8'] }),
      ],
      CARDS
    )
    const { strategies, votes } = selectPCAStrategies(model, 0.5, 3)
    expect([...votes]).toEqual([1, 1, 1])
    expect(strategies).toEqual([])
  })

  it('lets degenerate sorts vote but never represent', () => {
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', HALVES_RENAMED),
        response('p-lump-1', ALL_ONE_GROUP),
        response('p-lump-2', ALL_ONE_GROUP),
      ],
      CARDS
    )
    const { strategies, votes } = selectPCAStrategies(model, 0.5, 3)

    // Two identical lumpers agree with each other, so they do accrue votes...
    const lumpIndex = model.participantIds.indexOf('p-lump-1')
    expect(votes[lumpIndex]).toBe(2)
    // ...but neither is shown, and they stay in the denominator.
    expect(strategies.map((s) => s.representativeParticipantId)).not.toContain('p-lump-1')
    expect(strategies[0].totalParticipants).toBe(4)
    expect(model.degenerateCounts['all-one-group']).toBe(2)
  })

  it('drives every displayed number from the threshold', () => {
    // p3 agrees with p1 at 0.45: above the threshold at 0.3, below it at 0.5.
    // On the old code this number was frozen at a hardcoded 0.5.
    const partial = {
      A: ['c1', 'c2', 'c3'],
      B: ['c4', 'c5', 'c6'],
      C: ['c7', 'c8'],
    }
    const model = buildPCAModel(
      [response('p1', HALVES), response('p2', HALVES_RENAMED), response('p3', partial)],
      CARDS
    )
    const p1 = model.participantIds.indexOf('p1')
    const p3 = model.participantIds.indexOf('p3')
    const overlap = simAt(model, p1, p3)
    expect(overlap).toBeGreaterThan(0.3)
    expect(overlap).toBeLessThan(0.5)

    const loose = selectPCAStrategies(model, 0.3, 3)
    const strict = selectPCAStrategies(model, 0.5, 3)
    expect(loose.votes[p1]).toBe(3)
    expect(strict.votes[p1]).toBe(2)
    expect(loose.strategies[0].supportRatio).toBeGreaterThan(
      strict.strategies[0].supportRatio
    )
  })

  it('never increases any vote count as the threshold rises', () => {
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', HALVES_RENAMED),
        response('p3', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'], C: ['c7', 'c8'] }),
        response('p4', { A: ['c1', 'c2'], B: ['c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }),
        response('p5', ALL_ONE_GROUP),
      ],
      CARDS
    )
    let previous: Int32Array | null = null
    for (let t = 0.3; t <= 0.7001; t += 0.05) {
      const { votes } = selectPCAStrategies(model, t, 3)
      if (previous) {
        for (let i = 0; i < votes.length; i++) {
          expect(votes[i]).toBeLessThanOrEqual(previous[i])
        }
      }
      previous = votes
    }
  })

  it('never increases the top strategy support as the threshold rises', () => {
    // Only strategies[0] is monotone. Later strategies are not: the distinctness
    // constraint can free a higher-voted candidate at a higher threshold, so do
    // not assert monotonicity on them.
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', HALVES_RENAMED),
        response('p3', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'], C: ['c7', 'c8'] }),
        response('p4', HALVES_RENAMED_2),
      ],
      CARDS
    )
    let previous = Number.POSITIVE_INFINITY
    for (let t = 0.3; t <= 0.7001; t += 0.05) {
      const { strategies } = selectPCAStrategies(model, t, 3)
      const top = strategies[0]?.supportRatio ?? 0
      expect(top).toBeLessThanOrEqual(previous + 1e-9)
      previous = top
    }
  })

  it('handles empty, single and identical response sets', () => {
    expect(selectPCAStrategies(buildPCAModel([], CARDS), 0.5, 3).strategies).toEqual([])
    expect(
      selectPCAStrategies(buildPCAModel([response('p1', HALVES)], CARDS), 0.5, 3).strategies
    ).toEqual([])

    const identical = buildPCAModel(
      [response('p1', HALVES), response('p2', HALVES), response('p3', HALVES)],
      CARDS
    )
    const { strategies } = selectPCAStrategies(identical, 0.5, 3)
    // All three agree, so there is exactly one distinct IA to report.
    expect(strategies).toHaveLength(1)
    expect(strategies[0].supportRatio).toBe(1)
  })

  it('returns nothing when the threshold is above every pairing', () => {
    const model = buildPCAModel(
      [
        response('p1', HALVES),
        response('p2', { A: ['c1', 'c2'], B: ['c3', 'c4'], C: ['c5', 'c6'], D: ['c7', 'c8'] }),
      ],
      CARDS
    )
    expect(selectPCAStrategies(model, 0.99, 3).strategies).toEqual([])
  })
})

describe('buildPCAModel reporting', () => {
  it('reports Unclear, label-keyed and degenerate counts', () => {
    const model = buildPCAModel(
      [
        response('p1', { A: ['c1', 'c2'], B: ['c3', 'c4'], Unclear: ['c5'] }),
        {
          participant_id: 'p2',
          card_placements: { c1: 'A', c2: 'A', c3: 'B', c4: 'B', c5: 'Unclear' },
          category_assignments: { c1: 'x', c2: 'x', c3: 'y', c4: 'y', c5: '__unclear__' },
        },
        response('p3', ALL_ONE_GROUP),
      ],
      CARDS,
      { excludeUnclear: true }
    )
    expect(model.unclearExcluded).toBe(true)
    expect(model.unclearCardCount).toBe(2)
    expect(model.labelKeyedCount).toBe(2) // p1 and p3 have no persisted ids
    expect(model.degenerateCounts['all-one-group']).toBe(1)
    expect(model.truncated).toBe(0)
  })
})

describe('performPCAAnalysis', () => {
  it('wraps the two phases and preserves its previous shape', () => {
    const result = performPCAAnalysis(
      [response('p1', HALVES), response('p2', HALVES_RENAMED), response('p3', ALL_ONE_GROUP)],
      CARDS,
      PCA_TOP_STRATEGIES_COUNT,
      PCA_STRATEGY_DEFAULT_THRESHOLD
    )
    expect(result.totalParticipants).toBe(3)
    expect(result.topIAs).toHaveLength(1)
    expect(result.topIAs[0].supportRatio).toBeCloseTo(2 / 3, 10)
    expect(result.computedAt).toBeInstanceOf(Date)
  })

  it('returns an empty result for no responses', () => {
    const result = performPCAAnalysis([], CARDS)
    expect(result.topIAs).toEqual([])
    expect(result.totalParticipants).toBe(0)
  })
})
