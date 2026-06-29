'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Interactive take on the real "Card Sort": the participant's task is to sort
// loose cards into categories. Here the visitor drags each navigation card
// (Pricing, API Docs, …) into a category column (Products / Support / Resources)
// using pointer events so it works on touch too. As cards land, a live footer
// echoes the real analysis (agreement/similarity climbs and "X of 5 sorted"
// updates). Once every card is placed, the columns swap out for a compact
// ANALYSIS view that mirrors the real Veritio Card Sort results: an overall
// agreement score, categories-used stat, and a per-category breakdown with
// score-shaded bars showing how the visitor's grouping compares to consensus.
// A reset returns to the draggable state.
//
// Reduced-motion / SSR fallback: cards render already placed in their columns
// (the original static look) with no drag affordances and no hydration shift.

type CatId = 'products' | 'support' | 'resources'
type Location = 'pile' | CatId

type Card = { id: string; label: string }

type Category = { id: CatId; name: string; color: string }

const CARDS: Card[] = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'api-docs', label: 'API Docs' },
  { id: 'help-center', label: 'Help Center' },
  { id: 'contact-us', label: 'Contact Us' },
  { id: 'blog', label: 'Blog' },
]

const CATEGORIES: Category[] = [
  { id: 'products', name: 'Products', color: 'var(--accent)' },
  { id: 'support', name: 'Support', color: 'var(--green)' },
  { id: 'resources', name: 'Resources', color: 'var(--orange)' },
]

// The consensus sort the agreement score is measured against: for each card,
// the category most participants placed it in, plus the share that agreed.
// (Stable, plausible numbers from a 24-response study; nothing fabricated as
// "live" data, this is the demo's fixed reference cohort.)
const CONSENSUS: Record<string, { cat: CatId; share: number }> = {
  pricing: { cat: 'products', share: 92 },
  'api-docs': { cat: 'products', share: 79 },
  'help-center': { cat: 'support', share: 88 },
  'contact-us': { cat: 'support', share: 75 },
  blog: { cat: 'resources', share: 83 },
}

const EXPECTED: Record<string, CatId> = Object.fromEntries(
  Object.entries(CONSENSUS).map(([id, v]) => [id, v.cat])
) as Record<string, CatId>

const CONSENSUS_RESPONSES = 24

const ALL_IN_PILE: Record<string, Location> = Object.fromEntries(
  CARDS.map((c) => [c.id, 'pile' as Location])
)

type GhostState = {
  cardId: string
  label: string
  x: number
  y: number
  w: number
}

