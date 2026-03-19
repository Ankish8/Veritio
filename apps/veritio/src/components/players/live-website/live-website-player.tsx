'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { toast } from '@/components/ui/sonner'
import { RecordingConsentScreen } from '../shared/recording-consent-screen'
import { RecordingIndicator } from '../shared/recording-indicator'
import { ThinkAloudPrompt } from '../shared/think-aloud-prompt'
import { PostTaskQuestionsScreen } from '../shared/post-task-questions-screen'
import { SubmittingScreenBase } from '../shared/screen-layout'
import { ThinkAloudEducationScreen, EyeTrackingCalibrationScreen } from '@veritio/study-flow/player'
import { RecordingController } from './recording-controller'
import { usePlayerRecording } from '@/hooks/use-player-recording'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { DEFAULT_THINK_ALOUD, DEFAULT_EYE_TRACKING } from '@/components/builders/shared/types'
import { buildTaskResponse } from './task-response-utils'
import type { PostTaskQuestion } from '@veritio/study-types'
import type { BrandingSettings, ThinkAloudSettings, EyeTrackingSettings } from '@/components/builders/shared/types'
import type { RecordingSettings } from '@/hooks/use-player-recording'
import type { PostTaskQuestionResponse } from '../shared/post-task-questions-screen'
import type { LiveWebsiteTask, LiveWebsiteSettings, TaskResponse, LiveWebsitePhase } from './types'
import DOMPurify from 'dompurify'
import { usePipManager } from './use-pip-manager'
import { PipTaskWidget } from './pip-task-widget'
import type { ConfirmAction } from './pip-task-widget'

export interface AbVariant {
  id: string
  name: string
  url: string
  weight: number
  position: number
}

interface LiveWebsitePlayerProps {
  studyId: string
  shareCode: string
  tasks: LiveWebsiteTask[]
  settings: LiveWebsiteSettings
  branding?: BrandingSettings
  embeddedMode?: boolean
  onComplete: () => void
  previewMode?: boolean
  preventionData?: {
    cookieId?: string | null
    fingerprintHash?: string | null
    fingerprintConfidence?: number | null
  }
  sessionToken?: string
  participantId?: string
  participantDemographicData?: Record<string, string> | null
  assignedVariantId?: string | null
  abVariants?: AbVariant[]
}

