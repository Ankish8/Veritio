import { describe, it, expect } from 'vitest'
import { contestedCards, synthesizeConsensusIA } from './consensus-ia'
import {
  buildPCAModel,
  calculateIASimilarity,
  selectPCAStrategies,
  type PCAResponseInput,
  type ParticipantIA,
} from './pca-analysis'

const CARD_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']
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

/** Six supporters agree on {c1,c2,c3} / {c4,c5,c6}; three scramble it. */
const AGREEING = [
  response('a1', { Billing: ['c1', 'c2', 'c3'], Reports: ['c4', 'c5', 'c6'] }),
  response('a2', { Billing: ['c1', 'c2', 'c3'], Reports: ['c4', 'c5', 'c6'] }),
  response('a3', { Payments: ['c1', 'c2', 'c3'], Reports: ['c4', 'c5', 'c6'] }),
  response('a4', { Billing: ['c1', 'c2', 'c3'], Analytics: ['c4', 'c5', 'c6'] }),
  response('a5', { Billing: ['c1', 'c2', 'c3'], Reports: ['c4', 'c5', 'c6'] }),
  response('a6', { Billing: ['c1', 'c2', 'c3'], Reports: ['c4', 'c5', 'c6'] }),
]

function iasFor(responses: PCAResponseInput[]): ParticipantIA[] {
  return buildPCAModel(responses, CARDS).ias
}

