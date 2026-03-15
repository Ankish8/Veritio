'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { CheckCircle2, SkipForward, ExternalLink, GripHorizontal } from 'lucide-react'

interface TaskData {
  type: 'lwt-task-data'
  task: {
    id: string
    title: string
    instructions: string
  }
  taskIndex: number
  totalTasks: number
  settings: {
    allowSkipTasks: boolean
    showTaskProgress: boolean
  }
  branding?: {
    primaryColor?: string
    logo?: { url: string }
  }
  isRecording: boolean
  websiteUrl: string
  hostedWebsiteUrl: string
}

interface NextTaskMessage {
  type: 'lwt-next-task'
  task: {
    id: string
    title: string
    instructions: string
  }
  taskIndex: number
  totalTasks: number
}

interface CloseMessage {
  type: 'lwt-close'
}

type IncomingMessage = TaskData | NextTaskMessage | CloseMessage

type WidgetState = 'waiting' | 'expanded' | 'active' | 'completed'

export function TaskWidgetClient() {
  const isHostedMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('host') === 'overlay'
  }, [])

  const [state, setState] = useState<WidgetState>('waiting')
  const [task, setTask] = useState<TaskData['task'] | null>(null)
  const [taskIndex, setTaskIndex] = useState(0)
  const [totalTasks, setTotalTasks] = useState(1)
  const [allowSkip, setAllowSkip] = useState(false)
  const [showProgress, setShowProgress] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [websiteUrl, setWebsiteUrl] = useState<string>('')
  const [hostedWebsiteUrl, setHostedWebsiteUrl] = useState<string>('')
  const [panelMinimized, setPanelMinimized] = useState(false)
  const openerRef = useRef<Window | null>(null)

  // Drag state for hosted overlay panel
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const panelSize = useRef({ w: 320, h: 400 })

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag from buttons or interactive elements
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return
    e.preventDefault()
    const panel = (e.target as HTMLElement).closest('[data-drag-panel]') as HTMLElement | null
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    panelSize.current = { w: rect.width, h: rect.height }
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDragging(true)
  }, [])

  const handleDragTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return
    const panel = (e.target as HTMLElement).closest('[data-drag-panel]') as HTMLElement | null
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    panelSize.current = { w: rect.width, h: rect.height }
    const touch = e.touches[0]
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (clientX: number, clientY: number) => {
      const newX = clientX - dragOffset.current.x
      const newY = clientY - dragOffset.current.y
      const maxX = window.innerWidth - panelSize.current.w
      const maxY = window.innerHeight - panelSize.current.h
      setDragPos({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) })
    }
    const onMouseMove = (e: MouseEvent) => { e.preventDefault(); handleMove(e.clientX, e.clientY) }
    const onTouchMove = (e: TouchEvent) => { handleMove(e.touches[0].clientX, e.touches[0].clientY) }
    const onEnd = () => setIsDragging(false)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [isDragging])

  // Apply branding CSS variables
  const applyBranding = useCallback((branding?: TaskData['branding']) => {
    if (!branding?.primaryColor) return
    const root = document.documentElement
    root.style.setProperty('--brand', branding.primaryColor)
    // Simple derived colors
    root.style.setProperty('--brand-light', `color-mix(in srgb, ${branding.primaryColor} 15%, transparent)`)
    root.style.setProperty('--brand-subtle', `color-mix(in srgb, ${branding.primaryColor} 5%, transparent)`)
    if (branding.logo?.url) {
      setLogoUrl(branding.logo.url)
    }
  }, [])

  // Send message to opener
  const sendToOpener = useCallback((msg: { type: string }) => {
    if (openerRef.current && !openerRef.current.closed) {
      openerRef.current.postMessage(msg, '*')
    }
  }, [])

  // Handle incoming messages from opener
  useEffect(() => {
    openerRef.current = window.opener as Window | null

    if (!openerRef.current) {
      // No opener — this page was opened directly, not as a popup
      return
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as IncomingMessage
      if (!data || typeof data.type !== 'string') return

      switch (data.type) {
        case 'lwt-task-data': {
          setTask(data.task)
          setTaskIndex(data.taskIndex)
          setTotalTasks(data.totalTasks)
          setAllowSkip(data.settings.allowSkipTasks)
          setShowProgress(data.settings.showTaskProgress)
          setIsRecording(data.isRecording)
          setWebsiteUrl(data.websiteUrl)
          setHostedWebsiteUrl(data.hostedWebsiteUrl)
          applyBranding(data.branding)
          setState('expanded')
          break
        }
        case 'lwt-next-task': {
          setTask(data.task)
          setTaskIndex(data.taskIndex)
          setTotalTasks(data.totalTasks)
          setState('expanded')
          break
        }
        case 'lwt-close': {
          window.close()
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)

    // Signal to opener that widget is ready
    sendToOpener({ type: 'lwt-widget-ready' })

    return () => window.removeEventListener('message', handleMessage)
  }, [applyBranding, sendToOpener])

  // Close popup if opener is closed
  useEffect(() => {
    const interval = setInterval(() => {
      if (openerRef.current && openerRef.current.closed) {
        window.close()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // In hosted mode the website is already visible behind the widget panel.
  // In fallback popup mode, Start task still opens the website tab.
  const handleStartTask = useCallback(() => {
    if (!isHostedMode && websiteUrl) {
      window.open(websiteUrl, '_blank')
    }
    setState('active')
    sendToOpener({ type: 'lwt-task-start' })
  }, [isHostedMode, sendToOpener, websiteUrl])

  const handleCompleteTask = useCallback(() => {
    setState('completed')
    sendToOpener({ type: 'lwt-task-complete' })
  }, [sendToOpener])

  const handleSkipTask = useCallback(() => {
    setState('completed')
    sendToOpener({ type: 'lwt-task-skip' })
  }, [sendToOpener])

  const handleContinue = useCallback(() => {
    // Tell opener we're ready to continue — it will send lwt-next-task or lwt-close
    sendToOpener({ type: 'lwt-continue' })
    setState('waiting')
  }, [sendToOpener])

  // Waiting state — show loading
  if (state === 'waiting') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--style-page-bg)' }}>
        <div className="animate-pulse text-sm" style={{ color: 'var(--style-text-secondary)' }}>
          Loading task...
        </div>
      </div>
    )
  }

  if (!task) return null

  const widgetPanel = (
    <div
      className="flex flex-col h-full select-none"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--style-border-muted)', backgroundColor: 'var(--style-card-bg)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded shrink-0" style={{ backgroundColor: 'var(--brand)' }} />
          )}
          {showProgress && (
            <span className="text-[13px] font-medium truncate" style={{ color: 'var(--style-text-secondary)' }}>
              Task {taskIndex + 1} of {totalTasks}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isRecording && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-600">REC</span>
            </div>
          )}
          {isHostedMode && state === 'active' && (
            <button
              onClick={() => setPanelMinimized(true)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 transition-colors"
              style={{
                color: 'var(--style-text-secondary)',
                border: '1px solid var(--style-card-border)',
                borderRadius: 6,
                background: 'none',
                cursor: 'pointer',
              }}
            >
              &#x25BE; Hide
            </button>
          )}
        </div>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {state === 'expanded' && (
          <div className="flex flex-col gap-2">
            <h2
              className="text-[15px] font-semibold leading-snug"
              style={{ color: 'var(--style-text-primary)' }}
            >
              {task.title || `Task ${taskIndex + 1}`}
            </h2>
            {task.instructions && (
              <div
                className="text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                style={{ color: 'var(--style-text-secondary)', maxHeight: 140, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: task.instructions }}
              />
            )}
          </div>
        )}

        {state === 'active' && (
          <div className="flex flex-col gap-2">
            <h2
              className="text-sm font-semibold leading-snug"
              style={{ color: 'var(--style-text-primary)' }}
            >
              {task.title || `Task ${taskIndex + 1}`}
            </h2>
            {task.instructions && (
              <div
                className="text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                style={{ color: 'var(--style-text-secondary)', maxHeight: 140, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: task.instructions }}
              />
            )}
          </div>
        )}

        {state === 'completed' && (
          <div className="flex flex-col items-center justify-center py-5 gap-3 text-center">
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-light)' }}
            >
              <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'var(--style-text-primary)' }}
            >
              Task finished!
            </h2>
            <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
              Click Continue to see what's next.
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="px-4 py-3 border-t flex flex-col gap-2"
        style={{ borderColor: 'var(--style-border-muted)', backgroundColor: 'var(--style-card-bg)' }}
      >
        {state === 'expanded' && (
          <>
            <button
              onClick={handleStartTask}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              <span className="flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Start task
              </span>
            </button>
            {allowSkip && (
              <button
                onClick={handleSkipTask}
                className="w-full py-1.5 px-4 rounded-lg text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: 'var(--style-text-secondary)' }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip task
                </span>
              </button>
            )}
          </>
        )}

        {state === 'active' && (
          <>
            <button
              onClick={handleCompleteTask}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              Mark as complete
            </button>
            {allowSkip && (
              <button
                onClick={handleSkipTask}
                className="w-full py-1.5 px-4 rounded-lg text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: 'var(--style-text-secondary)' }}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip task
                </span>
              </button>
            )}
          </>
        )}

        {state === 'completed' && (
          <button
            onClick={handleContinue}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )

  if (isHostedMode) {
    return (
      <div className="relative h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--style-page-bg)' }}>
        {hostedWebsiteUrl || websiteUrl ? (
          <iframe
            src={hostedWebsiteUrl || websiteUrl}
            title="Task website"
            className="absolute inset-0 h-full w-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
              Loading website...
            </p>
          </div>
        )}

        {/* Minimized compact bar */}
        {panelMinimized ? (
          <div
            data-drag-panel
            onMouseDown={handleDragMouseDown}
            onTouchStart={handleDragTouchStart}
            style={{
              position: 'absolute',
              ...(dragPos ? { left: dragPos.x, top: dragPos.y } : { right: 16, bottom: 16 }),
              borderRadius: 10,
              border: '1px solid color-mix(in srgb, var(--style-border-muted) 85%, black 15%)',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
              backgroundColor: 'var(--style-card-bg)',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <GripHorizontal
                className="w-4 h-4 flex-shrink-0 -ml-1"
                style={{ color: 'var(--style-text-muted)', opacity: 0.4 }}
              />
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-5 w-5 rounded object-contain shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded shrink-0" style={{ backgroundColor: 'var(--brand)' }} />
              )}
              {showProgress && (
                <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: 'var(--style-text-secondary)' }}>
                  Task {taskIndex + 1}/{totalTasks}
                </span>
              )}
              <button
                onClick={() => setPanelMinimized(false)}
                className="text-[13px] font-medium px-3 py-1 whitespace-nowrap transition-colors"
                style={{
                  color: 'var(--style-text-secondary)',
                  border: '1px solid var(--style-card-border)',
                  borderRadius: 6,
                  background: 'none',
                  cursor: 'pointer',
                }}
              >
                Show task
              </button>
            </div>
          </div>
        ) : (
          <div
            data-drag-panel
            onMouseDown={handleDragMouseDown}
            onTouchStart={handleDragTouchStart}
            className="w-[320px] overflow-hidden"
            style={{
              position: 'absolute',
              ...(dragPos ? { left: dragPos.x, top: dragPos.y } : { right: 16, bottom: 16 }),
              maxHeight: 400,
              borderRadius: 14,
              border: '1px solid color-mix(in srgb, var(--style-border-muted) 85%, black 15%)',
              boxShadow: '0 12px 40px rgba(15, 23, 42, 0.22)',
            }}
          >
            {/* Drag handle bar */}
            <div
              className="flex items-center justify-center py-1.5"
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                backgroundColor: 'var(--style-card-bg)',
                borderBottom: '1px solid var(--style-border-muted)',
              }}
            >
              <GripHorizontal
                className="w-5 h-5"
                style={{ color: 'var(--style-text-muted)', opacity: 0.35 }}
              />
            </div>
            {widgetPanel}
          </div>
        )}
      </div>
    )
  }

  return <div className="h-screen">{widgetPanel}</div>
}
