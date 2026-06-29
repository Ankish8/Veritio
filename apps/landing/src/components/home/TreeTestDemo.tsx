'use client'

import { useEffect, useRef, useState } from 'react'

// Mirrors the real "Tree Test": participants get a findability task and click
// through a text-only navigation tree (no site visuals, just labels) to locate
// where an item lives. We track the path they take. Selecting the correct leaf
// completes the task successfully; committing a wrong leaf records a miss. The
// results view mirrors the product's Tree Test analysis — the path breadcrumb
// (Direct vs Indirect), aggregate Success / Directness / Avg time, an overall
// Findability score (0-10 with a letter grade, Treejack-style), and a
// destinations breakdown of where participants ended up.

type TreeNode = {
  id: string
  label: string
  children?: TreeNode[]
}

// The correct destination for the task "Where would you go to find pricing?"
const CORRECT_ID = 'plans-pricing'

const TREE: TreeNode[] = [
  {
    id: 'products',
    label: 'Products',
    children: [
      { id: 'plans-pricing', label: 'Plans & Pricing' },
      { id: 'features', label: 'Features' },
      { id: 'integrations', label: 'Integrations' },
    ],
  },
  {
    id: 'solutions',
    label: 'Solutions',
    children: [
      { id: 'startups', label: 'For startups' },
      { id: 'enterprise', label: 'For enterprise' },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    children: [
      { id: 'blog', label: 'Blog' },
      { id: 'help', label: 'Help center' },
    ],
  },
  { id: 'about', label: 'About' },
]

// Flat lookup of every node's parent label, used to build the breadcrumb and
// detect whether a chosen leaf was the correct one.
const PARENT_LABEL: Record<string, string> = {}
TREE.forEach((n) => {
  if (n.children) n.children.forEach((c) => (PARENT_LABEL[c.id] = n.label))
})

// Aggregate sample data shown alongside the participant's own run. These mirror
// what the real Tree Test analysis reports across a small study. Honest, fixed
// numbers — the live participant adds one more run on top of these.
const AGG_SUCCESS = 88 // % who landed on the correct node
const AGG_DIRECTNESS = 72 // % who got there without backtracking

// Treejack-standard findability formula: (success x 0.75) + (directness x 0.25),
// expressed on a 0-10 scale. Matches apps/veritio findability-score.ts grading.
function findabilityScore(successPct: number, directnessPct: number): number {
  return ((successPct / 100) * 0.75 + (directnessPct / 100) * 0.25) * 10
}
function findabilityGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 8) return 'A'
  if (score >= 7) return 'B'
  if (score >= 6) return 'C'
  return 'D'
}

// Where participants ended up (destinations breakdown). Correct first, then the
// two most common wrong nodes — a signature of the real tool.
const DESTINATIONS = [
  { label: 'Plans & Pricing', pct: 88, correct: true },
  { label: 'Solutions / For startups', pct: 7, correct: false },
  { label: 'Resources / Help center', pct: 5, correct: false },
]

type Phase = 'navigate' | 'result'

type Visit = { id: string; label: string }

const aggScore = findabilityScore(AGG_SUCCESS, AGG_DIRECTNESS)
const aggGrade = findabilityGrade(aggScore)

