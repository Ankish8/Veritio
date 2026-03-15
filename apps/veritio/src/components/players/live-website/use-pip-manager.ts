import { useState, useCallback, useRef, useEffect } from 'react'
import { copyStylesToPipWindow } from './pip-utils'
import type { LiveWebsitePhase } from './types'

interface UsePipManagerOptions {
  currentTask: { id: string; target_url: string; post_task_questions: unknown; title: string; instructions: string | null } | undefined
  phase: LiveWebsitePhase
  getWebsiteUrl: () => string
  startTimeLimitTimer: () => void
  onPipClosed: (wasPtqActive: boolean) => void
  onPhaseChange: (phase: LiveWebsitePhase) => void
  onFallbackOpen: () => void // called when PiP unavailable — player sets taskStartTimeRef
}

interface UsePipManagerResult {
  pipWindowRef: React.MutableRefObject<Window | null>
  pipContainer: HTMLElement | null
  pipPtqActiveRef: React.MutableRefObject<boolean>
  closePip: () => void
  handleOpenWebsite: () => Promise<void>
}

export function usePipManager(options: UsePipManagerOptions): UsePipManagerResult {
  const { currentTask, phase, getWebsiteUrl, startTimeLimitTimer, onPipClosed, onPhaseChange, onFallbackOpen } = options

  const pipWindowRef = useRef<Window | null>(null)
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null)
  const pipPtqActiveRef = useRef(false)
  const pipAutoOpenedRef = useRef(false)

  const closePip = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close()
    }
    pipWindowRef.current = null
    setPipContainer(null)
  }, [])

  // Open PiP task widget. The PiP opens in 'ready' state with a minimal
  // "Open website" <a> link. The <a> tag inside PiP opens the website using
  // a fresh user activation (click inside PiP), avoiding popup-blockers.
  // Browser limitation: requestWindow() consumes transient activation, so we
  // cannot open both PiP and a new tab from a single click.
  const handleOpenWebsite = useCallback(async () => {
    if (!currentTask) return
    onPhaseChange('task-active')

    if ('documentPictureInPicture' in window) {
      try {
        const pip: Window = await (window as any).documentPictureInPicture.requestWindow({
          width: 380,
          height: 480,
        })
        pipWindowRef.current = pip

        // Chrome PiP remembers the size from a previous session.
        // Force the correct dimensions, then position at bottom-right,
        // then re-assert size (moveTo can cause Chrome to auto-shrink).
        setTimeout(() => {
          try { pip.resizeTo(380, 480) } catch {}
        }, 100)
        setTimeout(() => {
          try {
            const scr2 = window.screen as any
            const x = (scr2.availLeft ?? 0) + window.screen.availWidth - pip.outerWidth
            const y = (scr2.availTop ?? 0) + window.screen.availHeight - pip.outerHeight
            pip.moveTo(x, y)
          } catch {}
        }, 500)
        setTimeout(() => {
          try { pip.resizeTo(380, 480) } catch {}
        }, 650)

        pip.document.documentElement.style.height = '100%'
        pip.document.body.style.margin = '0'
        pip.document.body.style.height = '100%'
        pip.document.body.style.overflow = 'hidden'

        // Add styles for TipTap rich-text content inside PiP
        const style = pip.document.createElement('style')
        style.textContent = `
          /* Base — fallback for plain text newlines */
          .pip-instructions { white-space: pre-wrap; }
          /* Paragraphs */
          .pip-instructions p { margin: 0 0 6px 0; white-space: normal; }
          .pip-instructions p:last-child { margin-bottom: 0; }
          /* Lists */
          .pip-instructions ul, .pip-instructions ol { padding-left: 20px; margin: 4px 0; white-space: normal; }
          .pip-instructions ul { list-style-type: disc; }
          .pip-instructions ol { list-style-type: decimal; }
          .pip-instructions li { margin: 2px 0; }
          .pip-instructions li p { margin: 0; }
          /* Inline formatting */
          .pip-instructions strong { font-weight: 600; color: #1e293b; }
          .pip-instructions em { font-style: italic; }
          .pip-instructions u { text-decoration: underline; }
          .pip-instructions s, .pip-instructions strike { text-decoration: line-through; }
          .pip-instructions a { color: #2563eb; text-decoration: underline; }
          .pip-instructions code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 12px; }
          /* Headings */
          .pip-instructions h1 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 6px; }
          .pip-instructions h2 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 6px; }
          .pip-instructions h3 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 4px; }
          /* Blockquote */
          .pip-instructions blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; margin: 6px 0; color: #475569; font-style: italic; }
          /* Code block */
          .pip-instructions pre { background: #f1f5f9; padding: 8px 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; white-space: normal; }
          .pip-instructions pre code { background: none; padding: 0; font-size: 12px; }
          /* Horizontal rule */
          .pip-instructions hr { border: none; border-top: 1px solid #e2e8f0; margin: 8px 0; }
          /* Table */
          .pip-instructions table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 12px; }
          .pip-instructions th, .pip-instructions td { border: 1px solid #e2e8f0; padding: 4px 8px; text-align: left; }
          .pip-instructions th { background: #f8fafc; font-weight: 600; color: #1e293b; }
          /* Images */
          .pip-instructions img { max-width: 100%; height: auto; border-radius: 4px; margin: 4px 0; }
        `
        pip.document.head.appendChild(style)

        // Copy parent document stylesheets + CSS custom properties for PTQ rendering
        copyStylesToPipWindow(pip)

        const container = pip.document.createElement('div')
        container.style.height = '100%'
        pip.document.body.appendChild(container)
        setPipContainer(container)

        pip.addEventListener('pagehide', () => {
          const wasPtqActive = pipPtqActiveRef.current
          pipPtqActiveRef.current = false
          pipWindowRef.current = null
          setPipContainer(null)
          // If PIP was closed while showing PTQ, fall back to full-page PTQ
          onPipClosed(wasPtqActive)
        })
        return
      } catch {
        // PiP unavailable — fall through to inline fallback
      }
    }

    // Fallback: no PiP support — open website directly, start timer
    window.open(getWebsiteUrl(), '_blank')
    onFallbackOpen()
    startTimeLimitTimer()
  }, [currentTask, startTimeLimitTimer, getWebsiteUrl, onPipClosed, onPhaseChange, onFallbackOpen])

  // Auto-open PiP on task-instructions phase — skips the interstitial page.
  // Uses residual transient activation from the study flow "Next" button click.
  // If activation expired or PiP unavailable, falls through to inline fallback.
  // Reset the guard when leaving task-instructions so it fires again for the next task.
  useEffect(() => {
    if (phase === 'task-instructions') {
      if (!pipAutoOpenedRef.current) {
        pipAutoOpenedRef.current = true
        handleOpenWebsite() // eslint-disable-line react-hooks/set-state-in-effect
      }
    } else {
      pipAutoOpenedRef.current = false
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pipWindowRef,
    pipContainer,
    pipPtqActiveRef,
    closePip,
    handleOpenWebsite,
  }
}
