'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Mirrors the real "First-Click Test": show a single design, ask "where would you
// click to do X?", and record the FIRST click location. Results read as a click
// map / heatmap over the design plus a success rate (clicks inside the correct
// target area) and the average time to first click.
//
// Here the design is an abstracted account/billing screen and the task is
// "Where would you click to upgrade your plan?" — the correct target is the
// primary "Upgrade plan" button. Every click drops a marker (green = inside the
// target, red = miss), feeds a canvas heatmap, and updates the running stats.
// Once the visitor has clicked, a compact RESULTS panel slides in next to the
// click map, mirroring Veritio's real First-Click analysis: success rate with a
// 95% Wilson confidence interval, avg time to first click, total responses, and a
// click-distribution breakdown (Upgrade button vs other areas of the screen).
// Reduced-motion / SSR renders a static wireframe with a few heat dots + 72% / 1.8s.

type ClickPt = { x: number; y: number; hit: boolean }

// Seed responses so the very first click already reads as part of a study,
// and so the static fallback stats line up (~72% hit, ~1.8s avg).
const SEED = {
  hits: 18,
  total: 25,
  timeMs: 25 * 1800,
  // Where the seeded "other" clicks landed (the 7 misses), as a plausible
  // distribution across the rest of the screen for the breakdown bar.
  zones: { target: 18, topbar: 3, content: 3, secondary: 1 },
}

type Zone = keyof typeof SEED.zones
const ZONE_LABEL: Record<Zone, string> = {
  target: 'Upgrade button',
  content: 'Plan details',
  secondary: 'Other cards',
  topbar: 'Top navigation',
}

// 95% Wilson score interval — the same method the real analysis uses. Honest:
// with few samples the band is wide; it tightens as responses accumulate.
function wilson95(hits: number, total: number): { lo: number; hi: number } {
  if (total === 0) return { lo: 0, hi: 0 }
  const z = 1.96
  const p = hits / total
  const z2 = z * z
  const denom = 1 + z2 / total
  const center = p + z2 / (2 * total)
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)
  const lo = Math.max(0, (center - margin) / denom)
  const hi = Math.min(1, (center + margin) / denom)
  return { lo: Math.round(lo * 100), hi: Math.round(hi * 100) }
}

