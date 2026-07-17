'use client'

import { useEffect, useRef, useState } from 'react'
import { useInteractiveMotion } from '@/hooks/useInteractiveMotion'

// Mirrors the real "First Impression / 3-second test": a design is shown for a
// few seconds with a countdown, then it hides and the participant is asked which
// words describe it. Results mirror the real Veritio analysis: a word cloud of
// the most-frequent impression words (sized by frequency, the visitor's own
// picks emphasised), an attribute distribution, a top-word / sentiment headline
// and a response count. Reduced-motion / SSR falls back to the static question
// + word cloud + bars (no timer).

type Phase = 'idle' | 'showing' | 'ask' | 'results'

const SHOW_SECONDS = 3

// Selectable impression words. `attr` flags the ones that map onto the result
// bars so a visitor's pick can be emphasised there. `tone` colours the chip
// sentiment lightly (positive vs the one negative option).
const WORDS: { label: string; attr?: 'modern' | 'trustworthy' | 'cluttered'; tone: 'pos' | 'neg' }[] = [
  { label: 'Modern', attr: 'modern', tone: 'pos' },
  { label: 'Clean', tone: 'pos' },
  { label: 'Trustworthy', attr: 'trustworthy', tone: 'pos' },
  { label: 'Bold', tone: 'pos' },
  { label: 'Friendly', tone: 'pos' },
  { label: 'Cluttered', attr: 'cluttered', tone: 'neg' },
]

// Word-cloud data: every impression word with a baseline mention count across the
// sample (the existing static distribution, expressed as raw mentions out of 40).
// `tone` carries through so negative words read differently. The visitor's own
// picks get a small bump and visual emphasis so the cloud feels personal without
// misrepresenting the aggregate.
const CLOUD: { label: string; base: number; tone: 'pos' | 'neg' }[] = [
  { label: 'Modern', base: 26, tone: 'pos' },
  { label: 'Clean', base: 22, tone: 'pos' },
  { label: 'Trustworthy', base: 19, tone: 'pos' },
  { label: 'Friendly', base: 13, tone: 'pos' },
  { label: 'Bold', base: 9, tone: 'pos' },
  { label: 'Cluttered', base: 6, tone: 'neg' },
]

const SAMPLE = 40

// Baseline attribute distribution (the existing static card's numbers). The
// visitor's own pick nudges the matching bar up a touch so the result feels
// personal without misrepresenting the aggregate.
const ATTRS: { key: 'modern' | 'trustworthy' | 'cluttered'; label: string; base: number; color: string }[] = [
  { key: 'modern', label: 'Modern', base: 64, color: 'var(--green)' },
  { key: 'trustworthy', label: 'Trustworthy', base: 48, color: 'var(--accent)' },
  { key: 'cluttered', label: 'Cluttered', base: 14, color: 'var(--orange)' },
]

