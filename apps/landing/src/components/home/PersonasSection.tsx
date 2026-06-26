'use client'

import { useEffect, useState } from 'react'
import FadeIn from '@/components/FadeIn'
import GuideLines from '@/components/GuideLines'
import LineTicker from '@/components/LineTicker'

const ROTATE_MS = 6500

type Persona = {
  id: string
  label: string
  color: string
  icon: React.ReactNode
  title: string
  desc: string
  visual: React.ReactNode
}

function Dot({ color }: { color: string }) {
  return <span className="persona-icon-dot" style={{ background: color }} />
}

/* ── Right-side mock visuals (brand glassmorphism style) ── */

function ClickMapVisual() {
  return (
    <div className="pv-card pv-card-narrow">
      <div className="pv-meta">Visited by 22 of 22 participants</div>
      <div className="pv-title">Login screen</div>
      <div className="pv-row pv-row-hit">
        <div>
          <div className="pv-row-label">Hits</div>
          <div className="pv-row-sub">90% of clicks</div>
        </div>
        <div className="pv-row-num">28</div>
      </div>
      <div className="pv-row">
        <div>
          <div className="pv-row-label">Misses</div>
          <div className="pv-row-sub">10% of clicks</div>
        </div>
        <div className="pv-row-num">4</div>
      </div>
      <div className="pv-row">
        <div>
          <div className="pv-row-label">Time spent</div>
          <div className="pv-row-sub">Average time on screen</div>
        </div>
        <div className="pv-row-num">10s</div>
      </div>
    </div>
  )
}

function ABTestVisual() {
  return (
    <div className="pv-card">
      <div className="pv-card-head">
        <span className="pv-title">Pricing page test</span>
        <span className="pv-pill pv-pill-green">Winner: B &middot; 95%</span>
      </div>
      <div className="pv-bar-block">
        <div className="pv-bar-top"><span>Design A</span><span className="pv-bar-pct">38%</span></div>
        <div className="pv-track"><div className="pv-fill" style={{ width: '38%', background: 'var(--gray-400)' }} /></div>
      </div>
      <div className="pv-bar-block">
        <div className="pv-bar-top"><span>Design B</span><span className="pv-bar-pct">62%</span></div>
        <div className="pv-track"><div className="pv-fill" style={{ width: '62%', background: 'var(--accent)' }} /></div>
      </div>
    </div>
  )
}

function ThemesVisual() {
  const themes = [
    { label: 'Confusing navigation', n: 24, w: '100%', c: 'var(--orange)' },
    { label: 'Pricing felt unclear', n: 18, w: '72%', c: 'var(--yellow)' },
    { label: 'Loved the speed', n: 15, w: '60%', c: 'var(--green)' },
  ]
  return (
    <div className="pv-card">
      <div className="pv-card-head">
        <span className="pv-title">Top themes</span>
        <span className="pv-pill pv-pill-ai"><span className="pv-ai-dot" /> AI summary</span>
      </div>
      {themes.map((t) => (
        <div className="pv-theme" key={t.label}>
          <div className="pv-theme-top"><span>{t.label}</span><span className="pv-theme-n">{t.n}</span></div>
          <div className="pv-track"><div className="pv-fill" style={{ width: t.w, background: t.c }} /></div>
        </div>
      ))}
    </div>
  )
}

