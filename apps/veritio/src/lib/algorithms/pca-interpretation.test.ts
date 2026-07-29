import { describe, it, expect } from 'vitest'
import { interpretPCA, strategyStability } from './pca-interpretation'
import {
  buildPCAModel,
  selectPCAStrategies,
  simAt,
  type PCAResponseInput,
} from './pca-analysis'

const CARD_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
const CARDS = CARD_IDS.map((id) => ({ id, label: `Card ${id.slice(1)}` }))

function response(
  participantId: string,
  groups: Record<string, string[]>
): PCAResponseInput {
  const card_placements: Record<string, string> = {}
  const category_assignments: Record<string, string> = {}
  Object.entries(groups).forEach(([label, cardIds], groupIndex) => {
    for (const cardId of cardIds) {
      card_placements[cardId] = label
      category_assignments[cardId] = `g${groupIndex}`
    }
  })
  return { participant_id: participantId, card_placements, category_assignments }
}

const HALVES = { A: ['c1', 'c2', 'c3', 'c4'], B: ['c5', 'c6', 'c7', 'c8'] }
const QUARTERS = {
  P: ['c1', 'c2'],
  Q: ['c3', 'c4'],
  R: ['c5', 'c6'],
  S: ['c7', 'c8'],
}

/** `count` participants who all sorted the same way. */
function bloc(prefix: string, count: number, groups: Record<string, string[]>) {
  return Array.from({ length: count }, (_, i) => response(`${prefix}${i}`, groups))
}

function analyze(responses: PCAResponseInput[], threshold = 0.5) {
  const model = buildPCAModel(responses, CARDS)
  const selection = selectPCAStrategies(model, threshold, 3)
  return { model, selection }
}

const ids = (responses: PCAResponseInput[], threshold = 0.5) => {
  const { model, selection } = analyze(responses, threshold)
  return interpretPCA({ model, selection }).map((g) => g.ruleId)
}