export default function FirstClickDemo() {
  const [interactive, setInteractive] = useState(false)
  const [pts, setPts] = useState<ClickPt[]>([])
  const [hits, setHits] = useState(SEED.hits)
  const [total, setTotal] = useState(SEED.total)
  const [totalTimeMs, setTotalTimeMs] = useState(SEED.timeMs)
  const [zones, setZones] = useState<Record<Zone, number>>({ ...SEED.zones })
  const [last, setLast] = useState<'hit' | 'miss' | null>(null)
  const [revealed, setRevealed] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const markersRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLButtonElement>(null)
  const cssRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  // Timestamp the prompt became "live" so we can record time-to-first-click.
  const armedAtRef = useRef<number>(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setInteractive(true)
  }, [])

  // Canvas heatmap: devicePixelRatio-aware, resized via ResizeObserver.
  useEffect(() => {
    if (!interactive) return
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = stage.clientWidth
      const h = stage.clientHeight
      cssRef.current = { w, h }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    armedAtRef.current = performance.now()
    return () => ro.disconnect()
  }, [interactive])

  const blob = (x: number, y: number, hit: boolean) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const r = 30
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    if (hit) {
      g.addColorStop(0, 'rgba(34,197,94,0.34)')
      g.addColorStop(0.5, 'rgba(34,197,94,0.16)')
      g.addColorStop(1, 'rgba(34,197,94,0)')
    } else {
      g.addColorStop(0, 'rgba(239,68,68,0.32)')
      g.addColorStop(0.5, 'rgba(251,146,60,0.14)')
      g.addColorStop(1, 'rgba(239,68,68,0)')
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const dropMarker = (x: number, y: number, hit: boolean) => {
    const markers = markersRef.current
    if (!markers) return
    const el = document.createElement('div')
    el.className = `fcd-marker${hit ? ' is-hit' : ' is-miss'}`
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    markers.appendChild(el)
    // Click ripple at the same point.
    const ring = document.createElement('div')
    ring.className = `fcd-ripple${hit ? ' is-hit' : ' is-miss'}`
    ring.style.left = `${x}px`
    ring.style.top = `${y}px`
    markers.appendChild(ring)
    gsap.fromTo(
      ring,
      { scale: 0, opacity: 0.5 },
      { scale: 1, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => ring.remove() },
    )
    gsap.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.32, ease: 'back.out(2.4)' })
  }

  // Classify a miss into a screen region so the distribution breakdown is honest
  // about *where* off-target clicks landed (top nav vs plan details vs other cards).
  const classifyMiss = (relX: number, relY: number): Zone => {
    // relY/relX are 0..1 within the stage. The design starts ~70px down (top nav),
    // the plan card sits mid, and the mini cards are near the bottom.
    if (relY < 0.22) return 'topbar'
    if (relY > 0.74) return 'secondary'
    return 'content'
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    // Ignore clicks on chrome (prompt bar, results, reset) — only the design counts.
    if ((e.target as Element)?.closest?.('.fcd-ui')) return
    const stage = stageRef.current
    const target = targetRef.current
    if (!stage || !target) return
    const sr = stage.getBoundingClientRect()
    const x = e.clientX - sr.left
    const y = e.clientY - sr.top
    if (x < 0 || y < 0 || x > sr.width || y > sr.height) return

    const tr = target.getBoundingClientRect()
    const pad = 4
    const hit =
      e.clientX >= tr.left - pad &&
      e.clientX <= tr.right + pad &&
      e.clientY >= tr.top - pad &&
      e.clientY <= tr.bottom + pad

    blob(x, y, hit)
    dropMarker(x, y, hit)

    const elapsed = Math.min(6000, Math.max(400, performance.now() - armedAtRef.current))
    armedAtRef.current = performance.now()

    const zone: Zone = hit ? 'target' : classifyMiss(x / sr.width, y / sr.height)

    setPts((p) => [...p, { x, y, hit }])
    setTotal((t) => t + 1)
    setTotalTimeMs((t) => t + elapsed)
    setZones((z) => ({ ...z, [zone]: z[zone] + 1 }))
    if (hit) setHits((h) => h + 1)
    setLast(hit ? 'hit' : 'miss')
    setRevealed(true)
  }

  const reset = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, cssRef.current.w, cssRef.current.h)
    markersRef.current?.replaceChildren()
    setPts([])
    setHits(SEED.hits)
    setTotal(SEED.total)
    setTotalTimeMs(SEED.timeMs)
    setZones({ ...SEED.zones })
    setLast(null)
    setRevealed(false)
    armedAtRef.current = performance.now()
  }

  const rate = total > 0 ? Math.round((hits / total) * 100) : 0
  const avg = total > 0 ? (totalTimeMs / total / 1000).toFixed(1) : '0.0'
  const yourClicks = pts.length
  const ci = wilson95(hits, total)

  // Click distribution across regions, sorted with the target first.
  const zoneOrder: Zone[] = ['target', 'content', 'secondary', 'topbar']
  const dist = zoneOrder
    .map((z) => ({ zone: z, count: zones[z], pct: total > 0 ? Math.round((zones[z] / total) * 100) : 0 }))
    .filter((d) => d.count > 0)

  const root = `showcase-mockup-inner fcd-demo${interactive ? ' is-interactive' : ''}${
    revealed ? ' is-revealed' : ''
  }${last ? ` last-${last}` : ''}`

  return (
    <div className={root} style={{ padding: 0 }}>
      <div className="fcd-split">
        <div ref={stageRef} className="fcd-stage" onPointerDown={onPointerDown}>
          {/* Task prompt bar */}
          <div className="fcd-prompt fcd-ui">
            <span className="fcd-prompt-dot" aria-hidden="true" />
            <span className="fcd-prompt-text">Where would you click to upgrade your plan?</span>
          </div>

          {/* The design under test (abstracted account / billing screen) */}
          <div className="fcd-design" aria-hidden="true">
            <div className="fcd-topbar">
              <span className="fcd-logo" />
              <span className="fcd-tabs">
                <i />
                <i />
                <i className="is-active" />
              </span>
              <span className="fcd-avatar" />
            </div>

            <div className="fcd-body">
              <div className="fcd-h" />
              <div className="fcd-card">
                <div className="fcd-card-head">
                  <span className="fcd-bar" style={{ width: '38%' }} />
                  <span className="fcd-pill">Starter</span>
                </div>
                <span className="fcd-bar" style={{ width: '72%' }} />
                <span className="fcd-bar" style={{ width: '54%' }} />
                <div className="fcd-card-foot">
                  <span className="fcd-bar" style={{ width: '30%' }} />
                  {/* The correct target zone */}
                  <button ref={targetRef} type="button" className="fcd-target" tabIndex={-1}>
                    Upgrade plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {interactive && <canvas ref={canvasRef} className="fcd-canvas" aria-hidden="true" />}
          {interactive && <div ref={markersRef} className="fcd-markers" aria-hidden="true" />}

          {/* Static heat dots — only for the reduced-motion / SSR fallback */}
          {!interactive && (
            <div className="fcd-static-heat" aria-hidden="true">
              <span className="fcd-static-dot d1" />
              <span className="fcd-static-dot d2" />
              <span className="fcd-static-dot d3" />
              <span className="fcd-static-dot d4" />
              <span className="fcd-static-dot d5" />
            </div>
          )}

          {interactive && yourClicks === 0 && (
            <div className="fcd-hint fcd-ui" aria-hidden="true">
              Click the design
            </div>
          )}

        </div>

        {/* Results appear only after the visitor records a first click — before
            that the design stays front and center (no premature "waiting" panel). */}
        {interactive && revealed && (
          <div className="fcd-analysis fcd-ui" aria-live="polite">
            <div className="fcd-analysis-head">
              <span className="fcd-analysis-title">First-click results</span>
              <span className="fcd-analysis-sub">{total} responses &middot; {avg}s avg time</span>
            </div>
            <div className="fcd-headline">
              <span className="fcd-headline-num">{rate}%</span>
              <div className="fcd-headline-meta">
                <span className="fcd-headline-lbl">clicked the correct area</span>
                <span className="fcd-ci">95% CI {ci.lo}–{ci.hi}%</span>
              </div>
              <button type="button" className="fcd-reset" onClick={reset}>↻ Run again</button>
            </div>
            <div className="fcd-dist">
              {dist.slice(0, 3).map((d) => (
                <div key={d.zone} className="fcd-dist-row">
                  <span className="fcd-dist-name">
                    <span
                      className={`fcd-dist-swatch${d.zone === 'target' ? ' is-target' : ''}`}
                      aria-hidden="true"
                    />
                    {ZONE_LABEL[d.zone]}
                  </span>
                  <span className="fcd-dist-track" aria-hidden="true">
                    <span
                      className={`fcd-dist-fill${d.zone === 'target' ? ' is-target' : ''}`}
                      style={{ width: `${d.pct}%` }}
                    />
                  </span>
                  <span className="fcd-dist-pct">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Static fallback results (reduced-motion / SSR) */}
        {!interactive && (
          <div className="fcd-analysis fcd-ui">
            <div className="fcd-analysis-head">
              <span className="fcd-analysis-title">First-click results</span>
              <span className="fcd-analysis-sub">25 responses</span>
            </div>
            <div className="fcd-headline">
              <span className="fcd-headline-num">72%</span>
              <div className="fcd-headline-meta">
                <span className="fcd-headline-lbl">clicked the correct area</span>
                <span className="fcd-ci">95% CI 52–86%</span>
              </div>
            </div>
            <div className="fcd-kpis">
              <div className="fcd-kpi">
                <span className="fcd-kpi-num">1.8s</span>
                <span className="fcd-kpi-lbl">avg. time to click</span>
              </div>
              <div className="fcd-kpi">
                <span className="fcd-kpi-num">25</span>
                <span className="fcd-kpi-lbl">total responses</span>
              </div>
            </div>
            <div className="fcd-dist">
              <span className="fcd-dist-head">Click distribution</span>
              <div className="fcd-dist-row">
                <span className="fcd-dist-name">
                  <span className="fcd-dist-swatch is-target" aria-hidden="true" />
                  Upgrade button
                </span>
                <span className="fcd-dist-track" aria-hidden="true">
                  <span className="fcd-dist-fill is-target" style={{ width: '72%' }} />
                </span>
                <span className="fcd-dist-pct">72%</span>
              </div>
              <div className="fcd-dist-row">
                <span className="fcd-dist-name">
                  <span className="fcd-dist-swatch" aria-hidden="true" />
                  Plan details
                </span>
                <span className="fcd-dist-track" aria-hidden="true">
                  <span className="fcd-dist-fill" style={{ width: '16%' }} />
                </span>
                <span className="fcd-dist-pct">16%</span>
              </div>
              <div className="fcd-dist-row">
                <span className="fcd-dist-name">
                  <span className="fcd-dist-swatch" aria-hidden="true" />
                  Top navigation
                </span>
                <span className="fcd-dist-track" aria-hidden="true">
                  <span className="fcd-dist-fill" style={{ width: '12%' }} />
                </span>
                <span className="fcd-dist-pct">12%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
