'use client'

import { useEffect, useRef, useState } from 'react'

// Mirrors the real "Survey": answer a short set of questions of different types,
// each with the proper input UI and a live result viz appropriate to its type.
//   Q1 Single choice  -> response distribution bars (counts + %)
//   Q2 NPS (0-10)      -> live score with promoters/passives/detractors split
//   Q3 Multiple choice -> multi-select chips with a ranked bar breakdown
// After the last question, a compact results recap mirrors the product's
// Survey analysis: a headline metric, a per-question mini chart for each type,
// and a top-insight line. Picking always nudges the visitor's choice highest.

type ChoiceQuestion = {
  kind: 'single'
  prompt: string
  type: string
  options: { label: string; pct: number }[]
  branchNote?: string
}

type NpsQuestion = {
  kind: 'nps'
  prompt: string
  type: string
  // Aggregated share (0..1) of each 0..10 score before the visitor votes.
  dist: number[]
}

type MultiQuestion = {
  kind: 'multi'
  prompt: string
  type: string
  options: { label: string; pct: number }[]
}

type Question = ChoiceQuestion | NpsQuestion | MultiQuestion

// Base sample size for the live distribution; the chosen answer counts too.
const SAMPLE = 240

// NPS prior distribution over scores 0..10 (shares sum ~1). Skewed toward
// promoters so the demo lands on a believable positive-but-honest score.
const NPS_DIST = [0.01, 0.01, 0.02, 0.03, 0.04, 0.06, 0.08, 0.13, 0.16, 0.21, 0.25]

const QUESTIONS: Question[] = [
  {
    kind: 'single',
    prompt: 'How easy was it to find the pricing page?',
    type: 'Single choice',
    branchNote: '"Difficult" branches to a follow-up question.',
    options: [
      { label: 'Very easy', pct: 0.58 },
      { label: 'Somewhat easy', pct: 0.31 },
      { label: 'Difficult', pct: 0.11 },
    ],
  },
  {
    kind: 'nps',
    prompt: 'How likely are you to recommend us to a colleague?',
    type: 'NPS',
    dist: NPS_DIST,
  },
  {
    kind: 'multi',
    prompt: 'Which features matter most to you?',
    type: 'Multiple choice',
    options: [
      { label: 'Fast results', pct: 0.71 },
      { label: 'AI summaries', pct: 0.54 },
      { label: 'Easy sharing', pct: 0.38 },
    ],
  },
]

// ── NPS helpers ──────────────────────────────────────────────────────────
// Given the aggregated counts per score 0..10, split into the standard buckets
// and compute the NPS = %promoters - %detractors (rounded).
function npsBreakdown(counts: number[]) {
  const total = counts.reduce((a, b) => a + b, 0) || 1
  let detractors = 0
  let passives = 0
  let promoters = 0
  counts.forEach((c, score) => {
    if (score <= 6) detractors += c
    else if (score <= 8) passives += c
    else promoters += c
  })
  const score = Math.round((promoters / total - detractors / total) * 100)
  return {
    total,
    score,
    detractors,
    passives,
    promoters,
    detractorsPct: Math.round((detractors / total) * 100),
    passivesPct: Math.round((passives / total) * 100),
    promotersPct: Math.round((promoters / total) * 100),
  }
}