describe('synthesizeConsensusIA', () => {
  it('reproduces the structure the supporters share', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)

    expect(consensus).not.toBeNull()
    expect(consensus!.groupCount).toBe(2)

    const groups = consensus!.groups
      .map((g) => g.cards.map((c) => c.cardId).sort().join(','))
      .sort()
    expect(groups).toEqual(['c1,c2,c3', 'c4,c5,c6'])
  })

  it('never scores worse than the representative it replaces', () => {
    // The whole justification for synthesizing. If the heuristic cut loses, the
    // module must fall back rather than show a worse structure.
    const members = iasFor([
      ...AGREEING,
      response('b1', { A: ['c1', 'c4'], B: ['c2', 'c5'], C: ['c3', 'c6'] }),
      response('b2', { A: ['c1', 'c5'], B: ['c2', 'c6'], C: ['c3', 'c4'] }),
    ])
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)
    expect(consensus).not.toBeNull()
    expect(consensus!.meanAgreement).toBeGreaterThanOrEqual(
      consensus!.representativeAgreement - 1e-9
    )
  })

  it('votes on group names from the supporters, with runners-up', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!

    const billing = consensus.groups.find((g) => g.cards.some((c) => c.cardId === 'c1'))!
    expect(billing.label).toBe('Billing')
    expect(billing.labelSupport).toBe(5) // 5 of 6 said Billing
    expect(billing.alternativeLabels.map((a) => a.label)).toEqual(['Payments'])

    const reports = consensus.groups.find((g) => g.cards.some((c) => c.cardId === 'c4'))!
    expect(reports.label).toBe('Reports')
    expect(reports.alternativeLabels.map((a) => a.label)).toEqual(['Analytics'])
  })

  it('gives unanimously grouped cards full confidence', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    for (const group of consensus.groups) {
      for (const card of group.cards) {
        expect(card.confidence).toBe(1)
      }
    }
    expect(consensus.lowConfidenceCardIds).toEqual([])
  })

  it('marks a card the supporters disagree about as low confidence', () => {
    // c3 goes with the first group for four supporters and the second for two.
    const split = [
      response('a1', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'] }),
      response('a2', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'] }),
      response('a3', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'] }),
      response('a4', { A: ['c1', 'c2', 'c3'], B: ['c4', 'c5', 'c6'] }),
      response('a5', { A: ['c1', 'c2'], B: ['c3', 'c4', 'c5', 'c6'] }),
      response('a6', { A: ['c1', 'c2'], B: ['c3', 'c4', 'c5', 'c6'] }),
    ]
    const members = iasFor(split)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!

    const c3 = consensus.groups.flatMap((g) => g.cards).find((c) => c.cardId === 'c3')!
    const c1 = consensus.groups.flatMap((g) => g.cards).find((c) => c.cardId === 'c1')!
    expect(c3.confidence).toBeLessThan(c1.confidence)
  })

  it('reports the range of group counts the supporters actually used', () => {
    const members = iasFor([
      ...AGREEING,
      response('a7', { A: ['c1', 'c2'], B: ['c3', 'c4'], C: ['c5', 'c6'] }),
    ])
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    expect(consensus.memberGroupCountRange).toEqual([2, 3])
    // Median of [2,2,2,2,2,2,3] is 2, so the consensus uses a granularity the
    // supporters would recognize rather than whatever an elbow suggests.
    expect(consensus.groupCount).toBe(2)
  })

  it('links the closest real participant', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    expect(members.map((m) => m.participantId)).toContain(consensus.closestParticipantId)
  })

  it('refuses to synthesize from fewer than three supporters', () => {
    const members = iasFor(AGREEING.slice(0, 2))
    expect(synthesizeConsensusIA('ia-1', members[0], members, CARDS)).toBeNull()
  })

  it('does not invent a group from cards nobody sorted', () => {
    const partial = [
      response('a1', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
      response('a2', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
      response('a3', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
    ]
    const members = iasFor(partial)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    const placed = consensus.groups.flatMap((g) => g.cards.map((c) => c.cardId)).sort()
    expect(placed).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('keeps two cards sharing a display label apart', () => {
    // buildDendrogram keys leaves by label, so passing display labels instead of
    // ids would collapse these two into one leaf.
    const duplicateLabelCards = [
      { id: 'c1', label: 'Reports' },
      { id: 'c2', label: 'Reports' },
      { id: 'c3', label: 'Billing' },
      { id: 'c4', label: 'Invoices' },
    ]
    const responses = [
      response('a1', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
      response('a2', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
      response('a3', { A: ['c1', 'c2'], B: ['c3', 'c4'] }),
    ]
    const members = buildPCAModel(responses, duplicateLabelCards).ias
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, duplicateLabelCards)!
    const allCardIds = consensus.groups.flatMap((g) => g.cards.map((c) => c.cardId)).sort()
    expect(allCardIds).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('agrees with the reference metric on its own output', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    const asIA: ParticipantIA = {
      participantId: 'check',
      categories: consensus.groups.map((g) => ({
        name: g.label,
        cardIds: g.cards.map((c) => c.cardId),
        cardLabels: g.cards.map((c) => c.label),
        cardIdSet: new Set(g.cards.map((c) => c.cardId)),
      })),
      pairCount: consensus.groups.reduce(
        (sum, g) => sum + (g.cards.length * (g.cards.length - 1)) / 2,
        0
      ),
      placedCardCount: consensus.groups.reduce((sum, g) => sum + g.cards.length, 0),
      hasCategoryIdentity: true,
      unclearCardCount: 0,
      degeneracy: null,
    }
    // Every supporter in this fixture shares the consensus structure exactly.
    for (const member of members) {
      expect(calculateIASimilarity(asIA, member)).toBe(1)
    }
  })
})

describe('contestedCards', () => {
  it('ranks the cards no strategy placed confidently', () => {
    const responses = [
      ...AGREEING,
      response('b1', { A: ['c1', 'c4'], B: ['c2', 'c5'], C: ['c3', 'c6'] }),
      response('b2', { A: ['c1', 'c4'], B: ['c2', 'c5'], C: ['c3', 'c6'] }),
      response('b3', { A: ['c1', 'c4'], B: ['c2', 'c5'], C: ['c3', 'c6'] }),
    ]
    const model = buildPCAModel(responses, CARDS)
    const { strategies } = selectPCAStrategies(model, 0.5, 3)
    const byId = new Map(model.ias.map((ia) => [ia.participantId, ia]))

    const consensuses = strategies
      .map((s) =>
        synthesizeConsensusIA(
          s.id,
          model.ias[s.representativeIndex],
          s.supportingParticipantIds.map((id) => byId.get(id) as ParticipantIA),
          CARDS
        )
      )
      .filter((c): c is NonNullable<typeof c> => c !== null)

    const contested = contestedCards(consensuses)
    for (const card of contested) {
      expect(card.contention).toBeGreaterThan(0)
      expect(card.contention).toBeLessThanOrEqual(1)
    }
    // Sorted by contention, most contested first.
    for (let i = 1; i < contested.length; i++) {
      expect(contested[i - 1].contention).toBeGreaterThanOrEqual(contested[i].contention)
    }
  })

  it('reports nothing when every card is placed unanimously', () => {
    const members = iasFor(AGREEING)
    const consensus = synthesizeConsensusIA('ia-1', members[0], members, CARDS)!
    expect(contestedCards([consensus])).toEqual([])
  })
})
