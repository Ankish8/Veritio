'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { LiveWebsiteTask, LiveWebsiteSettings } from './types'
import type { BrandingSettings } from '@/components/builders/shared/types'

interface RecordingControllerProps {
  studyId: string
  shareCode: string
  tasks: LiveWebsiteTask[]
  settings: LiveWebsiteSettings
  branding?: BrandingSettings
  sessionToken?: string
  getWebsiteUrl: () => string
  isRecording: boolean
  onAllTasksComplete: () => void
  stopRecordingWithTranscript: () => Promise<void>
  /** Think-aloud prompt state — relayed to companion via postMessage */
  showThinkAloudPrompt?: boolean
  thinkAloudPromptText?: string
  onThinkAloudDismiss?: () => void
}

export function RecordingController({
  studyId,
  shareCode,
  tasks,
  settings,
  branding,
  sessionToken,
  getWebsiteUrl,
  isRecording,
  onAllTasksComplete,
  stopRecordingWithTranscript,
  showThinkAloudPrompt,
  thinkAloudPromptText,
  onThinkAloudDismiss,
}: RecordingControllerProps) {
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [tabClosed, setTabClosed] = useState(false)
  const [completing, setCompleting] = useState(false)
  const websiteTabRef = useRef<Window | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  const onThinkAloudDismissRef = useRef(onThinkAloudDismiss)
  useEffect(() => { onThinkAloudDismissRef.current = onThinkAloudDismiss }, [onThinkAloudDismiss])

  const handleCompletion = useCallback(async () => {
    if (completedRef.current) return
    completedRef.current = true
    setCompleting(true)
    try {
      await stopRecordingWithTranscript()
    } catch { /* continue */ }
    onAllTasksComplete()
  }, [stopRecordingWithTranscript, onAllTasksComplete])

  const openWebsite = useCallback(() => {
    let url = getWebsiteUrl()
    // Append session params
    const separator = url.includes('?') ? '&' : '?'
    const params = [
      sessionToken ? `__veritio_session=${encodeURIComponent(sessionToken)}` : '',
      `__veritio_study=${encodeURIComponent(studyId)}`,
      `__veritio_share=${encodeURIComponent(shareCode)}`,
    ].filter(Boolean).join('&')
    url = url + separator + params

    const tab = window.open(url, '_blank')
    if (!tab) {
      setPopupBlocked(true)
      return
    }
    websiteTabRef.current = tab
    setPopupBlocked(false)
    setTabClosed(false)
  }, [getWebsiteUrl, sessionToken, studyId, shareCode])

  // Send task data to companion when it signals ready
  const sendTaskData = useCallback(() => {
    if (!websiteTabRef.current || websiteTabRef.current.closed) return
    websiteTabRef.current.postMessage({
      type: 'lwt-init',
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        instructions: t.instructions,
        target_url: t.target_url,
        time_limit_seconds: t.time_limit_seconds,
        success_criteria_type: t.success_criteria_type,
        success_url: t.success_url,
        success_path: t.success_path,
        post_task_questions: t.post_task_questions,
      })),
      settings: {
        widgetPosition: settings.widgetPosition || 'bottom-right',
        blockBeforeStart: settings.blockBeforeStart ?? true,
        allowSkipTasks: settings.allowSkipTasks,
        showTaskProgress: settings.showTaskProgress,
        defaultTimeLimitSeconds: settings.defaultTimeLimitSeconds,

        completionButtonText: settings.completionButtonText || 'I completed this task',
      },
      branding: {
        primaryColor: branding?.primaryColor || null,
        logoUrl: branding?.logo?.url || null,
      },
      shareCode,
      frontendBase: window.location.origin,
    }, '*')
  }, [tasks, settings, branding, shareCode])

  // Open website + set up BroadcastChannel + listen for companion ready
  useEffect(() => {
    openWebsite() // eslint-disable-line react-hooks/set-state-in-effect

    // Listen for companion signals via postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'lwt-companion-ready') {
        sendTaskData()
      }
      // Handle task completion via postMessage (works cross-origin, unlike BroadcastChannel)
      if (event.data?.type === 'lwt-tasks-complete' || event.data?.type === 'lwt-complete') {
        handleCompletion()
      }
      // Handle think-aloud dismiss from companion
      if (event.data?.type === 'lwt-think-aloud-dismissed') {
        onThinkAloudDismissRef.current?.()
      }
    }
    window.addEventListener('message', handleMessage)

    // Set up BroadcastChannel
    try {
      const channel = new BroadcastChannel('veritio-lwt-' + shareCode)
      channelRef.current = channel
      channel.onmessage = (event) => {
        const data = event.data
        if (data?.type === 'lwt-tasks-complete' || data?.type === 'lwt-complete') {
          handleCompletion()
        }
      }
    } catch { /* BroadcastChannel not supported */ }

    // Poll for tab closed
    pollRef.current = setInterval(() => {
      if (websiteTabRef.current && websiteTabRef.current.closed && !completedRef.current) {
        setTabClosed(true)
      }
    }, 2000)

    return () => {
      window.removeEventListener('message', handleMessage)
      if (channelRef.current) {
        try { channelRef.current.close() } catch {}
      }
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Relay think-aloud prompt state to companion via postMessage
  useEffect(() => {
    const tab = websiteTabRef.current
    if (!tab || tab.closed) return
    if (showThinkAloudPrompt && thinkAloudPromptText) {
      tab.postMessage({ type: 'lwt-think-aloud-show', prompt: thinkAloudPromptText }, '*')
    } else {
      tab.postMessage({ type: 'lwt-think-aloud-hide' }, '*')
    }
  }, [showThinkAloudPrompt, thinkAloudPromptText])

  const handleReopen = () => {
    setTabClosed(false)
    openWebsite()
  }

  const handleStopAndSubmit = () => {
    handleCompletion()
  }

  const brandColor = branding?.primaryColor || '#0f172a'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-md mx-auto text-center">
      {/* Recording indicator dot */}
      {isRecording && !completing && (
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--style-text-primary, #1e293b)' }}>
            Recording in progress
          </span>
        </div>
      )}

      {completing && (
        <div className="mb-6">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ color: brandColor }} />
          <p className="text-sm" style={{ color: 'var(--style-text-secondary, #64748b)' }}>
            Stopping recording and submitting...
          </p>
        </div>
      )}

      {!completing && (
        <>
          {/* Main instruction */}
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--style-text-primary, #1e293b)' }}>
            Complete the tasks on the website
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--style-text-secondary, #64748b)' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} to complete. The task widget on the website will guide you.
          </p>

          {/* Popup blocked warning */}
          {popupBlocked && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <p className="font-medium mb-1">Pop-up blocked</p>
              <p className="text-xs mb-2">Your browser blocked the website tab. Click below to open it manually.</p>
              <button
                onClick={openWebsite}
                className="px-4 py-1.5 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: brandColor }}
              >
                Open website
              </button>
            </div>
          )}

          {/* Tab closed warning */}
          {tabClosed && !popupBlocked && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
              <p className="font-medium mb-1">Website tab was closed</p>
              <p className="text-xs mb-2">Reopen the website to continue your tasks.</p>
              <button
                onClick={handleReopen}
                className="px-4 py-1.5 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: brandColor }}
              >
                Reopen website
              </button>
            </div>
          )}

          {/* Stop & submit button */}
          <button
            onClick={handleStopAndSubmit}
            className="text-sm mt-4 underline transition-opacity hover:opacity-70"
            style={{ color: 'var(--style-text-secondary, #64748b)' }}
          >
            Stop recording &amp; submit
          </button>
        </>
      )}
    </div>
  )
}