export function LiveWebsitePlayer({
  studyId,
  shareCode,
  tasks,
  settings,
  branding,
  embeddedMode: _embeddedMode,
  onComplete,
  previewMode,
  preventionData,
  sessionToken,
  participantId,
  participantDemographicData,
  assignedVariantId,
  abVariants,
}: LiveWebsitePlayerProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const thinkAloudSettings: ThinkAloudSettings = settings.thinkAloud?.enabled
    ? { ...DEFAULT_THINK_ALOUD, ...settings.thinkAloud }
    : DEFAULT_THINK_ALOUD

  const recordingSettings = useMemo<RecordingSettings>(() => {
    const mic = settings.recordMicrophone ?? true
    const thinkAloud = thinkAloudSettings.enabled ? thinkAloudSettings : undefined
    if (settings.recordScreen && settings.recordWebcam) return { enabled: true, captureMode: mic ? 'video_and_audio' : 'video_only', thinkAloud }
    if (settings.recordScreen) return { enabled: true, captureMode: mic ? 'screen_and_audio' : 'screen_only', thinkAloud }
    if (mic) return { enabled: true, captureMode: 'audio', thinkAloud }
    return { enabled: false, captureMode: 'audio' }
  }, [settings.recordScreen, settings.recordWebcam, settings.recordMicrophone, thinkAloudSettings])

  const isRecordingControllerMode = settings.mode === 'reverse_proxy' || settings.mode === 'snippet'

  const eyeTrackingSettings: EyeTrackingSettings = settings.eyeTracking?.enabled
    ? { ...DEFAULT_EYE_TRACKING, ...settings.eyeTracking }
    : DEFAULT_EYE_TRACKING

  const showThinkAloudEducation = thinkAloudSettings.enabled && thinkAloudSettings.showEducation
  const showEyeTrackingCalibration = eyeTrackingSettings.enabled && eyeTrackingSettings.showCalibration
  const [phase, setPhase] = useState<LiveWebsitePhase>(recordingSettings.enabled ? 'recording-consent' : 'task-instructions')
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const responsesRef = useRef<TaskResponse[]>([])
  const taskStartTimeRef = useRef<number>(0)
  const timeLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTaskCompleteRef = useRef<() => void>(() => {})
  const hasSubmittedRef = useRef(false)

  const [inlineConfirmAction, setInlineConfirmAction] = useState<ConfirmAction>(null)

  const currentTask = tasks[currentTaskIndex]
  const isLastTask = currentTaskIndex === tasks.length - 1

  // Compute post-task questions once per task instead of in multiple callbacks
  const postTaskQuestions = useMemo(
    () => castJsonArray<PostTaskQuestion>(currentTask?.post_task_questions as any),
    [currentTask?.post_task_questions]
  )

  const { isRecording, isUploading, uploadProgress, recordingError, startRecording, stopRecordingWithTranscript, showPrompt, currentPrompt, dismissPrompt } =
    usePlayerRecording({
      studyId,
      participantId: participantId || '',
      sessionToken: sessionToken || '',
      recordingSettings,
      preferFullScreen: true,
    })

  const nextPhaseAfterConsent = useMemo((): LiveWebsitePhase => {
    if (showThinkAloudEducation) return 'think-aloud-education'
    if (showEyeTrackingCalibration) return 'eye-tracking-calibration'
    if (isRecordingControllerMode) return 'recording-controller'
    return 'task-instructions'
  }, [showThinkAloudEducation, showEyeTrackingCalibration, isRecordingControllerMode])

  // Recording consent handlers
  const handleRecordingConsent = useCallback((preAcquiredStreams?: MediaStream[]) => {
    startRecording(preAcquiredStreams).catch(() => { /* continue without recording */ })
    setPhase(nextPhaseAfterConsent)
  }, [startRecording, nextPhaseAfterConsent])

  const handleRecordingDecline = useCallback(() => {
    setPhase(nextPhaseAfterConsent)
  }, [nextPhaseAfterConsent])

  const handleThinkAloudEducationComplete = useCallback(() => {
    if (showEyeTrackingCalibration) {
      setPhase('eye-tracking-calibration')
    } else {
      setPhase(isRecordingControllerMode ? 'recording-controller' : 'task-instructions')
    }
  }, [isRecordingControllerMode, showEyeTrackingCalibration])

  const handleEyeTrackingCalibrationComplete = useCallback(() => {
    setPhase(isRecordingControllerMode ? 'recording-controller' : 'task-instructions')
  }, [isRecordingControllerMode])

  const sessionIdRef = useRef(`sess_${crypto.randomUUID()}`)

  // When AB testing is enabled, use the assigned variant's URL instead of the global websiteUrl
  const effectiveWebsiteUrl = useMemo(() => {
    if (settings.abTestingEnabled && abVariants && assignedVariantId) {
      const variant = abVariants.find(v => v.id === assignedVariantId)
      if (variant?.url) return variant.url
    }
    return settings.websiteUrl
  }, [settings, abVariants, assignedVariantId])

  // URL doesn't change mid-task, so compute as memo rather than callback
  const websiteUrl = useMemo(() => {
    if (!currentTask) return ''
    // Use task target_url (may include per-variant starting_url override) when set,
    // otherwise fall back to variant base URL or global website URL
    let urlToOpen = currentTask.target_url || effectiveWebsiteUrl
    if (settings.mode === 'reverse_proxy' && settings.snippetId) {
      try {
        const targetOrigin = new URL(urlToOpen).origin
        const b64Origin = btoa(targetOrigin)
        const path = urlToOpen.replace(targetOrigin, '') || '/'
        const proxyWorkerUrl = process.env.NEXT_PUBLIC_PROXY_WORKER_URL || 'https://your-proxy-worker.workers.dev'
        const apiOverride = typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? `&__api=${encodeURIComponent('http://localhost:4000')}` : ''
        const variantParam = assignedVariantId ? `&__variant=${encodeURIComponent(assignedVariantId)}` : ''
        const sessionParam = sessionToken ? `&__veritio_session=${encodeURIComponent(sessionToken)}` : ''
        const shareParam = shareCode ? `&__veritio_share=${encodeURIComponent(shareCode)}` : ''
        urlToOpen = `${proxyWorkerUrl}/p/${studyId}/${settings.snippetId}/${b64Origin}${path}?__sess=${sessionIdRef.current}${apiOverride}${variantParam}${sessionParam}${shareParam}`
      } catch { /* fallback to direct */ }
    }
    return urlToOpen
  }, [currentTask, effectiveWebsiteUrl, settings.mode, settings.snippetId, studyId, assignedVariantId, sessionToken, shareCode])

  // Wrapped as getter for usePipManager which needs a function reference
  const getWebsiteUrl = useCallback(() => websiteUrl, [websiteUrl])

  const advanceToNextTask = useCallback(() => {
    taskStartTimeRef.current = 0
    setInlineConfirmAction(null)
    setCurrentTaskIndex(prev => {
      const next = prev + 1
      if (next >= tasks.length) {
        setPhase('complete')
        return prev
      }
      setPhase('task-instructions')
      return next
    })
  }, [tasks.length])

  const submitResponses = useCallback(async () => {
    await stopRecordingWithTranscript()
    if (previewMode) { onComplete(); return }
    // In recording-controller mode (reverse_proxy/snippet), the companion script
    // submits task responses via /api/snippet/:snippetId/submit. The player should
    // only submit demographic data (if any) — NOT duplicate the task submission.
    // Sending an empty responses array here would mark the participant completed
    // before the companion's real responses arrive, causing a race condition.
    const isCompanionMode = isRecordingControllerMode
    try {
      await fetch(`/api/participate/${shareCode}/live-website/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          sessionId: sessionIdRef.current,
          responses: isCompanionMode ? [] : responsesRef.current,
          demographicData: participantDemographicData ?? null,
          cookieId: preventionData?.cookieId,
          fingerprintHash: preventionData?.fingerprintHash,
          fingerprintConfidence: preventionData?.fingerprintConfidence,
          variantId: assignedVariantId ?? null,
          companionSubmitted: isCompanionMode,
        }),
      })
    } catch { /* silent */ }
    onComplete()
  }, [shareCode, sessionToken, previewMode, preventionData, onComplete, stopRecordingWithTranscript, participantDemographicData, assignedVariantId, isRecordingControllerMode])

  useEffect(() => {
    if (phase === 'complete' && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true
      submitResponses()
    }
  }, [phase, submitResponses])

  // startTimeLimitTimer ref — breaks circular dependency with usePipManager
  const startTimeLimitTimerRef = useRef<() => void>(() => {})

  const { pipWindowRef, pipContainer, pipPtqActiveRef, closePip, handleOpenWebsite: _handleOpenWebsite } = usePipManager({
    currentTask,
    phase,
    getWebsiteUrl,
    startTimeLimitTimer: () => startTimeLimitTimerRef.current(),
    onPipClosed: (wasPtqActive) => {
      if (wasPtqActive) setPhase('post-task-questions')
    },
    onPhaseChange: setPhase,
    onFallbackOpen: () => { taskStartTimeRef.current = Date.now() },
  })

  // Time limit timer
  const startTimeLimitTimer = useCallback(() => {
    if (!currentTask) return
    if (timeLimitTimerRef.current) { clearTimeout(timeLimitTimerRef.current); timeLimitTimerRef.current = null }
    const timeLimit = currentTask.time_limit_seconds ?? settings.defaultTimeLimitSeconds
    if (!timeLimit) return
    timeLimitTimerRef.current = setTimeout(() => {
      toast.info('Time limit reached for this task')
      closePip()
      responsesRef.current = [...responsesRef.current, buildTaskResponse(currentTask.id, taskStartTimeRef.current, 'timed_out')]
      advanceToNextTask()
    }, timeLimit * 1000)
  }, [currentTask, settings.defaultTimeLimitSeconds, advanceToNextTask, closePip])
  startTimeLimitTimerRef.current = startTimeLimitTimer

  // PiP "Complete task" — stops timer, PiP shows PTQ or "Task finished!" state
  const handlePipComplete = useCallback(() => {
    if (timeLimitTimerRef.current) { clearTimeout(timeLimitTimerRef.current); timeLimitTimerRef.current = null }
    if (postTaskQuestions.length > 0) {
      pipPtqActiveRef.current = true
    }
  }, [postTaskQuestions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Advance to next task while keeping PIP open (avoids transient-activation loss from close/reopen)
  const pipAdvanceToNextTask = useCallback((postTaskResponses?: Array<{ questionId: string; value: unknown }>) => {
    if (!currentTask) return
    pipPtqActiveRef.current = false

    responsesRef.current = [...responsesRef.current, buildTaskResponse(currentTask.id, taskStartTimeRef.current, 'completed', postTaskResponses)]
    taskStartTimeRef.current = 0
    setInlineConfirmAction(null)

    if (isLastTask) {
      closePip()
      window.focus()
      setPhase('complete')
    } else {
      // Keep PIP open for next task — resize back to normal, reposition to bottom-right
      const pip = pipWindowRef.current
      try {
        pip?.resizeTo(380, 480)
        setTimeout(() => { try { pip?.resizeTo(380, 480) } catch {} }, 100)
        // Re-anchor to bottom-right after resize settles
        setTimeout(() => {
          try {
            const scr = window.screen as any
            const x = (scr.availLeft ?? 0) + window.screen.availWidth - (pip?.outerWidth || 380)
            const y = (scr.availTop ?? 0) + window.screen.availHeight - (pip?.outerHeight || 480)
            pip?.moveTo(x, y)
          } catch {}
        }, 200)
      } catch {}
      setCurrentTaskIndex(prev => prev + 1)
      // Phase stays 'task-active' — PIP stays open, no requestWindow() needed
    }
  }, [currentTask, isLastTask, closePip]) // eslint-disable-line react-hooks/exhaustive-deps

  // PiP "Continue" — no-PTQ path: keep PIP open, record response, advance to next task
  const handlePipContinue = useCallback(() => {
    pipAdvanceToNextTask()
  }, [pipAdvanceToNextTask])

  // Inline fallback (non-PiP) complete
  const handleInlineComplete = useCallback(() => {
    closePip()
    if (timeLimitTimerRef.current) { clearTimeout(timeLimitTimerRef.current); timeLimitTimerRef.current = null }
    onTaskCompleteRef.current()
  }, [closePip])

  // Skip task
  const handleSkipTask = useCallback(() => {
    if (!currentTask) return
    closePip()
    window.focus()
    if (timeLimitTimerRef.current) { clearTimeout(timeLimitTimerRef.current); timeLimitTimerRef.current = null }
    taskStartTimeRef.current = 0
    responsesRef.current = [...responsesRef.current, buildTaskResponse(currentTask.id, 0, 'skipped')]
    advanceToNextTask()
  }, [currentTask, advanceToNextTask, closePip])

  // PiP "Open website" — starts the timer (called from <a> click inside PiP)
  const handlePipStartTask = useCallback(() => {
    taskStartTimeRef.current = Date.now()
    startTimeLimitTimer()
  }, [startTimeLimitTimer])

  const recordResponseAndAdvance = useCallback((postTaskResponses?: Array<{ questionId: string; value: unknown }>) => {
    if (!currentTask) return
    responsesRef.current = [...responsesRef.current, buildTaskResponse(currentTask.id, taskStartTimeRef.current, 'completed', postTaskResponses)]
    advanceToNextTask()
  }, [currentTask, advanceToNextTask])

  // PiP PTQ complete — keep PIP open, record response with PTQ data, advance to next task
  const handlePipContinueWithResponses = useCallback((ptResponses: PostTaskQuestionResponse[]) => {
    pipAdvanceToNextTask(ptResponses.map(r => ({ questionId: r.questionId, value: r.value })))
  }, [pipAdvanceToNextTask])

  const handleTaskComplete = useCallback(() => {
    if (!currentTask) return
    if (postTaskQuestions.length > 0) {
      setPhase('post-task-questions')
    } else {
      recordResponseAndAdvance()
    }
  }, [currentTask, postTaskQuestions.length, recordResponseAndAdvance])

  // Keep ref in sync so stable callbacks (handlePipContinue, handleInlineComplete) always call the latest version
  onTaskCompleteRef.current = handleTaskComplete

  const handlePostTaskComplete = useCallback((ptResponses: PostTaskQuestionResponse[]) => {
    recordResponseAndAdvance(ptResponses.map(r => ({ questionId: r.questionId, value: r.value })))
  }, [recordResponseAndAdvance])

  // Close PiP when leaving task-active phase
  useEffect(() => {
    if (phase !== 'task-active') closePip()
  }, [phase, closePip])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeLimitTimerRef.current) clearTimeout(timeLimitTimerRef.current)
      if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close() // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Render ---------- */

  if (!currentTask) return null

  if (phase === 'recording-consent') {
    return (
      <RecordingConsentScreen
        captureMode={recordingSettings.captureMode}
        studyType="live_website_test"
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        allowDecline={false}
        requestPermissionsInline
        preferFullScreen
      />
    )
  }

  if (phase === 'think-aloud-education') {
    return <ThinkAloudEducationScreen onComplete={handleThinkAloudEducationComplete} />
  }

  if (phase === 'eye-tracking-calibration') {
    return <EyeTrackingCalibrationScreen onComplete={handleEyeTrackingCalibrationComplete} />
  }

  // All remaining phases show RecordingIndicator — render once
  const recordingIndicator = (
    <RecordingIndicator isRecording={isRecording} isUploading={isUploading} uploadProgress={uploadProgress} error={recordingError} />
  )

  if (phase === 'recording-controller') {
    return (
      <>
        {recordingIndicator}
        <RecordingController
          studyId={studyId}
          shareCode={shareCode}
          tasks={tasks}
          settings={settings}
          branding={branding}
          sessionToken={sessionToken}
          getWebsiteUrl={getWebsiteUrl}
          isRecording={isRecording}
          onAllTasksComplete={() => setPhase('complete')}
          stopRecordingWithTranscript={stopRecordingWithTranscript}
          showThinkAloudPrompt={showPrompt}
          thinkAloudPromptText={currentPrompt}
          onThinkAloudDismiss={dismissPrompt}
        />
      </>
    )
  }

  // task-instructions phase is skipped by the auto-open effect above,
  // but render recording indicator while the effect fires
  if (phase === 'task-instructions') {
    return <>{recordingIndicator}</>
  }

  if (phase === 'task-active') {
    const hasPip = !!pipContainer
    return (
      <>
        {recordingIndicator}

        {/* When PiP is active: minimal waiting screen on main tab */}
        {hasPip && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-lg mx-auto text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--style-text-secondary)' }}>
              A floating task panel is on your screen. Complete the task on the website tab.
            </p>
            <button
              onClick={() => setInlineConfirmAction('complete')}
              className="py-2 px-4 rounded-lg text-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              Complete task from here instead
            </button>
          </div>
        )}

        {/* Fallback inline widget — shown when PiP is not available (Firefox/Safari) */}
        {!hasPip && (
          <InlineFallbackTaskWidget
            task={currentTask}
            taskIndex={currentTaskIndex}
            totalTasks={tasks.length}
            showTaskProgress={settings.showTaskProgress}
            allowSkipTasks={settings.allowSkipTasks}
            onConfirmAction={setInlineConfirmAction}
          />
        )}

        {/* Inline confirmation overlay */}
        {inlineConfirmAction && (
          <InlineConfirmDialog
            action={inlineConfirmAction}
            onConfirm={() => { const action = inlineConfirmAction; setInlineConfirmAction(null); if (action === 'complete') handleInlineComplete(); else handleSkipTask() }}
            onCancel={() => setInlineConfirmAction(null)}
          />
        )}

        {/* Think-aloud prompt — rendered in main document for non-PiP (participant sees study tab) */}
        {thinkAloudSettings.enabled && !hasPip && (
          <ThinkAloudPrompt
            visible={showPrompt}
            prompt={currentPrompt}
            onDismiss={dismissPrompt}
            position={thinkAloudSettings.promptPosition}
            autoDismissSeconds={10}
          />
        )}

        {/* PiP portal — React component rendered inside the PiP window */}
        {pipContainer && createPortal(
          <>
          {/* Think-aloud prompt — rendered inside PiP so participant sees it alongside the website */}
          {thinkAloudSettings.enabled && (
            <ThinkAloudPrompt
              visible={showPrompt}
              prompt={currentPrompt}
              onDismiss={dismissPrompt}
              position={thinkAloudSettings.promptPosition}
              autoDismissSeconds={10}
            />
          )}
          <PipTaskWidget
            key={currentTaskIndex}
            task={{ title: currentTask.title, instructions: currentTask.instructions || '' }}
            taskIndex={currentTaskIndex}
            totalTasks={tasks.length}
            showProgress={settings.showTaskProgress}
            allowSkip={settings.allowSkipTasks}
            brandColor={branding?.primaryColor}
            logoUrl={branding?.logo?.url}
            websiteUrl={websiteUrl}
            pipWindow={pipWindowRef.current}
            postTaskQuestions={postTaskQuestions}
            onStartTask={handlePipStartTask}
            onComplete={handlePipComplete}
            onContinue={handlePipContinue}
            onContinueWithResponses={handlePipContinueWithResponses}
            onSkip={handleSkipTask}
          />
          </>,
          pipContainer
        )}
      </>
    )
  }

  if (phase === 'complete') {
    return (
      <>
        {recordingIndicator}
        <SubmittingScreenBase message={isUploading ? `Uploading recording... ${uploadProgress}%` : 'Submitting your responses...'} />
      </>
    )
  }

  if (phase === 'post-task-questions' && currentTask) {
    return (
      <>
        {recordingIndicator}
        <PostTaskQuestionsScreen questions={postTaskQuestions} onComplete={handlePostTaskComplete} taskNumber={currentTaskIndex + 1} />
      </>
    )
  }

  return null
}

/* ---------- Extracted sub-components ---------- */

interface InlineFallbackTaskWidgetProps {
  task: LiveWebsiteTask
  taskIndex: number
  totalTasks: number
  showTaskProgress: boolean
  allowSkipTasks: boolean
  onConfirmAction: (action: 'complete' | 'skip') => void
}

function InlineFallbackTaskWidget({
  task,
  taskIndex,
  totalTasks,
  showTaskProgress,
  allowSkipTasks,
  onConfirmAction,
}: InlineFallbackTaskWidgetProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-lg mx-auto">
      {showTaskProgress && (
        <p className="text-sm mb-4" style={{ color: 'var(--style-text-secondary)' }}>
          Task {taskIndex + 1} of {totalTasks}
        </p>
      )}
      <h2 className="text-xl font-semibold mb-2 text-center" style={{ color: 'var(--style-text-primary)' }}>
        {task.title || `Task ${taskIndex + 1}`}
      </h2>
      {task.instructions && (
        <div
          className="text-sm mb-6 text-center [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          style={{ color: 'var(--style-text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.instructions) }}
        />
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => onConfirmAction('complete')}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Mark as complete
        </button>
        {allowSkipTasks && (
          <button
            onClick={() => onConfirmAction('skip')}
            className="w-full py-2 px-4 rounded-lg text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--style-text-secondary)' }}
          >
            Skip task
          </button>
        )}
      </div>
      <p className="text-xs mt-6" style={{ color: 'var(--style-text-secondary)', opacity: 0.6 }}>
        The website opened in a new tab. Return here when done.
      </p>
    </div>
  )
}

interface InlineConfirmDialogProps {
  action: 'complete' | 'skip'
  onConfirm: () => void
  onCancel: () => void
}

function InlineConfirmDialog({ action, onConfirm, onCancel }: InlineConfirmDialogProps) {
  const isComplete = action === 'complete'
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-lg"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--style-text-primary, #1e293b)' }}>
          {isComplete ? 'Mark task as complete?' : 'Skip this task?'}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--style-text-secondary, #64748b)', lineHeight: 1.5 }}>
          {isComplete
            ? "Confirm that you've finished this task on the website."
            : "Are you sure? You won't be able to come back to it."}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: isComplete ? 'var(--brand, #0f172a)' : '#ef4444' }}
          >
            {isComplete ? 'Yes, mark complete' : 'Yes, skip task'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-lg text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--style-text-secondary, #64748b)' }}
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