describe('interpretPCA', () => {
  it('calls a three-response study exploratory', () => {
    expect(ids(bloc('a', 3, HALVES))).toContain('low-n-exploratory')
  })

  it('calls a mid-sized study provisional', () => {
    const rules = ids(bloc('a', 12, HALVES))
    expect(rules).toContain('low-n-provisional')
    expect(rules).not.toContain('low-n-exploratory')
  })

  it('says nothing about sample size at 30 or more', () => {
    const rules = ids(bloc('a', 30, HALVES))
    expect(rules).not.toContain('low-n-provisional')
    expect(rules).not.toContain('low-n-exploratory')
  })

  it('reports one clear model when a single sort dominates', () => {
    const rules = ids([...bloc('a', 30, HALVES), ...bloc('b', 4, QUARTERS)])
    expect(rules).toContain('single-model-strong')
    expect(rules).not.toContain('multiple-models')
    expect(rules).not.toContain('no-dominant-model')
  })

  it('reports competing models when two blocs each hold up', () => {
    const rules = ids([...bloc('a', 18, HALVES), ...bloc('b', 16, QUARTERS)])
    expect(rules).toContain('multiple-models')
    expect(rules).not.toContain('single-model-strong')
  })

  it('refuses to imply consensus when nothing dominates', () => {
    // A 1-factorization of the 8 cards: seven pairings that between them use each
    // of the 28 possible card pairs exactly once, so no two participants share a
    // single pair. Plus two coarser sorts that overlap the pairings only lightly.
    const distinct = [
      response('p1', { A: ['c1', 'c8'], B: ['c2', 'c7'], C: ['c3', 'c6'], D: ['c4', 'c5'] }),
      response('p2', { A: ['c2', 'c8'], B: ['c1', 'c3'], C: ['c4', 'c7'], D: ['c5', 'c6'] }),
      response('p3', { A: ['c3', 'c8'], B: ['c2', 'c4'], C: ['c1', 'c5'], D: ['c6', 'c7'] }),
      response('p4', { A: ['c4', 'c8'], B: ['c3', 'c5'], C: ['c2', 'c6'], D: ['c1', 'c7'] }),
      response('p5', { A: ['c5', 'c8'], B: ['c4', 'c6'], C: ['c3', 'c7'], D: ['c1', 'c2'] }),
      response('p6', { A: ['c6', 'c8'], B: ['c5', 'c7'], C: ['c1', 'c4'], D: ['c2', 'c3'] }),
      response('p7', { A: ['c7', 'c8'], B: ['c1', 'c6'], C: ['c2', 'c5'], D: ['c3', 'c4'] }),
      response('p8', HALVES),
      response('p9', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'], C: ['c7', 'c8'] }),
    ]

    const { model, selection } = analyze(distinct)

    // The fixture's premise, asserted rather than assumed.
    for (let i = 0; i < model.totalParticipants; i++) {
      for (let j = i + 1; j < model.totalParticipants; j++) {
        expect(simAt(model, i, j)).toBeLessThan(0.5)
      }
    }
    expect(selection.strategies).toEqual([])

    const guidance = interpretPCA({ model, selection })
    expect(guidance.map((g) => g.ruleId)).toContain('no-dominant-model')
    expect(guidance.find((g) => g.ruleId === 'no-dominant-model')?.severity).toBe('warn')
    expect(guidance.map((g) => g.ruleId)).not.toContain('single-model-strong')
  })

  it('flags a high share of unusable responses', () => {
    const rules = ids([
      ...bloc('a', 10, HALVES),
      ...bloc('lump', 4, { Everything: CARD_IDS }),
    ])
    expect(rules).toContain('noisy-responses')
  })

  it('stays quiet about noise when the share is small', () => {
    const rules = ids([...bloc('a', 30, HALVES), ...bloc('lump', 1, { All: CARD_IDS })])
    expect(rules).not.toContain('noisy-responses')
  })

  it('warns when leave-one-out shows the ranking is fragile', () => {
    const { model, selection } = analyze(bloc('a', 12, HALVES))
    const guidance = interpretPCA({
      model,
      selection,
      stability: { score: 0.2, runs: 12, computed: true },
    })
    expect(guidance.map((g) => g.ruleId)).toContain('unstable-result')
  })

  it('does not warn about stability when it was not computed', () => {
    const { model, selection } = analyze(bloc('a', 12, HALVES))
    const guidance = interpretPCA({
      model,
      selection,
      stability: { score: 0, runs: 0, computed: false },
    })
    expect(guidance.map((g) => g.ruleId)).not.toContain('unstable-result')
  })
})

describe('strategyStability', () => {
  it('reports a stable result when many participants agree', () => {
    const model = buildPCAModel(bloc('a', 12, HALVES), CARDS)
    const stability = strategyStability(model, 0.5)
    expect(stability.computed).toBe(true)
    expect(stability.runs).toBe(12)
    expect(stability.score).toBe(1)
  })

  it('reports instability when the winner hinges on one participant', () => {
    // Two rival pairs. Removing one member of the winning pair flips the winner
    // to the other structure.
    const model = buildPCAModel(
      [
        ...bloc('a', 2, HALVES),
        ...bloc('b', 2, QUARTERS),
        response('c0', { A: ['c1', 'c3'], B: ['c2', 'c4'], C: ['c5', 'c7'], D: ['c6', 'c8'] }),
      ],
      CARDS
    )
    const stability = strategyStability(model, 0.5)
    expect(stability.computed).toBe(true)
    expect(stability.score).toBeLessThan(1)
  })

  it('skips the computation when there is nothing to leave out', () => {
    const model = buildPCAModel(bloc('a', 2, HALVES), CARDS)
    expect(strategyStability(model, 0.5).computed).toBe(false)
  })

  it('reports not-computed when no strategy exists at all', () => {
    const distinct = [
      response('p1', HALVES),
      response('p2', QUARTERS),
      response('p3', { A: ['c1', 'c5'], B: ['c2', 'c6'], C: ['c3', 'c7'], D: ['c4', 'c8'] }),
    ]
    const model = buildPCAModel(distinct, CARDS)
    expect(strategyStability(model, 0.5).computed).toBe(false)
  })
})