export default function CardSortDemo() {
  const [interactive, setInteractive] = useState(false)
  const [placement, setPlacement] = useState<Record<string, Location>>(ALL_IN_PILE)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  const [hoverCol, setHoverCol] = useState<CatId | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  // Live drag bookkeeping kept in a ref so pointer handlers stay stable.
  const dragRef = useRef<{
    cardId: string
    label: string
    offX: number
    offY: number
    w: number
    pointerId: number
  } | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  const placeCard = useCallback((cardId: string, loc: Location) => {
    setPlacement((prev) => (prev[cardId] === loc ? prev : { ...prev, [cardId]: loc }))
  }, [])

  // Which category column sits under a viewport point (null = none / pile).
  const colAtPoint = useCallback((clientX: number, clientY: number): CatId | null => {
    const root = rootRef.current
    if (!root) return null
    const cols = root.querySelectorAll<HTMLElement>('[data-col]')
    for (const col of cols) {
      const r = col.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return (col.dataset.col as CatId) ?? null
      }
    }
    return null
  }, [])

  useEffect(() => {
    if (!interactive || !ghost) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || e.pointerId !== drag.pointerId) return
      const root = rootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      // Clamp the ghost so it can never escape the showcase card.
      const x = Math.min(
        Math.max(e.clientX - rect.left - drag.offX, 0),
        Math.max(rect.width - drag.w, 0)
      )
      const y = Math.min(
        Math.max(e.clientY - rect.top - drag.offY, 0),
        Math.max(rect.height - 32, 0)
      )
      setGhost((g) => (g ? { ...g, x, y } : g))
      setHoverCol(colAtPoint(e.clientX, e.clientY))
    }

    const finish = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || e.pointerId !== drag.pointerId) return
      const target = colAtPoint(e.clientX, e.clientY)
      placeCard(drag.cardId, target ?? 'pile')
      dragRef.current = null
      setGhost(null)
      setHoverCol(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [interactive, ghost, colAtPoint, placeCard])

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, card: Card) => {
      if (!interactive || dragRef.current) return
      e.preventDefault()
      const root = rootRef.current
      const el = e.currentTarget
      if (!root) return
      const rect = root.getBoundingClientRect()
      const cardRect = el.getBoundingClientRect()
      dragRef.current = {
        cardId: card.id,
        label: card.label,
        offX: e.clientX - cardRect.left,
        offY: e.clientY - cardRect.top,
        w: cardRect.width,
        pointerId: e.pointerId,
      }
      setGhost({
        cardId: card.id,
        label: card.label,
        x: cardRect.left - rect.left,
        y: cardRect.top - rect.top,
        w: cardRect.width,
      })
    },
    [interactive]
  )

  const reset = useCallback(() => {
    dragRef.current = null
    setGhost(null)
    setHoverCol(null)
    setPlacement(ALL_IN_PILE)
  }, [])

  // For the static (reduced-motion / SSR) render, show cards already placed by
  // their expected category so the demo reads exactly like the old static card.
  const effective: Record<string, Location> = interactive ? placement : EXPECTED

  const pileCards = CARDS.filter((c) => effective[c.id] === 'pile')
  const sortedCount = CARDS.length - pileCards.length
  const complete = sortedCount === CARDS.length

  // Agreement score, echoing the real analysis: share of placed cards that
  // landed in the category most participants would pick. Climbs as you sort.
  const correct = CARDS.filter(
    (c) => effective[c.id] !== 'pile' && effective[c.id] === EXPECTED[c.id]
  ).length
  const agreement = sortedCount === 0 ? 0 : Math.round((correct / sortedCount) * 100)

  // Per-category analysis, mirroring the real results: for each category the
  // visitor used, what they put there and the agreement of that grouping with
  // consensus (mean consensus share of cards correctly placed in this column).
  const analysis = CATEGORIES.map((cat) => {
    const placedHere = CARDS.filter((c) => effective[c.id] === cat.id)
    const onConsensus = placedHere.filter((c) => EXPECTED[c.id] === cat.id)
    const score =
      onConsensus.length === 0
        ? 0
        : Math.round(
            onConsensus.reduce((s, c) => s + CONSENSUS[c.id].share, 0) / placedHere.length
          )
    return { cat, placedHere, onConsensus, score }
  }).filter((a) => a.placedHere.length > 0)

  const categoriesUsed = analysis.length

  // The analysis panel is an interactive-only payoff. The static (SSR /
  // reduced-motion) render keeps its original look: columns with cards
  // pre-placed and a static agreement footer.
  const showAnalysis = interactive && complete

  const rootClass = `showcase-mockup-inner csd-demo${interactive ? '' : ' is-static'}${showAnalysis ? ' is-analysis' : ''}`
  const footClass = `csd-foot${complete ? ' is-complete' : ''}`

  // Score banding, matching results-overview.tsx (emerald / amber / red).
  const scoreClass = (s: number) =>
    s >= 80 ? 'is-high' : s >= 60 ? 'is-mid' : s >= 40 ? 'is-low' : 'is-poor'

  const renderCard = (card: Card, inCol: boolean) => {
    const dragging = ghost?.cardId === card.id
    return (
      <div
        key={card.id}
        className={`csd-card${inCol ? ' in-col' : ''}${dragging ? ' is-dragging-src' : ''}`}
        onPointerDown={interactive ? (e) => startDrag(e, card) : undefined}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? `Drag ${card.label} into a category` : undefined}
      >
        {interactive && (
          <span className="csd-card-grip" aria-hidden="true">
            <i /><i /><i />
          </span>
        )}
        {card.label}
      </div>
    )
  }

  return (
    <div ref={rootRef} className={rootClass}>
      <div className="csd-head">
        <div className="csd-title">Navigation Card Sort</div>
        <div className="csd-meta">5 cards &middot; 3 categories</div>
      </div>

      {/* Sorting board (pile + columns). Once every card is placed (interactive
          only) it swaps out for the analysis panel below. */}
      {!showAnalysis && (
      <>
      {/* Unsorted pile */}
      <div className="csd-pile">
        <div className="csd-pile-label">
          Unsorted
          {interactive && pileCards.length > 0 && (
            <span className="csd-pile-count">{pileCards.length}</span>
          )}
        </div>
        {pileCards.length > 0 ? (
          <div className="csd-pile-cards">{pileCards.map((c) => renderCard(c, false))}</div>
        ) : (
          <div className="csd-pile-empty">
            {interactive ? 'All cards sorted. Nice.' : 'Drag a card into a category'}
          </div>
        )}
      </div>

      {/* Category columns */}
      <div className="csd-cols">
        {CATEGORIES.map((cat) => {
          const cards = CARDS.filter((c) => effective[c.id] === cat.id)
          const isOver = hoverCol === cat.id
          return (
            <div
              key={cat.id}
              data-col={cat.id}
              className={`csd-col${isOver ? ' is-over' : ''}`}
            >
              <div className="csd-col-head" style={{ color: cat.color }}>
                <span className="csd-col-dot" style={{ background: cat.color }} />
                {cat.name}
                {cards.length > 0 && <span className="csd-col-cnt">{cards.length}</span>}
              </div>
              <div className="csd-col-cards">
                {cards.length > 0 ? (
                  cards.map((c) => renderCard(c, true))
                ) : (
                  <div className="csd-col-hint">{isOver ? 'Drop here' : 'Drop cards'}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}

      {/* Analysis panel: appears once all cards are placed. Mirrors the real
          Veritio Card Sort results (overall agreement, categories used, and a
          per-category breakdown shaded by consensus agreement). */}
      {showAnalysis && (
        <div className="csd-analysis" role="region" aria-label="Card sort results">
          <div className="csd-an-stats">
            <div className="csd-an-stat">
              <span className={`csd-an-stat-num ${scoreClass(agreement)}`}>{agreement}%</span>
              <span className="csd-an-stat-lbl">Overall agreement</span>
            </div>
            <div className="csd-an-stat">
              <span className="csd-an-stat-num">{categoriesUsed}</span>
              <span className="csd-an-stat-lbl">Categories used</span>
            </div>
            <div className="csd-an-stat">
              <span className="csd-an-stat-num">{CARDS.length}</span>
              <span className="csd-an-stat-lbl">Cards sorted</span>
            </div>
          </div>

          <div className="csd-an-breakdown">
            {analysis.map(({ cat, placedHere, onConsensus, score }) => (
              <div key={cat.id} className="csd-an-row">
                <div className="csd-an-row-head">
                  <span className="csd-an-cat">
                    <span className="csd-col-dot" style={{ background: cat.color }} />
                    {cat.name}
                  </span>
                  <span className={`csd-an-score ${scoreClass(score)}`}>{score}%</span>
                </div>
                <div className="csd-an-bar">
                  <div
                    className={`csd-an-bar-fill ${scoreClass(score)}`}
                    style={{ width: `${Math.max(score, 4)}%` }}
                  />
                </div>
                <div className="csd-an-chips">
                  {placedHere.map((c) => {
                    const agreed = onConsensus.includes(c)
                    return (
                      <span
                        key={c.id}
                        className={`csd-an-chip${agreed ? '' : ' is-off'}`}
                        title={
                          agreed
                            ? `${CONSENSUS[c.id].share}% of participants agree`
                            : `Most put this in ${
                                CATEGORIES.find((x) => x.id === EXPECTED[c.id])?.name
                              }`
                        }
                      >
                        {c.label}
                        {!agreed && <span className="csd-an-chip-flag" aria-hidden="true">≠</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="csd-an-legend" aria-hidden="true">
            <span>Low agreement</span>
            <span className="csd-an-legend-bar">
              <i className="is-poor" /><i className="is-low" /><i className="is-mid" /><i className="is-high" />
            </span>
            <span>High</span>
          </div>
        </div>
      )}

      {/* Result footer. While sorting it shows live progress; once complete it
          becomes a slim caption (the score now lives in the analysis panel)
          with the "Sort again" reset. */}
      <div className={footClass}>
        {showAnalysis ? (
          // Interactive, all cards placed: slim caption + reset (the score and
          // breakdown live in the analysis panel above).
          <div className="csd-foot-done">
            <span className="csd-foot-note">
              <span className="csd-foot-dot" aria-hidden="true" />
              Compared with {CONSENSUS_RESPONSES} responses
            </span>
            <button type="button" className="csd-reset" onClick={reset}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
              </svg>
              Sort again
            </button>
          </div>
        ) : !interactive ? (
          // Static (SSR / reduced-motion): original agreement footer, unchanged.
          <>
            <div className="csd-foot-top">
              <span className="csd-foot-label">
                <span className="csd-foot-dot" aria-hidden="true" />
                Agreement score
              </span>
              <span className="csd-foot-score">
                <b>89%</b> agreement
              </span>
            </div>
            <div className="csd-progress" aria-hidden="true">
              <div className="csd-progress-fill" style={{ width: '100%' }} />
            </div>
            <div className="csd-foot-bottom">
              <span className="csd-foot-note">Based on {CONSENSUS_RESPONSES} responses</span>
            </div>
          </>
        ) : (
          // Interactive, mid-sort: live progress.
          <>
            <div className="csd-foot-top">
              <span className="csd-foot-label">
                <span className="csd-foot-dot" aria-hidden="true" />
                Sorting progress
              </span>
              <span className="csd-foot-score">
                {sortedCount} of {CARDS.length} sorted
              </span>
            </div>
            <div className="csd-progress" aria-hidden="true">
              <div
                className="csd-progress-fill"
                style={{ width: `${(sortedCount / CARDS.length) * 100}%` }}
              />
            </div>
            <div className="csd-foot-bottom">
              <span className="csd-foot-note">Drag every card to see the analysis</span>
              {sortedCount > 0 && (
                <button type="button" className="csd-reset" onClick={reset}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                  </svg>
                  Reset
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drag overlay: the ghost card follows the pointer */}
      {interactive && ghost && (
        <div className="csd-overlay" aria-hidden="true">
          <div
            className="csd-card is-ghost"
            style={{ left: ghost.x, top: ghost.y, width: ghost.w }}
          >
            <span className="csd-card-grip">
              <i /><i /><i />
            </span>
            {ghost.label}
          </div>
        </div>
      )}
    </div>
  )
}
