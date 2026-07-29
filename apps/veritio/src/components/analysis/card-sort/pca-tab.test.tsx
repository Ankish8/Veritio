import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PCATab } from './pca-tab'

const CARD_IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']
const CARDS = CARD_IDS.map((id) => ({ id, label: `Card ${id.slice(1)}` }))

function response(participantId: string, groups: Record<string, string[]>) {
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

const HALVES = { Billing: ['c1', 'c2', 'c3', 'c4'], Reports: ['c5', 'c6', 'c7', 'c8'] }

/** Five participants agree on halves; three sort differently from everyone. */
const RESPONSES = [
  response('11111111-1111-1111-1111-111111111111', HALVES),
  response('22222222-2222-2222-2222-222222222222', HALVES),
  response('33333333-3333-3333-3333-333333333333', HALVES),
  response('44444444-4444-4444-4444-444444444444', { A: ['c1', 'c2', 'c3', 'c4'], B: ['c5', 'c6', 'c7', 'c8'] }),
  response('55555555-5555-5555-5555-555555555555', { X: ['c1', 'c2', 'c3', 'c4'], Y: ['c5', 'c6', 'c7', 'c8'] }),
  response('66666666-6666-6666-6666-666666666666', { A: ['c1', 'c8'], B: ['c2', 'c7'], C: ['c3', 'c6'], D: ['c4', 'c5'] }),
  response('77777777-7777-7777-7777-777777777777', { A: ['c2', 'c8'], B: ['c1', 'c3'], C: ['c4', 'c7'], D: ['c5', 'c6'] }),
  response('88888888-8888-8888-8888-888888888888', { A: ['c3', 'c8'], B: ['c2', 'c4'], C: ['c1', 'c5'], D: ['c6', 'c7'] }),
]

const PARTICIPANTS = RESPONSES.map((r) => ({ id: r.participant_id }))

describe('PCATab', () => {
  const markup = renderToStaticMarkup(
    <PCATab cards={CARDS} responses={RESPONSES} participants={PARTICIPANTS} />
  )

  it('shows the same agreement count on the strategy card and the participant card', () => {
    // The defect this pins: the strategy card used asymmetric containment at a
    // hardcoded 0.5 while the participant card used symmetric Jaccard at its own
    // hardcoded 0.5, so the same participant could read 67% here and 1/3 there.
    // Five of eight participants share the leading structure.
    expect(markup).toContain('5/8 participants')
    expect(markup).toContain('Similar IAs: 5/8')
  })

  it('never renders a participant identifier', () => {
    for (const participant of PARTICIPANTS) {
      expect(markup).not.toContain(participant.id)
    }
    expect(markup).toContain('Participant 1')
  })

  it('labels the averaged groups as built from the supporters', () => {
    expect(markup).toContain('Billing')
    expect(markup).toContain('participants behind this strategy')
  })

  it('states what the analysis is based on', () => {
    expect(markup).toContain('Based on 8 responses')
  })

  it('hides strategies but keeps the individual sorts when there are too few responses', () => {
    const sparse = renderToStaticMarkup(
      <PCATab
        cards={CARDS}
        responses={RESPONSES.slice(0, 3)}
        participants={PARTICIPANTS.slice(0, 3)}
      />
    )
    expect(sparse).toContain('Exploratory only')
    expect(sparse).not.toContain('participants behind this strategy')
    expect(sparse).toContain('Individual Participant IAs')
  })

  it('renders the empty state with no responses', () => {
    const empty = renderToStaticMarkup(<PCATab cards={CARDS} responses={[]} />)
    expect(empty).toContain('No responses yet')
  })
})