export default function SurveyDemo() {
  const [interactive, setInteractive] = useState(false)
  const [index, setIndex] = useState(0)
  // Per-question answer state. single/nps store a number; multi stores indices.
  const [single, setSingle] = useState<(number | null)[]>([null, null, null])
  const [nps, setNps] = useState<number | null>(null)
  const [multi, setMulti] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const timerRef = useRef<number>(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current)
  }, [])

  const question = QUESTIONS[index]

  // Is the current question answered (revealed)?
  const revealed =
    question.kind === 'single'
      ? single[index] !== null
      : question.kind === 'nps'
        ? nps !== null
        : multi.length > 0

  const answered = index + (revealed ? 1 : 0)

  const next = () => {
    if (index < QUESTIONS.length - 1) {
      setIndex((i) => i + 1)
    } else {
      setDone(true)
    }
  }

  const restart = () => {
    window.clearTimeout(timerRef.current)
    setDone(false)
    setIndex(0)
    setSingle([null, null, null])
    setNps(null)
    setMulti([])
  }

  // ── Single-choice counts (Q1) ──
  const singleQ = QUESTIONS[0] as ChoiceQuestion
  const singleCounts = singleQ.options.map((o, i) => {
    const base = Math.round(o.pct * SAMPLE)
    return single[0] === i ? base + 1 : base
  })
  const singleTotal = singleCounts.reduce((a, b) => a + b, 0)

  // ── NPS counts (Q2) ──
  const npsCounts = NPS_DIST.map((p, score) => {
    const base = Math.round(p * SAMPLE)
    return nps === score ? base + 1 : base
  })
  const npsStats = npsBreakdown(npsCounts)

  // ── Multi-select counts (Q3) ──
  const multiQ = QUESTIONS[2] as MultiQuestion
  const multiCounts = multiQ.options.map((o, i) => {
    const base = Math.round(o.pct * SAMPLE)
    return multi.includes(i) ? base + 1 : base
  })
  const multiResp = SAMPLE + (multi.length > 0 ? 1 : 0)

  const root = `showcase-mockup-inner svd-demo${interactive ? ' svd-interactive' : ''}${
    revealed ? ' svd-revealed' : ''
  }`

  // ── Completion / analysis screen ────────────────────────────────────────
  if (done) {
    const easyPct = Math.round(((singleCounts[0] + singleCounts[1]) / singleTotal) * 100)
    const topFeatureIdx = multiCounts.reduce((best, c, i) => (c > multiCounts[best] ? i : best), 0)
    return (
      <div className={root}>
        <div className="svd-results">
          <div className="svd-results-head">
            <div className="svd-results-status" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="svd-results-title">Survey results</div>
              <div className="svd-results-sub">241 responses &middot; 94% completion</div>
            </div>
          </div>

          {/* Headline metrics row */}
          <div className="svd-headline">
            <div className="svd-headline-card">
              <span className="svd-headline-num">NPS {npsStats.score}</span>
              <span className="svd-headline-lbl">{npsStats.promotersPct}% promoters</span>
            </div>
            <div className="svd-headline-card">
              <span className="svd-headline-num">{easyPct}%</span>
              <span className="svd-headline-lbl">found pricing easy</span>
            </div>
          </div>

          {/* Per-question recap */}
          <div className="svd-recap">
            {/* Q1 single choice: distribution bars */}
            <div className="svd-recap-item">
              <div className="svd-recap-head">
                <span className="svd-recap-q">{singleQ.prompt}</span>
                <span className="svd-recap-type">Single choice</span>
              </div>
              <div className="svd-recap-bars">
                {singleQ.options.map((o, i) => {
                  const pct = Math.round((singleCounts[i] / singleTotal) * 100)
                  return (
                    <div className="svd-recap-bar" key={o.label}>
                      <span className="svd-recap-bar-lbl">{o.label}</span>
                      <span className="svd-recap-bar-track">
                        <span
                          className={`svd-recap-bar-fill${i === 0 ? ' is-top' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="svd-recap-bar-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Q2 NPS: score + promoters/passives/detractors split */}
            <div className="svd-recap-item">
              <div className="svd-recap-head">
                <span className="svd-recap-q">Likelihood to recommend</span>
                <span className="svd-recap-type">NPS</span>
              </div>
              <div className="svd-nps-row">
                <span className="svd-nps-score">{npsStats.score}</span>
                <div className="svd-nps-split" aria-hidden="true">
                  <span
                    className="svd-nps-seg is-detractor"
                    style={{ width: `${npsStats.detractorsPct}%` }}
                  />
                  <span
                    className="svd-nps-seg is-passive"
                    style={{ width: `${npsStats.passivesPct}%` }}
                  />
                  <span
                    className="svd-nps-seg is-promoter"
                    style={{ width: `${npsStats.promotersPct}%` }}
                  />
                </div>
              </div>
              <div className="svd-nps-legend">
                <span><i className="svd-dot is-promoter" />Promoters {npsStats.promotersPct}%</span>
                <span><i className="svd-dot is-passive" />Passives {npsStats.passivesPct}%</span>
                <span><i className="svd-dot is-detractor" />Detractors {npsStats.detractorsPct}%</span>
              </div>
            </div>

            {/* Q3 multiple choice: ranked bars */}
            <div className="svd-recap-item">
              <div className="svd-recap-head">
                <span className="svd-recap-q">{multiQ.prompt}</span>
                <span className="svd-recap-type">Multiple choice</span>
              </div>
              <div className="svd-recap-bars">
                {multiQ.options.map((o, i) => {
                  const pct = Math.round((multiCounts[i] / multiResp) * 100)
                  return (
                    <div className="svd-recap-bar" key={o.label}>
                      <span className="svd-recap-bar-lbl">{o.label}</span>
                      <span className="svd-recap-bar-track">
                        <span
                          className={`svd-recap-bar-fill${i === topFeatureIdx ? ' is-top' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="svd-recap-bar-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* AI top insight */}
          <div className="svd-insight">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M17 7l1.4-1.4M19 12h2" strokeLinecap="round" />
              <path d="M9 18h6M10 21h4M9 14a4 4 0 116 0c-.6.7-1 1.3-1 2H10c0-.7-.4-1.3-1-2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              <b>Top theme:</b> {multiQ.options[topFeatureIdx].label.toLowerCase()} drives recommendation; pricing clarity is the main friction point.
            </span>
          </div>

          <button type="button" className="svd-restart" onClick={restart}>
            <span aria-hidden="true">↻ </span>Run the survey again
          </button>
        </div>
      </div>
    )
  }

  // ── Active question screen ──────────────────────────────────────────────
  return (
    <div className={root}>
      <div className="svd-head">
        <div className="svd-title">Post-Task Survey</div>
        <div className="svd-meta">3 questions &middot; Branching</div>
      </div>

      <div className="svd-progress" aria-hidden="true">
        {QUESTIONS.map((_, i) => (
          <span
            key={i}
            className={`svd-prog-seg${i < answered ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}
          />
        ))}
      </div>

      <div className="svd-card">
        <div className="svd-qhead">
          <span className="svd-qnum">
            Question {index + 1} of {QUESTIONS.length}
          </span>
          <span className="svd-qtype">{question.type}</span>
        </div>
        <div className="svd-prompt">{question.prompt}</div>

        {/* ── Single choice ── */}
        {question.kind === 'single' && (
          <div className="svd-options" role="radiogroup" aria-label={question.prompt}>
            {singleQ.options.map((opt, i) => {
              const isPicked = single[0] === i
              const share = singleTotal > 0 ? singleCounts[i] / singleTotal : 0
              const display = Math.round(share * 100)
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  disabled={!interactive || (revealed && !isPicked)}
                  className={`svd-option${isPicked ? ' is-picked' : ''}${revealed ? ' is-revealed' : ''}`}
                  onClick={() => {
                    if (!interactive || revealed) return
                    setSingle((s) => {
                      const n = [...s]
                      n[0] = i
                      return n
                    })
                  }}
                >
                  <span
                    className="svd-option-fill"
                    aria-hidden="true"
                    style={{ width: revealed ? `${share * 100}%` : '0%' }}
                  />
                  <span className="svd-radio" aria-hidden="true">
                    <span className="svd-radio-dot" />
                  </span>
                  <span className="svd-option-label">{opt.label}</span>
                  <span className="svd-option-pct" aria-hidden={!revealed}>
                    {revealed ? `${display}%` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── NPS 0..10 ── */}
        {question.kind === 'nps' && (
          <div className="svd-nps">
            <div className="svd-nps-scale" role="radiogroup" aria-label={question.prompt}>
              {Array.from({ length: 11 }, (_, score) => {
                const isPicked = nps === score
                const bucket = score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter'
                return (
                  <button
                    key={score}
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    aria-label={`${score}`}
                    disabled={!interactive || (revealed && !isPicked)}
                    className={`svd-nps-btn is-${bucket}${isPicked ? ' is-picked' : ''}`}
                    onClick={() => {
                      if (!interactive || revealed) return
                      setNps(score)
                    }}
                  >
                    {score}
                  </button>
                )
              })}
            </div>
            <div className="svd-nps-ends" aria-hidden="true">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            {revealed && (
              <div className="svd-nps-live">
                <span className="svd-nps-live-score">NPS {npsStats.score}</span>
                <div className="svd-nps-split" aria-hidden="true">
                  <span className="svd-nps-seg is-detractor" style={{ width: `${npsStats.detractorsPct}%` }} />
                  <span className="svd-nps-seg is-passive" style={{ width: `${npsStats.passivesPct}%` }} />
                  <span className="svd-nps-seg is-promoter" style={{ width: `${npsStats.promotersPct}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Multiple choice (multi-select chips) ── */}
        {question.kind === 'multi' && (
          <div className="svd-chips" role="group" aria-label={question.prompt}>
            {multiQ.options.map((opt, i) => {
              const isPicked = multi.includes(i)
              const pct = Math.round((multiCounts[i] / multiResp) * 100)
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={isPicked}
                  disabled={!interactive}
                  className={`svd-chip${isPicked ? ' is-picked' : ''}${revealed ? ' is-revealed' : ''}`}
                  onClick={() => {
                    if (!interactive) return
                    setMulti((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
                  }}
                >
                  <span className="svd-chip-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="svd-chip-label">{opt.label}</span>
                  <span className="svd-chip-pct" aria-hidden={!revealed}>
                    {revealed ? `${pct}%` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="svd-card-foot">
          {revealed ? (
            <>
              <span className="svd-count">
                {question.kind === 'nps'
                  ? `${npsStats.total} responses`
                  : question.kind === 'multi'
                    ? `${multiResp} responses`
                    : `${singleTotal} responses`}
              </span>
              <button type="button" className="svd-next" onClick={next}>
                {index < QUESTIONS.length - 1 ? 'Next question' : 'See results'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : (
            <span className="svd-hint">
              {!interactive
                ? 'Choose an option'
                : question.kind === 'multi'
                  ? 'Select all that apply to see live results'
                  : 'Pick an option to see live results'}
            </span>
          )}
        </div>
      </div>

      {question.kind === 'single' && question.branchNote && (
        <div className="svd-branch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 3v6a3 3 0 003 3h9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{question.branchNote}</span>
        </div>
      )}
    </div>
  )
}
