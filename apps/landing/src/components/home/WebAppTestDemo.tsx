'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Subtle, user-driven take on the real "Live Website Test": a participant does
// a task on the live site while it records (capture); when they end the task —
// Mark complete (success) or Skip (abandoned) — results appear (usability score
// + click-map heatmap built from the clicks captured). No auto-advance.
//
// The "participant" cursor parks on the Pricing nav link (the task target) with
// a "Tap to open pricing" hint, and follows the real pointer when you drive.

type Phase = 'capture' | 'analyzing' | 'results'
type Outcome = 'success' | 'abandoned'

// Fallback hotspots for the results heatmap when no clicks were captured.
const SEED_PTS = [
  { x: 0.42, y: 0.62 },
  { x: 0.6, y: 0.42 },
  { x: 0.82, y: 0.13 },
]

const RESULTS: Record<Outcome, {
  score: number
  color: string
  label: string
  status: string
  bar: { w: number; c: string }[]
}> = {
  success: {
    score: 78,
    color: '#16a34a',
    label: '84% task success',
    status: 'Task completed',
    bar: [{ w: 56, c: '#16a34a' }, { w: 28, c: '#86efac' }, { w: 16, c: '#ef4444' }],
  },
  abandoned: {
    score: 42,
    color: '#ef4444',
    label: 'Task abandoned',
    status: 'Abandoned · skipped',
    bar: [{ w: 18, c: '#16a34a' }, { w: 14, c: '#86efac' }, { w: 68, c: '#ef4444' }],
  },
}