export default function TreeTestDemo() {
  const [interactive, setInteractive] = useState(false)
  const [phase, setPhase] = useState<Phase>('navigate')
  const [openId, setOpenId] = useState<string | null>(null)
  const [path, setPath] = useState<Visit[]>([])
  const [chosen, setChosen] = useState<Visit | null>(null)
  const [success, setSuccess] = useState(false)
  const [time, setTime] = useState('0:00')
  const timerRef = useRef<number>(0)
  const secsRef = useRef<number>(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  // Run the task timer while the participant is navigating.
  useEffect(() => {
    if (!interactive || phase !== 'navigate') return
    secsRef.current = 0
    setTime('0:00')
    timerRef.current = window.setInterval(() => {
      secsRef.current += 1
      const s = secsRef.current
      setTime(`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`)
    }, 1000)
    return () => window.clearInterval(timerRef.current)
  }, [interactive, phase])

  const reset = () => {
    setPhase('navigate')
    setOpenId(null)
    setPath([])
    setChosen(null)
    setSuccess(false)
  }

  const toggleParent = (node: TreeNode) => {
    setOpenId((cur) => (cur === node.id ? null : node.id))
    setPath((p) =>
      p.length && p[p.length - 1].id === node.id ? p : [...p, { id: node.id, label: node.label }],
    )
  }

  const selectLeaf = (node: TreeNode) => {
    const visit: Visit = { id: node.id, label: node.label }
    setPath((p) => [...p, visit])
    setChosen(visit)
    // A leaf click is just a candidate — they confirm with "This is it" / can keep
    // exploring. The wrong-leaf inline flag stays for context.
  }

  // Commit the currently chosen leaf as the participant's answer and show results.
  const submit = () => {
    if (!chosen) return
    window.clearInterval(timerRef.current)
    setSuccess(chosen.id === CORRECT_ID)
    setPhase('result')
  }

  // Directness: a path is "Direct" when the participant opened only the parent
  // that actually contains the answer before selecting a leaf (no backtracking
  // through unrelated branches).
  const openedParents = path.filter((v) => PARENT_LABEL[v.id] === undefined && v.id !== chosen?.id)
  const isDirect = success && openedParents.length === 1 && openedParents[0]?.id === 'products'
  const breadcrumb = ['Home', ...path.map((v) => v.label)]
  // The participant counts as one more run on top of the sample.
  const liveSuccessPct = Math.round((AGG_SUCCESS * 40 + (success ? 100 : 0)) / 41)
  const liveDirectPct = Math.round((AGG_DIRECTNESS * 40 + (isDirect ? 100 : 0)) / 41)
  const liveScore = findabilityScore(liveSuccessPct, liveDirectPct)
  const liveGrade = findabilityGrade(liveScore)

  const root = `showcase-mockup-inner ttd-demo ttd-phase-${phase}${
    interactive ? ' is-interactive' : ''
  }`

  // SSR / reduced-motion fallback: a static, sensible analysis summary — the
  // aggregate metrics, findability grade, and destinations breakdown. No
  // interaction. Mirrors the interactive result so the card never looks empty.
  if (!interactive) {
    return (
      <div className="showcase-mockup-inner ttd-demo">
        <div className="ttd-head">
          <span className="ttd-head-task">Find the pricing page</span>
          <span className="ttd-pill ttd-pill-green">{AGG_SUCCESS}% success</span>
        </div>
        <div className="ttd-scorerow">
          <div className={`ttd-gauge ttd-grade-${aggGrade}`}>
            <span className="ttd-gauge-label">Findability</span>
            <span className="ttd-gauge-scorerow">
              <span className="ttd-gauge-score">{aggScore.toFixed(1)}</span>
              <span className="ttd-gauge-of">/10</span>
              <span className="ttd-gauge-grade">{aggGrade}</span>
            </span>
          </div>
          <div className="ttd-metrics ttd-metrics-compact">
            <div className="ttd-metric">
              <span className="ttd-metric-num ttd-num-green">{AGG_SUCCESS}%</span>
              <span className="ttd-metric-lbl">Success</span>
            </div>
            <div className="ttd-metric">
              <span className="ttd-metric-num ttd-num-accent">{AGG_DIRECTNESS}%</span>
              <span className="ttd-metric-lbl">Directness</span>
            </div>
            <div className="ttd-metric">
              <span className="ttd-metric-num">4.2s</span>
              <span className="ttd-metric-lbl">Avg. time</span>
            </div>
          </div>
        </div>
        <DestinationsPanel />
      </div>
    )
  }

  return (
    <div className={root}>
      {phase === 'navigate' ? (
        <>
          <div className="ttd-taskbar">
            <span className="ttd-task-q">Where would you go to find pricing?</span>
            <span className="ttd-rec" aria-hidden="true">
              <i className="ttd-rec-dot" />
              {time}
            </span>
          </div>

          <div className="ttd-treewrap">
            <span className="ttd-hint" aria-hidden="true">
              Click through the menu to find it
            </span>
            <ul className="ttd-tree" role="tree" aria-label="Site navigation">
              {TREE.map((node) => {
                const hasChildren = !!node.children?.length
                const isOpen = openId === node.id
                return (
                  <li key={node.id} role="none" className="ttd-branch">
                    <button
                      type="button"
                      role="treeitem"
                      aria-expanded={hasChildren ? isOpen : undefined}
                      className={`ttd-node ttd-node-parent${isOpen ? ' is-open' : ''}`}
                      onClick={() => (hasChildren ? toggleParent(node) : selectLeaf(node))}
                    >
                      {hasChildren ? (
                        <svg
                          className="ttd-caret"
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      ) : (
                        <span className="ttd-caret-spacer" aria-hidden="true" />
                      )}
                      <span className="ttd-node-label">{node.label}</span>
                    </button>

                    {hasChildren && isOpen && (
                      <ul className="ttd-children" role="group">
                        {node.children!.map((child) => {
                          const isChosen = chosen?.id === child.id
                          const isCorrectLeaf = child.id === CORRECT_ID
                          return (
                            <li key={child.id} role="none">
                              <button
                                type="button"
                                role="treeitem"
                                aria-pressed={isChosen}
                                className={`ttd-node ttd-node-leaf${
                                  isChosen ? (isCorrectLeaf ? ' is-right' : ' is-wrong') : ''
                                }`}
                                onClick={() => selectLeaf(child)}
                              >
                                <span className="ttd-leaf-dot" aria-hidden="true" />
                                <span className="ttd-node-label">{child.label}</span>
                                {isChosen && (
                                  <span className="ttd-leaf-flag" aria-hidden="true">
                                    Selected
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>

            {chosen && (
              <button type="button" className="ttd-submit" onClick={submit}>
                I&apos;d find it here: <b>{chosen.label}</b>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="ttd-result">
          <div className="ttd-result-status">
            <span
              className={`ttd-check${success ? '' : ' ttd-check-miss'}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2">
                {success ? (
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M7 7l10 10M17 7L7 17" strokeLinecap="round" />
                )}
              </svg>
            </span>
            {success ? 'Found it' : 'Wrong destination'}
            <span className={`ttd-tag ${isDirect ? 'ttd-tag-direct' : 'ttd-tag-indirect'}`}>
              {isDirect ? 'Direct path' : 'Indirect path'}
            </span>
          </div>

          <div className="ttd-result-crumbs">
            {breadcrumb.map((label, i) => {
              const isLast = i === breadcrumb.length - 1
              return (
                <span key={`${label}-${i}`} className="ttd-crumb-seg">
                  {i > 0 && (
                    <i className="ttd-sep" aria-hidden="true">
                      /
                    </i>
                  )}
                  <span
                    className={
                      isLast ? (success ? 'ttd-crumb-target' : 'ttd-crumb-miss') : undefined
                    }
                  >
                    {label}
                  </span>
                </span>
              )
            })}
          </div>

          <div className="ttd-scorerow ttd-scorerow-result">
            <div className={`ttd-gauge ttd-grade-${liveGrade}`}>
              <span className="ttd-gauge-label">Findability</span>
              <span className="ttd-gauge-scorerow">
                <span className="ttd-gauge-score">{liveScore.toFixed(1)}</span>
                <span className="ttd-gauge-of">/10</span>
                <span className="ttd-gauge-grade">{liveGrade}</span>
              </span>
            </div>
            <div className="ttd-metrics ttd-metrics-compact">
              <div className="ttd-metric">
                <span className="ttd-metric-num ttd-num-green">{liveSuccessPct}%</span>
                <span className="ttd-metric-lbl">Success</span>
              </div>
              <div className="ttd-metric">
                <span className="ttd-metric-num ttd-num-accent">{liveDirectPct}%</span>
                <span className="ttd-metric-lbl">Directness</span>
              </div>
              <div className="ttd-metric">
                <span className="ttd-metric-num">{time}</span>
                <span className="ttd-metric-lbl">Your time</span>
              </div>
            </div>
          </div>

          <DestinationsPanel youLabel={chosen?.label ?? undefined} youCorrect={success} />

          <button type="button" className="ttd-restart" onClick={reset}>
            ↻ Try again
          </button>
        </div>
      )}
    </div>
  )
}

// Destinations breakdown: where participants ended up. Correct node first, then
// the common wrong nodes, each with a % bar — the signature of the real tool.
function DestinationsPanel({
  youLabel,
  youCorrect,
}: {
  youLabel?: string
  youCorrect?: boolean
}) {
  const max = Math.max(...DESTINATIONS.map((d) => d.pct))
  return (
    <div className="ttd-dests">
      <span className="ttd-dests-title" aria-hidden="true">
        Where participants ended up
      </span>
      <ul className="ttd-dest-list">
        {DESTINATIONS.map((d) => {
          // Mark the row the live participant landed on (matches by label).
          const isYou = youLabel
            ? d.label.endsWith(youLabel) && d.correct === !!youCorrect
            : false
          return (
            <li key={d.label} className="ttd-dest-row">
              <span className="ttd-dest-label">
                <span
                  className={`ttd-dest-dot${d.correct ? ' is-correct' : ''}`}
                  aria-hidden="true"
                />
                {d.label}
                {d.correct && (
                  <span className="ttd-dest-badge" aria-hidden="true">
                    Correct
                  </span>
                )}
                {isYou && <span className="ttd-dest-you">You</span>}
              </span>
              <span className="ttd-dest-track" aria-hidden="true">
                <span
                  className={`ttd-dest-fill${d.correct ? ' is-correct' : ''}`}
                  style={{ width: `${(d.pct / max) * 100}%` }}
                />
              </span>
              <span className="ttd-dest-pct">{d.pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
