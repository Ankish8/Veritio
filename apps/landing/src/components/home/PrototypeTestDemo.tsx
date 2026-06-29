'use client'

import { useEffect, useRef, useState } from 'react'

// Mirrors the real "Prototype Test": paste any prototype URL (v0, Lovable, Bolt,
// Replit — no code) and participants run a task by tapping through the screens.
// The prototype is shown inside a phone with a Safari address bar; tapping
// through a checkout flow (Cart → Shipping → Payment → Done) then reveals the
// results — task success, directness, avg time, wrong paths — in the same phone.

type Phase = 'flow' | 'analyzing' | 'results'

const STEP_NAME = ['Cart', 'Shipping', 'Payment']
const STEP_BTN = ['Continue to shipping', 'Continue to payment', 'Pay $129']

export default function PrototypeTestDemo() {
  const [interactive, setInteractive] = useState(false)
  const [phase, setPhase] = useState<Phase>('flow')
  const [step, setStep] = useState(0) // 0 Cart · 1 Shipping · 2 Payment · 3 Confirmed
  const [interacted, setInteracted] = useState(false)
  const [time, setTime] = useState('0:00')
  const [cur, setCur] = useState<{ x: number; y: number; following: boolean } | null>(null)
  const apiRef = useRef<{ advance: () => void; restart: () => void } | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  useEffect(() => {
    if (!interactive) return
    let phaseNow: Phase = 'flow'
    let stepNow = 0
    let secs = 0
    let timer = 0
    let t1 = 0
    let t2 = 0

    const startTimer = () => {
      window.clearInterval(timer)
      timer = window.setInterval(() => {
        secs += 1
        setTime(`${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`)
      }, 1000)
    }

    const startFlow = () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      phaseNow = 'flow'
      setPhase('flow')
      stepNow = 0
      setStep(0)
      setInteracted(false)
      secs = 0
      setTime('0:00')
      startTimer()
    }

    apiRef.current = {
      advance: () => {
        if (phaseNow !== 'flow') return
        setInteracted(true)
        if (stepNow < 2) {
          stepNow += 1
          setStep(stepNow)
        } else {
          stepNow = 3
          setStep(3)
          window.clearInterval(timer)
          t1 = window.setTimeout(() => {
            phaseNow = 'analyzing'
            setPhase('analyzing')
            t2 = window.setTimeout(() => {
              phaseNow = 'results'
              setPhase('results')
            }, 650)
          }, 850)
        }
      },
      restart: () => {
        if (phaseNow === 'results') startFlow()
      },
    }

    startFlow()
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      apiRef.current = null
    }
  }, [interactive])

  // Park the "participant" cursor on the Continue button as a click hint
  // (re-measured on each step); state-driven so re-renders don't wipe it.
  useEffect(() => {
    if (!interactive || phase !== 'flow' || step >= 3) return
    if (cur?.following) return
    const screen = screenRef.current
    const btn = screen?.querySelector<HTMLElement>('.pt-primary')
    if (!screen || !btn) return
    const sr = screen.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setCur({ x: br.left - sr.left + br.width * 0.5 - 4, y: br.top - sr.top + br.height * 0.5 - 2, following: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, phase, step, cur?.following])

  // Over the phone, the cursor follows the real pointer (it reads as the participant).
  useEffect(() => {
    if (!interactive) return
    const screen = screenRef.current
    if (!screen) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      const sr = screen.getBoundingClientRect()
      const x = e.clientX - sr.left - 3
      const y = e.clientY - sr.top - 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setCur({ x, y, following: true }))
    }
    const onLeave = () => setCur((c) => (c ? { ...c, following: false } : c))
    screen.addEventListener('pointermove', onMove)
    screen.addEventListener('pointerleave', onLeave)
    return () => {
      screen.removeEventListener('pointermove', onMove)
      screen.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive])

  const segOn = phase === 'results' ? 3 : step
  const stepName = STEP_NAME[Math.min(step, 2)]
  const root = `showcase-mockup-inner pt-demo pt-phase-${phase}${interacted ? ' is-interacted' : ''}${interactive ? ' is-interactive' : ''}`

  return (
    <div className={root}>
      <div className="pt-phone">
        <div className="pt-island" aria-hidden="true" />
        <div className="pt-screenwrap">
          <div className="pt-safari" aria-hidden="true">
            <div className="pt-safari-bar">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
              </svg>
              <span className="pt-safari-url">preview.v0.app</span>
            </div>
          </div>

          <div className="pt-phone-screen" ref={screenRef}>
            {phase !== 'results' ? (
              <>
                <div className="pt-testbar" aria-hidden="true">
                  <span className="pt-task">Task · Complete checkout</span>
                  <span className="pt-rec"><i className="pt-rec-dot" />REC <b>{interactive ? time : '0:12'}</b></span>
                </div>

                <div className="pt-stepper" aria-hidden="true">
                  <div className="pt-steps">
                    {[0, 1, 2].map((i) => <span key={i} className={`pt-seg${i <= segOn ? ' is-on' : ''}`} />)}
                  </div>
                  <span className="pt-step-label">{step >= 3 ? 'Order complete' : `${stepName} · step ${step + 1} of 3`}</span>
                </div>

                {step === 0 && (
                  <div className="pt-screen-body">
                    <div className="pt-screen-title">Your cart</div>
                    <div className="pt-row"><div className="pt-thumb" /><div className="pt-row-lines"><div className="pt-bar" style={{ width: '78%' }} /><div className="pt-bar" style={{ width: '46%' }} /></div><span className="pt-price">$79</span></div>
                    <div className="pt-row"><div className="pt-thumb" /><div className="pt-row-lines"><div className="pt-bar" style={{ width: '64%' }} /><div className="pt-bar" style={{ width: '38%' }} /></div><span className="pt-price">$50</span></div>
                    <div className="pt-subrow"><span>Subtotal</span><span>$129</span></div>
                    <div className="pt-subrow"><span>Shipping</span><span>Free</span></div>
                    <div className="pt-total"><span>Total</span><b>$129</b></div>
                  </div>
                )}
                {step === 1 && (
                  <div className="pt-screen-body">
                    <div className="pt-screen-title">Shipping address</div>
                    <div className="pt-field" /><div className="pt-field" />
                    <div className="pt-field-row"><div className="pt-field" /><div className="pt-field" /></div>
                    <div className="pt-field" />
                  </div>
                )}
                {step === 2 && (
                  <div className="pt-screen-body">
                    <div className="pt-screen-title">Payment details</div>
                    <div className="pt-field" />
                    <div className="pt-field-row"><div className="pt-field" /><div className="pt-field" /></div>
                    <div className="pt-field" />
                    <div className="pt-total"><span>Total due</span><b>$129</b></div>
                  </div>
                )}
                {step === 3 && (
                  <div className="pt-confirm">
                    <span className="pt-confirm-check">✓</span>
                    <div className="pt-confirm-title">Order confirmed</div>
                    <div className="pt-confirm-sub">Task complete — nice work</div>
                  </div>
                )}

                {step < 3 && (
                  <button type="button" className="pt-primary" onClick={() => apiRef.current?.advance()}>
                    {STEP_BTN[step]}
                  </button>
                )}
              </>
            ) : (
              <div className="pt-results">
                <div className="pt-results-status">✓ Task completed</div>
                <div className="pt-results-sub">40 of 40 participants</div>
                <div className="pt-results-grid">
                  <div className="pt-stat"><span className="pt-stat-num" style={{ color: '#16a34a' }}>88%</span><span className="pt-stat-lbl">Task success</span></div>
                  <div className="pt-stat"><span className="pt-stat-num">76%</span><span className="pt-stat-lbl">Directness</span></div>
                  <div className="pt-stat"><span className="pt-stat-num">1m 52s</span><span className="pt-stat-lbl">Avg. time</span></div>
                  <div className="pt-stat"><span className="pt-stat-num" style={{ color: '#f97316' }}>2</span><span className="pt-stat-lbl">Wrong paths</span></div>
                </div>
                <button type="button" className="pt-restart" onClick={() => apiRef.current?.restart()}>↻ Run the task again</button>
              </div>
            )}

            {interactive && phase === 'flow' && step < 3 && (
              <div
                ref={cursorRef}
                className={`demo-cursor pt-cursor${cur && !cur.following ? ' is-hint' : ''}`}
                data-label={cur?.following ? 'you' : 'Tap to continue'}
                style={cur ? { transform: `translate(${cur.x}px, ${cur.y}px)` } : undefined}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24"><path d="M5 3l14 7-5.6 1.6L11 19 5 3z" /></svg>
              </div>
            )}

            {interactive && phase === 'analyzing' && (
              <div className="pt-analyzing" aria-hidden="true"><span className="lw-spinner" />Analyzing…</div>
            )}
          </div>
          <div className="pt-home-ind" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