export default function WebAppTestDemo() {
  const [interactive, setInteractive] = useState(false)
  const [phase, setPhase] = useState<Phase>('capture')
  const [outcome, setOutcome] = useState<Outcome>('success')
  const [live, setLive] = useState(false)
  const [time, setTime] = useState('0:00')
  const [clicks, setClicks] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ complete: () => void; skip: () => void; restart: () => void } | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  useEffect(() => {
    if (!interactive) return
    const stage = stageRef.current
    const canvas = canvasRef.current
    const cursorEl = cursorRef.current
    const markers = markersRef.current
    if (!stage || !canvas || !cursorEl || !markers) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let phaseNow: Phase = 'capture'
    let isLive = false
    const pointer = { x: 0, y: 0 }
    let clickPts: { x: number; y: number }[] = []
    let secs = 0
    let secInterval = 0
    let captureRaf = 0
    let heatRaf = 0
    let analyzeTimer = 0
    let lastPx = -1
    let lastPy = -1
    let overUi = false

    const placeCursor = (x: number, y: number) => {
      cursorEl.style.transform = `translate(${x}px, ${y}px)`
    }
    // Park the participant cursor on the Pricing nav link (the task target).
    const placeOnPricing = () => {
      const btn = stage.querySelector('.lw-nav-pricing')
      if (!btn) return
      const sr = stage.getBoundingClientRect()
      const br = btn.getBoundingClientRect()
      placeCursor(br.left - sr.left + br.width * 0.5 - 4, br.top - sr.top + br.height * 0.5 - 2)
    }

    let css = { w: stage.clientWidth, h: stage.clientHeight }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      css = { w: stage.clientWidth, h: stage.clientHeight }
      canvas.width = Math.round(css.w * dpr)
      canvas.height = Math.round(css.h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!isLive && phaseNow === 'capture') placeOnPricing()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(stage)

    const blob = (x: number, y: number, r: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(239,68,68,${a})`)
      g.addColorStop(0.45, `rgba(251,146,60,${a * 0.5})`)
      g.addColorStop(1, 'rgba(251,191,36,0)')
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const ripple = (x: number, y: number) => {
      const el = document.createElement('div')
      el.className = 'demo-ripple'
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      markers.appendChild(el)
      gsap.fromTo(
        el,
        { scale: 0, opacity: 0.4 },
        { scale: 1, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => el.remove() }
      )
    }

    const recordClick = (x: number, y: number) => {
      clickPts.push({ x, y })
      setClicks((c) => c + 1)
      ripple(x, y)
      blob(x, y, 26, 0.09)
    }

    // Paint live heat only while the pointer is actually moving — so a resting
    // mouse (or a lifted finger on touch) doesn't pile heat onto one spot.
    const captureLoop = () => {
      if (phaseNow !== 'capture') return
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,0.02)'
      ctx.fillRect(0, 0, css.w, css.h)
      if (isLive && !overUi && (pointer.x !== lastPx || pointer.y !== lastPy)) {
        blob(pointer.x, pointer.y, 20, 0.035)
        lastPx = pointer.x
        lastPy = pointer.y
      }
      captureRaf = requestAnimationFrame(captureLoop)
    }

    const startTimer = () => {
      window.clearInterval(secInterval)
      secInterval = window.setInterval(() => {
        secs += 1
        setTime(`${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`)
      }, 1000)
    }

    const bloomHeat = () => {
      const seeds = clickPts.length ? clickPts : SEED_PTS.map((p) => ({ x: p.x * css.w, y: p.y * css.h }))
      const pts: { x: number; y: number }[] = []
      seeds.forEach((p) => {
        for (let k = 0; k < 7; k++) {
          pts.push({ x: p.x + (Math.random() - 0.5) * 46, y: p.y + (Math.random() - 0.5) * 40 })
        }
      })
      markers.replaceChildren()
      const start = performance.now()
      const render = () => {
        const t = Math.min(1, (performance.now() - start) / 1000)
        const eased = 1 - Math.pow(1 - t, 3)
        ctx.clearRect(0, 0, css.w, css.h)
        pts.forEach((p) => blob(p.x, p.y, 22, 0.075 * eased))
        if (t < 1) heatRaf = requestAnimationFrame(render)
      }
      heatRaf = requestAnimationFrame(render)
    }

    const endCapture = (result: Outcome) => {
      if (phaseNow !== 'capture') return
      phaseNow = 'analyzing'
      setPhase('analyzing')
      setOutcome(result)
      setLive(false)
      isLive = false
      window.clearInterval(secInterval)
      cancelAnimationFrame(captureRaf)
      analyzeTimer = window.setTimeout(() => {
        phaseNow = 'results'
        setPhase('results')
        bloomHeat()
      }, 600)
    }

    const startCapture = () => {
      window.clearTimeout(analyzeTimer)
      cancelAnimationFrame(heatRaf)
      phaseNow = 'capture'
      setPhase('capture')
      isLive = false
      setLive(false)
      clickPts = []
      setClicks(0)
      secs = 0
      setTime('0:00')
      markers.replaceChildren()
      ctx.clearRect(0, 0, css.w, css.h)
      placeOnPricing()
      startTimer()
      captureRaf = requestAnimationFrame(captureLoop)
    }

    apiRef.current = {
      complete: () => endCapture('success'),
      skip: () => endCapture('abandoned'),
      restart: () => {
        if (phaseNow === 'results') startCapture()
      },
    }

    const onUi = (e: PointerEvent) => !!(e.target as Element)?.closest?.('.lw-ui')
    const onMove = (e: PointerEvent) => {
      if (phaseNow !== 'capture') return
      const rect = stage.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      // Follow the pointer everywhere (so the cursor stays visible over the
      // nav/task buttons); only skip heat painting while over the UI.
      overUi = onUi(e)
      if (!isLive) {
        isLive = true
        setLive(true)
      }
      placeCursor(pointer.x, pointer.y)
    }
    const onDown = (e: PointerEvent) => {
      if (phaseNow !== 'capture' || onUi(e)) return
      const rect = stage.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      if (!isLive) {
        isLive = true
        setLive(true)
      }
      placeCursor(pointer.x, pointer.y)
      recordClick(pointer.x, pointer.y)
    }
    const onLeave = () => {
      if (phaseNow !== 'capture') return
      isLive = false
      setLive(false)
      placeOnPricing()
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerdown', onDown)
    stage.addEventListener('pointerleave', onLeave)

    startCapture()

    return () => {
      window.clearInterval(secInterval)
      window.clearTimeout(analyzeTimer)
      cancelAnimationFrame(captureRaf)
      cancelAnimationFrame(heatRaf)
      ro.disconnect()
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerdown', onDown)
      stage.removeEventListener('pointerleave', onLeave)
      apiRef.current = null
    }
  }, [interactive])

  const data = RESULTS[outcome]
  const stageClass = `web-app-stage${interactive ? ` is-interactive lw-phase-${phase}${live ? ' is-live' : ''}` : ''}`

  return (
    <div className="showcase-mockup-inner" style={{ padding: 0 }}>
      <div ref={stageRef} className={stageClass}>
        {/* The participant's live site (abstracted) */}
        <div className="hm-page lw-site" style={{ borderRadius: '16px' }}>
          <div className="hm-page-nav lw-ui">
            <div className="hm-page-logo"></div>
            <div className="lw-navcenter">
              <span className="lw-navtext">Home</span>
              <span className="lw-navtext">Features</span>
              <button type="button" className="lw-navtext lw-nav-pricing" onClick={() => apiRef.current?.complete()}>
                Pricing
              </button>
            </div>
            <div className="lw-navright">
              <span className="lw-navtext">Log in</span>
              <span className="lw-navbtn">Sign up</span>
            </div>
          </div>
          <div className="hm-page-body">
            <div className="hm-page-h"></div>
            <div className="hm-page-p"></div>
            <div className="hm-page-p" style={{ width: '55%' }}></div>
            <div className="hm-page-btns">
              <div className="hm-page-btn"></div>
              <div className="hm-page-btn"></div>
            </div>
          </div>
          <div style={{ padding: '16px 28px 28px' }}>
            <div className="hm-page-p" style={{ width: '92%' }}></div>
            <div className="hm-page-p" style={{ width: '78%' }}></div>
          </div>
        </div>

        <div className="lw-dim" aria-hidden="true" />
        {interactive && <canvas ref={canvasRef} className="heat-canvas" aria-hidden="true" />}
        {interactive && <div ref={markersRef} className="lw-markers" aria-hidden="true" />}

        {/* Recording indicator — top-left */}
        <div className="lw-rec lw-ui" aria-hidden="true">
          <span className="lw-rec-dot" />REC<span className="lw-rec-time">{interactive ? time : '0:12'}</span>
        </div>

        {/* Floating task widget */}
        <div className="lw-task lw-ui">
          <div className="lw-task-head">
            <span className="lw-task-step">Task 2 of 3</span>
            <span className="lw-task-dots" aria-hidden="true"><i className="is-done" /><i className="is-active" /><i /></span>
          </div>
          <div className="lw-task-title">Find and open the pricing page</div>
          <div className="lw-task-actions">
            <button type="button" className="lw-task-skip" onClick={() => apiRef.current?.skip()}>Skip</button>
            <button type="button" className="lw-task-done" onClick={() => apiRef.current?.complete()}>Mark complete</button>
          </div>
        </div>

        {/* Results summary */}
        <div className="lw-results lw-ui">
          <div className="lw-results-top">
            <span className="lw-status" style={{ color: data.color }}>{data.status}</span>
            <span className="lw-stats">{clicks} clicks &middot; {time}</span>
          </div>
          <div className="lw-results-label">Usability score</div>
          <div className="lw-score">
            <span className="lw-score-num" style={{ color: data.color }}>{data.score}</span>
            <span className="lw-score-success">{data.label}</span>
          </div>
          <div className="lw-perf-label">Task performance</div>
          <div className="lw-perf-bar">
            {data.bar.map((s, i) => <span key={i} style={{ width: `${s.w}%`, background: s.c }} />)}
          </div>
          <div className="lw-legend">
            <span><i style={{ background: '#16a34a' }} />Direct</span>
            <span><i style={{ background: '#86efac' }} />Indirect</span>
            <span><i style={{ background: '#ef4444' }} />Abandoned</span>
          </div>
          <button type="button" className="lw-restart" onClick={() => apiRef.current?.restart()}>↻ Run the task again</button>
        </div>

        {interactive && <div className="lw-clickmap-tag lw-ui" aria-hidden="true">Click map · Pricing page</div>}

        {interactive && (
          <div
            ref={cursorRef}
            className={`demo-cursor${!live ? ' is-hint' : ''}`}
            data-label={live ? 'you' : 'Tap to open pricing'}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24"><path d="M5 3l14 7-5.6 1.6L11 19 5 3z" /></svg>
          </div>
        )}

        {interactive && (
          <div className="lw-analyzing lw-ui" aria-hidden="true">
            <span className="lw-spinner" />Analyzing session…
          </div>
        )}
      </div>
    </div>
  )
}