export default function FirstImpressionDemo() {
  const interactive = useInteractiveMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(SHOW_SECONDS)
  const [picked, setPicked] = useState<string[]>([])
  const [barsIn, setBarsIn] = useState(false)
  const timerRef = useRef<number>(0)
  const tickRef = useRef<number>(0)
  const barTimerRef = useRef<number>(0)

  const clearTimers = () => {
    window.clearTimeout(timerRef.current)
    window.clearInterval(tickRef.current)
    window.clearTimeout(barTimerRef.current)
  }

  useEffect(() => () => clearTimers(), [])

  const startTest = () => {
    clearTimers()
    setPicked([])
    setBarsIn(false)
    setRemaining(SHOW_SECONDS)
    setPhase('showing')
    let secs = SHOW_SECONDS
    tickRef.current = window.setInterval(() => {
      secs -= 1
      setRemaining(Math.max(0, secs))
      if (secs <= 0) window.clearInterval(tickRef.current)
    }, 1000)
    timerRef.current = window.setTimeout(() => {
      window.clearInterval(tickRef.current)
      setPhase('ask')
    }, SHOW_SECONDS * 1000)
  }

  const toggleWord = (label: string) => {
    setPicked((prev) =>
      prev.includes(label) ? prev.filter((w) => w !== label) : prev.length >= 3 ? prev : [...prev, label]
    )
  }

  const submitWords = () => {
    if (!picked.length) return
    setPhase('results')
    // Let the results mount, then trigger the bar fill transition.
    barTimerRef.current = window.setTimeout(() => setBarsIn(true), 60)
  }

  const reset = () => {
    clearTimers()
    setPicked([])
    setBarsIn(false)
    setRemaining(SHOW_SECONDS)
    setPhase('idle')
  }

  // Per-attribute final width: base, nudged +6 (capped 92) if the visitor
  // picked that word, so their choice is reflected honestly in the aggregate.
  const attrValue = (a: (typeof ATTRS)[number]) =>
    picked.includes(a.label) ? Math.min(92, a.base + 6) : a.base

  // Per-word cloud mentions: a visitor's pick adds itself to the sample. Words
  // are sized into 4 weight buckets by mention count for a real word-cloud feel.
  const cloudCount = (label: string, base: number) => (picked.includes(label) ? base + 1 : base)
  const maxCount = Math.max(...CLOUD.map((c) => cloudCount(c.label, c.base)))
  const weightOf = (count: number) => {
    const r = count / maxCount
    if (r > 0.85) return 4
    if (r > 0.6) return 3
    if (r > 0.35) return 2
    return 1
  }

  // Headline: the single most-mentioned word (the visitor's pick can tip it).
  const topWord = [...CLOUD]
    .map((c) => ({ ...c, count: cloudCount(c.label, c.base) }))
    .sort((a, b) => b.count - a.count)[0]
  // Positive sentiment share = positive mentions / all mentions.
  const totalMentions = CLOUD.reduce((s, c) => s + cloudCount(c.label, c.base), 0)
  const posMentions = CLOUD.filter((c) => c.tone === 'pos').reduce((s, c) => s + cloudCount(c.label, c.base), 0)
  const posPct = Math.round((posMentions / totalMentions) * 100)
  const responseCount = SAMPLE + (picked.length ? 1 : 0)

  const ringPct = ((SHOW_SECONDS - remaining) / SHOW_SECONDS) * 100
  const root = `showcase-mockup-inner fid-demo fid-phase-${phase}${interactive ? ' is-interactive' : ''}`

  // Shared word-cloud render (used by results + static fallback). `mine`
  // emphasises the visitor's own picks.
  const renderCloud = (mineActive: boolean) => (
    <div className="fid-cloud" aria-hidden="true">
      {CLOUD.map((c) => {
        const count = mineActive ? cloudCount(c.label, c.base) : c.base
        const mine = mineActive && picked.includes(c.label)
        return (
          <span
            key={c.label}
            className={`fid-word fid-word-w${weightOf(count)} fid-word-${c.tone}${mine ? ' is-yours' : ''}`}
          >
            {c.label}
          </span>
        )
      })}
    </div>
  )

  // ── SSR / reduced-motion static fallback: question + word cloud + bars ──
  if (!interactive) {
    return (
      <div className="showcase-mockup-inner fid-demo">
        <div className="fid-head">
          <span className="fid-head-title">Landing page, 3-second test</span>
          <span className="fid-head-meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Shown for 3s
          </span>
        </div>
        <div className="fid-question">&ldquo;What three words describe this design?&rdquo;</div>
        {renderCloud(false)}
        <div className="fid-bars">
          {ATTRS.map((a) => (
            <div className="fid-bar-row" key={a.key}>
              <span className="fid-bar-label">{a.label}</span>
              <span className="fid-bar-track">
                <span className="fid-bar-fill" style={{ width: `${a.base}%`, background: a.color }} />
              </span>
              <span className="fid-bar-val">{a.base}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={root}>
      {/* ── Phase: idle + showing — the design under test inside a browser frame ── */}
      {(phase === 'idle' || phase === 'showing') && (
        <div className="fid-stage">
          <div className="fid-browser" aria-hidden={phase === 'idle'}>
            <div className="fid-browser-bar" aria-hidden="true">
              <span className="fid-dots"><i /><i /><i /></span>
              <span className="fid-url">yoursite.com</span>
            </div>
            <div className={`fid-design${phase === 'idle' ? ' is-blurred' : ''}`} aria-hidden={phase === 'idle'}>
              <div className="fid-design-nav">
                <span className="fid-logo" />
                <span className="fid-navlinks"><i /><i /><i /></span>
              </div>
              <div className="fid-hero">
                <span className="fid-eyebrow" />
                <span className="fid-h1" />
                <span className="fid-h1 is-short" />
                <span className="fid-sub" />
                <span className="fid-ctarow"><span className="fid-cta" /><span className="fid-cta is-ghost" /></span>
              </div>
              <div className="fid-cards" aria-hidden="true"><span /><span /><span /></div>
            </div>
          </div>

          {phase === 'idle' && (
            <div className="fid-overlay">
              <div className="fid-overlay-card">
                <div className="fid-overlay-title">3-second test</div>
                <p className="fid-overlay-sub">Study the design for {SHOW_SECONDS} seconds, then tell us your first impression.</p>
                <button type="button" className="fid-start" onClick={startTest}>
                  Start the test
                </button>
              </div>
            </div>
          )}

          {phase === 'showing' && (
            <div className="fid-countdown" aria-hidden="true">
              <svg viewBox="0 0 44 44" className="fid-ring">
                <circle className="fid-ring-bg" cx="22" cy="22" r="19" />
                <circle
                  className="fid-ring-fg"
                  cx="22"
                  cy="22"
                  r="19"
                  style={{ strokeDashoffset: `${(ringPct / 100) * 119.4}` }}
                />
              </svg>
              <span className="fid-count-num">{remaining}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Phase: ask — design hidden, pick the words ── */}
      {phase === 'ask' && (
        <div className="fid-ask">
          <div className="fid-ask-head">
            <span className="fid-ask-eyebrow">Time&rsquo;s up</span>
            <span className="fid-ask-count">{picked.length} of 3 picked</span>
          </div>
          <div className="fid-ask-q">Which words describe what you just saw?</div>
          <div className="fid-chips" role="group" aria-label="Pick up to three words that describe the design">
            {WORDS.map((w) => {
              const on = picked.includes(w.label)
              const full = !on && picked.length >= 3
              return (
                <button
                  key={w.label}
                  type="button"
                  className={`fid-chip fid-chip-${w.tone}${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggleWord(w.label)}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
          <button type="button" className="fid-submit" onClick={submitWords} disabled={!picked.length}>
            See the results
          </button>
        </div>
      )}

      {/* ── Phase: results — word cloud + attribute distribution, your picks emphasised ── */}
      {phase === 'results' && (
        <div className="fid-results">
          <div className="fid-results-head">
            <span className="fid-results-title">First impression</span>
            <span className="fid-results-meta">{responseCount} responses</span>
          </div>

          {/* Headline: top word + positive sentiment split */}
          <div className="fid-headline">
            <div className="fid-headline-main">
              <span className="fid-headline-lbl">Top word</span>
              <span className="fid-headline-word">{topWord.label}</span>
            </div>
            <div className="fid-headline-sent">
              <span className="fid-headline-pct">{posPct}%</span>
              <span className="fid-headline-lbl">positive</span>
            </div>
          </div>

          {/* Word cloud, sized by mention frequency, your picks emphasised */}
          {renderCloud(true)}

          {picked.length > 0 && (
            <div className="fid-yourpicks">
              <span className="fid-yourpicks-lbl">You picked</span>
              <span className="fid-yourpicks-words">
                {picked.map((p) => (
                  <span className="fid-pickchip" key={p}>{p}</span>
                ))}
              </span>
            </div>
          )}

          <div className="fid-bars">
            {ATTRS.map((a) => {
              const val = attrValue(a)
              const mine = picked.includes(a.label)
              return (
                <div className={`fid-bar-row${mine ? ' is-yours' : ''}`} key={a.key}>
                  <span className="fid-bar-label">{a.label}</span>
                  <span className="fid-bar-track">
                    <span
                      className="fid-bar-fill"
                      style={{ width: barsIn ? `${val}%` : '0%', background: a.color }}
                    />
                  </span>
                  <span className="fid-bar-val">{val}%</span>
                </div>
              )
            })}
          </div>
          <button type="button" className="fid-restart" onClick={reset}>
            ↻ Run the test again
          </button>
        </div>
      )}
    </div>
  )
}