function SurveyVisual() {
  const answers = [
    { label: 'Every day', w: '34%' },
    { label: 'Weekly', w: '88%', active: true },
    { label: 'Monthly', w: '46%' },
    { label: 'Never', w: '22%' },
  ]
  return (
    <div className="pv-card">
      <div className="pv-meta">Question 2 of 5</div>
      <div className="pv-title">How often do you use our app?</div>
      <div className="pv-survey">
        {answers.map((a) => (
          <div className={`pv-survey-row${a.active ? ' active' : ''}`} key={a.label}>
            <span className="pv-survey-label">{a.label}</span>
            <div className="pv-track"><div className="pv-fill" style={{ width: a.w, background: 'var(--green)' }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletionVisual() {
  const r = 46
  const circ = 2 * Math.PI * r
  return (
    <div className="pv-card pv-card-center">
      <div className="pv-donut">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(34,197,94,.15)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none" stroke="var(--green)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - 48 / 58)} transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="pv-donut-text">
          <div className="pv-donut-num">48</div>
          <div className="pv-donut-sub">of 58</div>
        </div>
      </div>
      <div className="pv-donut-caption">Participants completed your study</div>
      <span className="pv-pill pv-pill-green pv-pill-solo">Results in 4 hours</span>
    </div>
  )
}

const PERSONAS: Persona[] = [
  {
    id: 'pm',
    label: 'Product Managers',
    color: 'var(--orange)',
    icon: <Dot color="var(--orange)" />,
    title: 'Ship features users actually want.',
    desc: 'Stop guessing what to build next. Run a quick prototype or web app test, see exactly where users drop off, and ship the version backed by evidence, not the loudest opinion in the room.',
    visual: <ClickMapVisual />,
  },
  {
    id: 'designers',
    label: 'Designers',
    color: 'var(--accent)',
    icon: <Dot color="var(--accent)" />,
    title: 'Defend designs with evidence.',
    desc: 'Put two designs head to head, watch real users click through them, and let built-in significance testing call the winner at 95% confidence. Walk into the review with data, not opinions.',
    visual: <ABTestVisual />,
  },
  {
    id: 'researchers',
    label: 'UX Researchers',
    color: 'var(--green)',
    icon: <Dot color="var(--green)" />,
    title: 'Scale research without the busywork.',
    desc: 'Recruit, test, and analyze in one place. Veritio clusters open-ended answers into themes and drafts the summary for you, so your time goes to insight, not tagging spreadsheets.',
    visual: <ThemesVisual />,
  },
  {
    id: 'marketers',
    label: 'Marketers',
    color: 'var(--blue)',
    icon: <Dot color="var(--blue)" />,
    title: 'Test messaging before you ship it.',
    desc: 'Validate copy, landing pages, and campaigns with real users. Run a first-impression or first-click test and know what lands before you spend the budget, no code required.',
    visual: <SurveyVisual />,
  },
  {
    id: 'founders',
    label: 'Founders & startups',
    color: 'var(--yellow)',
    icon: <Dot color="var(--yellow)" />,
    title: 'Validate before you build.',
    desc: 'Talk to users without a research team or a big budget. No per-response fees and results in hours, so you can decide fast and keep moving.',
    visual: <CompletionVisual />,
  },
]

export default function PersonasSection() {
  const [active, setActive] = useState(0)

  // Auto-advance; resets whenever `active` changes (manual click or rotation).
  useEffect(() => {
    const t = setTimeout(() => setActive((a) => (a + 1) % PERSONAS.length), ROTATE_MS)
    return () => clearTimeout(t)
  }, [active])

  return (
    <section className="personas-section" id="use-cases">
      <GuideLines />
      <LineTicker direction="right" />
      <div className="personas-container">
        <FadeIn>
          <div className="personas-header">
            <div>
              <div className="section-badge"><span className="badge-dot" /> WHO IT&apos;S FOR</div>
              <h2 className="personas-heading">Research that fits how your team already works</h2>
            </div>
            <p className="personas-intro">
              Veritio is built for everyone who ships, not just specialists. Simple,
              powerful research tools that take you from question to insight in hours.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={1}>
          <div className="personas-body">
            <div className="personas-list">
              {PERSONAS.map((p, i) => {
                const isActive = active === i
                return (
                  <div className={`persona${isActive ? ' active' : ''}`} key={p.id}>
                    <button
                      type="button"
                      className="persona-head"
                      onClick={() => setActive(i)}
                      aria-expanded={isActive}
                    >
                      <span className="persona-icon">{p.icon}</span>
                      <span className="persona-label">{p.label}</span>
                    </button>
                    <div className="persona-detail">
                      <div className="persona-detail-inner">
                        <h3 className="persona-title">{p.title}</h3>
                        <p className="persona-desc">{p.desc}</p>
                        <div className="persona-bar">
                          {isActive && <div className="persona-bar-fill" key={active} />}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="personas-visual">
              <div className="personas-visual-grid" />
              {PERSONAS.map((p, i) => (
                <div className={`personas-visual-slide${active === i ? ' active' : ''}`} key={p.id}>
                  {p.visual}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
