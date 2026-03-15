'use client'

import { useState, useCallback, useRef } from 'react'
import {
  ClickImage,
  PostTaskQuestionsScreen,
  SubmittingScreen,
  CompleteScreen,
  ErrorScreen,
} from './components'
import { TaskOverlay } from '@veritio/prototype-test/player/components/task-overlay'
import { SkipConfirmationDialog } from '@veritio/prototype-test/player/components/skip-confirmation-dialog'
import type { PanelCorner } from '@veritio/prototype-test/player/types'
import { useClickTracking } from './hooks/use-click-tracking'
import { RecordingConsentScreen } from '../shared/recording-consent-screen'
import { RecordingIndicator } from '../shared/recording-indicator'
import { ThinkAloudEducationScreen } from '../shared/think-aloud-education-screen'
import { ThinkAloudPrompt } from '../shared/think-aloud-prompt'
import { AudioLevelIndicator } from '../shared/audio-level-indicator'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { cn } from '@/lib/utils'
import type { FirstClickTaskWithDetails } from '@/stores/study-builder'
import type { FirstClickTestSettings, PostTaskQuestion } from '@veritio/study-types'
import type { FirstClickPhase, ClickResponse, ClickData } from './types'
import { useSessionRecording } from '@/hooks/use-session-recording'
import { useRecordingEventCapture } from '@/hooks/use-recording-event-capture'
import { useSilenceDetection } from '@/hooks/use-silence-detection'
import { useThinkAloudPrompts } from '@/hooks/use-think-aloud-prompts'
import { useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import { DEFAULT_THINK_ALOUD } from '@/components/builders/shared/types'

interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

interface FirstClickPlayerProps {
  studyId: string
  shareCode: string
  tasks: FirstClickTaskWithDetails[]
  settings: FirstClickTestSettings
  embeddedMode?: boolean
  previewMode?: boolean
  sessionToken?: string
  participantId?: string
  onComplete?: () => void
  preventionData?: ResponsePreventionData
}

export function FirstClickPlayer({
  studyId,
  shareCode,
  tasks,
  settings,
  embeddedMode = false,
  previewMode = false,
  sessionToken: propSessionToken,
  participantId: propParticipantId,
  onComplete,
  preventionData,
}: FirstClickPlayerProps) {
  // Get demographic data from study flow store (collected during identifier step)
  const participantDemographicData = useStudyFlowPlayerStore(
    (state) => state.participantDemographicData
  )

  // Phase for terminal states (post_task_questions, submitting, complete)
  const [phase, setPhase] = useState<FirstClickPhase>('task_active')
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, ClickResponse | 'skipped'>>(new Map())
  // Ref mirrors state so callbacks always read the latest value (avoids stale closure on last task)
  const responsesRef = useRef<Map<string, ClickResponse | 'skipped'>>(responses)
  const [postTaskAnswers, setPostTaskAnswers] = useState<Record<string, any>>({})
  const postTaskAnswersRef = useRef<Record<string, any>>(postTaskAnswers)
  const [hasShownRecordingConsent, setHasShownRecordingConsent] = useState(false)

  // Track task attempt IDs for per-task recording correlation
  const [taskAttemptIds, setTaskAttemptIds] = useState<Record<string, string>>({})

  // Recording settings
  const recordingEnabled = settings.sessionRecordingSettings?.enabled ?? false
  const recordingScope = settings.sessionRecordingSettings?.recordingScope ?? 'session'
  const thinkAloudSettings = settings.sessionRecordingSettings?.thinkAloud ?? DEFAULT_THINK_ALOUD

  // Get current task's attempt ID for per-task recording
  const currentTask = tasks[currentTaskIndex]
  const currentTaskAttemptId = currentTask ? taskAttemptIds[currentTask.id] : undefined

  // Skip confirmation dialog state
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)

  // Task overlay state (matches prototype testing pattern)
  const startImmediately = settings.startTasksImmediately ?? false
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(!startImmediately)
  const [taskStarted, setTaskStarted] = useState(startImmediately)

  const { startTask, recordClick } = useClickTracking()

  // Session recording hook (conditionally enabled)
  const {
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingId,
    recordingStartTime,
    mediaStream,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useSessionRecording({
    studyId,
    participantId: propParticipantId || '',
    sessionToken: propSessionToken || '',
    captureMode: settings.sessionRecordingSettings?.captureMode || 'audio',
    scope: recordingScope,
    taskAttemptId: recordingScope === 'task' ? currentTaskAttemptId : undefined,
  })

  // Recording event capture
  const { captureCustomEvent } = useRecordingEventCapture({
    recordingId,
    recordingStartTime,
    sessionToken: propSessionToken ?? null,
    isRecording,
  })

  // Silence detection for think-aloud (uses Deepgram transcription with audio level fallback)
  const { audioLevel, isSpeaking, isSilent, silenceDuration, saveTranscript: saveLiveTranscript } = useSilenceDetection({
    mediaStream,
    enabled: isRecording && thinkAloudSettings.enabled,
    mode: 'auto', // Try Deepgram transcription first, fallback to audio levels
    studyId,
    participantId: propParticipantId || '',
    sessionToken: propSessionToken || '',
    audioLevelThreshold: thinkAloudSettings.audioLevelThreshold,
    silenceThresholdSeconds: thinkAloudSettings.silenceThresholdSeconds,
  })

  // Think-aloud prompts management
  const { showPrompt, currentPrompt, dismissPrompt } = useThinkAloudPrompts({
    enabled: thinkAloudSettings.enabled && isRecording,
    isSilent,
    customPrompts: thinkAloudSettings.customPrompts,
    captureCustomEvent,
    silenceDuration,
  })

  const isLastTask = currentTaskIndex === tasks.length - 1

  // Recording consent handlers - generates taskAttemptId for first task
  const handleRecordingConsent = useCallback(async () => {
    // Generate taskAttemptId for the first task
    if (currentTask && !taskAttemptIds[currentTask.id]) {
      const taskAttemptId = crypto.randomUUID()
      setTaskAttemptIds(prev => ({ ...prev, [currentTask.id]: taskAttemptId }))
    }

    try {
      await startRecording()
    } catch {
      // Recording failed to start - continue without it
    }
    setHasShownRecordingConsent(true)

    // Transition to think-aloud education if enabled
    if (thinkAloudSettings.enabled && thinkAloudSettings.showEducation) {
      setPhase('think_aloud_education')
    }
  }, [startRecording, currentTask, taskAttemptIds, thinkAloudSettings])

  const handleRecordingDecline = useCallback(() => {
    setHasShownRecordingConsent(true)
  }, [])

  // Handle think-aloud education completion
  const handleThinkAloudEducationComplete = useCallback(() => {
    setPhase('task_active')
  }, [])

  // Handle starting a task (clicking "Start task" button)
  const handleStartTask = useCallback(() => {
    setTaskStarted(true)
    setIsOverlayExpanded(false)
    startTask()

    // Capture task start event
    captureCustomEvent('task_start', {
      task_id: currentTask?.id,
      task_number: currentTaskIndex + 1,
      instruction: currentTask?.instruction,
    })
  }, [startTask, captureCustomEvent, currentTask, currentTaskIndex])

  // Handle resuming task (clicking "Continue" when re-expanding panel)
  const handleResumeTask = useCallback(() => {
    setIsOverlayExpanded(false)
  }, [])

  // Handle toggle expand/collapse
  const handleToggleExpand = useCallback((expanded: boolean) => {
    setIsOverlayExpanded(expanded)
  }, [])

  const handleImageClick = useCallback((clickData: ClickData) => {
    if (!currentTask || !taskStarted || isOverlayExpanded) return

    const clickResponse = recordClick(clickData, currentTask.aois)
    const updated = new Map(responsesRef.current).set(currentTask.id, clickResponse)
    responsesRef.current = updated
    setResponses(updated)

    // Capture click event for recording
    captureCustomEvent('first_click', {
      task_id: currentTask.id,
      task_number: currentTaskIndex + 1,
      x: clickData.x,
      y: clickData.y,
      time_to_click_ms: clickResponse.timeToClickMs,
      is_correct: clickResponse.isCorrect,
      matched_aoi_id: clickResponse.matchedAoiId,
    })

    // Capture separate AOI hit event for clearer timeline visualization
    if (clickResponse.matchedAoiId) {
      const matchedAoi = currentTask.aois?.find(aoi => aoi.id === clickResponse.matchedAoiId)
      captureCustomEvent('aoi_hit', {
        task_id: currentTask.id,
        aoi_id: clickResponse.matchedAoiId,
        aoi_name: matchedAoi?.name || '',
        is_correct: clickResponse.isCorrect,
      })
    }

    // Check if task has post-task questions
    const postTaskQuestions = castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
    if (postTaskQuestions.length > 0) {
      setPhase('post_task_questions')
    } else {
      handleNextTask()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask, taskStarted, isOverlayExpanded, recordClick, captureCustomEvent, currentTaskIndex])

  // Handle skip click - shows confirmation dialog
  const handleSkipClick = useCallback(() => {
    setShowSkipConfirmation(true)
  }, [])

  // Handle confirming skip in the dialog
  const handleConfirmSkip = useCallback(() => {
    setShowSkipConfirmation(false)
    if (!currentTask) return

    const updated = new Map(responsesRef.current).set(currentTask.id, 'skipped')
    responsesRef.current = updated
    setResponses(updated)

    // Capture skip event for recording
    captureCustomEvent('task_skip', {
      task_id: currentTask.id,
      task_number: currentTaskIndex + 1,
    })

    const postTaskQuestions = castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
    if (postTaskQuestions.length > 0) {
      setPhase('post_task_questions')
    } else {
      handleNextTask()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask, captureCustomEvent, currentTaskIndex])

  const handleNextTask = useCallback(async () => {
    if (isLastTask) {
      // Stop recording if active before submitting
      if (isRecording) {
        try {
          // Save live transcript before stopping recording (avoids post-recording transcription costs)
          if (recordingId && thinkAloudSettings.enabled) {
            await saveLiveTranscript(recordingId).catch(() => {
              // Non-blocking - live transcript save failure shouldn't block submission
            })
          }
          await stopRecording()
        } catch {
          // Recording stop failed - continue with submission anyway
        }
      }

      if (previewMode) {
        setPhase('complete')
        onComplete?.()
      } else {
        setPhase('submitting')

        // Build response data from refs (always current, avoids stale closure)
        const currentPostTaskAnswers = postTaskAnswersRef.current
        const responseData = Array.from(responsesRef.current.entries()).map(([taskId, response]) => {
          if (response === 'skipped') {
            return { taskId, skipped: true, postTaskResponses: currentPostTaskAnswers[taskId] || [] }
          }
          return {
            taskId,
            click: response,
            skipped: false,
            postTaskResponses: currentPostTaskAnswers[taskId] || [],
          }
        })

        try {
          const apiResponse = await fetch(`/api/participate/${shareCode}/first-click/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionToken: propSessionToken,
              responses: responseData,
              demographicData: participantDemographicData ?? null,
              // Use || undefined so JSON.stringify omits missing keys (Zod .optional() rejects null)
              cookieId: preventionData?.cookieId || undefined,
              fingerprintHash: preventionData?.fingerprintHash || undefined,
              fingerprintConfidence: preventionData?.fingerprintConfidence || undefined,
            }),
          })

          if (!apiResponse.ok) {
            const errorBody = await apiResponse.json().catch(() => ({}))
            throw new Error(errorBody.error || `Submit failed (${apiResponse.status})`)
          }

          setPhase('complete')
          onComplete?.()
        } catch {
          // Still complete — participant already saw the test, retrying isn't possible
          setPhase('complete')
          onComplete?.()
        }
      }
    } else {
      // Capture task end event
      captureCustomEvent('task_end', {
        task_id: currentTask?.id,
        task_number: currentTaskIndex + 1,
      })

      // For per-task recording, stop current and prepare for next
      if (recordingScope === 'task' && isRecording) {
        // Save live transcript before stopping recording (avoids post-recording transcription costs)
        if (recordingId && thinkAloudSettings.enabled) {
          saveLiveTranscript(recordingId).catch(() => {
            // Non-blocking - live transcript save failure shouldn't block task transition
          })
        }
        // Stop current task's recording (fire-and-forget)
        stopRecording()
      }

      const nextTaskIndex = currentTaskIndex + 1
      const nextTask = tasks[nextTaskIndex]

      // Generate taskAttemptId for next task
      if (nextTask && !taskAttemptIds[nextTask.id]) {
        const taskAttemptId = crypto.randomUUID()
        setTaskAttemptIds(prev => ({ ...prev, [nextTask.id]: taskAttemptId }))
      }

      // Reset phase FIRST before changing task index to avoid brief flash of wrong screen
      setPhase('task_active')
      setCurrentTaskIndex(nextTaskIndex)
      // Reset overlay state for new task
      setTaskStarted(startImmediately)
      setIsOverlayExpanded(!startImmediately)

      // For per-task recording, start new recording for next task
      if (recordingScope === 'task' && recordingEnabled) {
        // Small delay to ensure state updates have propagated
        setTimeout(() => {
          startRecording().catch(() => {})
        }, 100)
      }

      if (startImmediately) {
        startTask()
      }
    }
  }, [isLastTask, previewMode, onComplete, startImmediately, startTask, isRecording, stopRecording, startRecording, captureCustomEvent, currentTask, currentTaskIndex, recordingScope, recordingEnabled, tasks, taskAttemptIds, shareCode, propSessionToken, participantDemographicData, preventionData, recordingId, thinkAloudSettings.enabled, saveLiveTranscript])

  const handlePostTaskComplete = useCallback((answers: Record<string, any>) => {
    const updated = { ...postTaskAnswersRef.current, ...answers }
    postTaskAnswersRef.current = updated
    setPostTaskAnswers(updated)
    handleNextTask()
  }, [handleNextTask])

  // Get panel position from settings
  const panelPosition: PanelCorner = (settings.taskInstructionPosition || settings.task_instruction_position || 'top-left') as PanelCorner

  // Recording consent screen (shown before first task if recording enabled)
  if (recordingEnabled && !hasShownRecordingConsent && !isRecording && !recordingError) {
    return (
      <RecordingConsentScreen
        captureMode={settings.sessionRecordingSettings?.captureMode || 'audio'}
        studyType="first_click"
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        allowDecline
        privacyNotice={settings.sessionRecordingSettings?.privacyNotice}
      />
    )
  }

  // Think-aloud education screen (shown after recording consent if enabled)
  if (phase === 'think_aloud_education') {
    return (
      <ThinkAloudEducationScreen
        onComplete={handleThinkAloudEducationComplete}
      />
    )
  }

  // Task Active - Show image with TaskOverlay (morphs between expanded and collapsed)
  const taskImage = currentTask?.image
  const showTaskPhase = phase === 'task_active' && currentTask && taskImage
  if (showTaskPhase) {
    const scalingMode = settings.imageScaling || 'fit'
    const isNeverScale = scalingMode === 'never_scale'
    // Disable clicks when overlay is expanded or task not started
    const clicksDisabled = isOverlayExpanded || !taskStarted

    return (
      <div
        className="flex-1 flex flex-col min-h-0 relative"
        style={{ backgroundColor: 'var(--style-page-bg)', height: '100%' }}
      >
        {/* Recording indicator with optional audio level */}
        {isRecording && (
          <RecordingIndicator
            isRecording={isRecording}
            isPaused={isPaused}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          >
            {thinkAloudSettings.enabled && (
              <AudioLevelIndicator
                audioLevel={audioLevel}
                isSpeaking={isSpeaking}
                visible={isRecording}
                compact
              />
            )}
          </RecordingIndicator>
        )}

        {/* Image container - adjusts based on scaling mode */}
        <div
          className={cn(
            'flex-1 min-h-0 p-4 sm:p-8 flex flex-col',
            isNeverScale ? 'overflow-auto' : 'overflow-hidden'
          )}
        >
          {/* Inner wrapper - flex-1 to fill parent, relative for absolute positioning */}
          <div className={cn('flex-1 min-h-0', !isNeverScale && 'relative')}>
            <ClickImage
              imageUrl={taskImage.image_url}
              imageWidth={taskImage.width || 1200}
              imageHeight={taskImage.height || 800}
              scalingMode={scalingMode}
              onImageClick={handleImageClick}
              disabled={clicksDisabled}
            />
          </div>
        </div>

        {/* Task Overlay - morphs between expanded panel and collapsed indicator */}
        <TaskOverlay
          taskNumber={currentTaskIndex + 1}
          totalTasks={tasks.length}
          title={currentTask.instruction}
          instruction={null}
          taskStarted={taskStarted}
          isExpanded={isOverlayExpanded}
          allowSkip={settings.allowSkipTasks ?? true}
          showProgress={settings.showTaskProgress ?? true}
          position={panelPosition}
          onStart={handleStartTask}
          onSkip={handleSkipClick}
          onResume={handleResumeTask}
          onToggleExpand={handleToggleExpand}
        />

        {/* Think-aloud prompt (shown when silence detected) */}
        <ThinkAloudPrompt
          visible={showPrompt && !!currentPrompt}
          prompt={currentPrompt || ''}
          position={thinkAloudSettings.promptPosition}
          onDismiss={dismissPrompt}
        />

        {/* Skip Confirmation Dialog */}
        <SkipConfirmationDialog
          open={showSkipConfirmation}
          onOpenChange={setShowSkipConfirmation}
          onConfirm={handleConfirmSkip}
        />
      </div>
    )
  }

  // Post-Task Questions
  if (phase === 'post_task_questions' && currentTask) {
    const postTaskQuestions = castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
    return (
      <PostTaskQuestionsScreen
        questions={postTaskQuestions}
        onComplete={handlePostTaskComplete}
        taskNumber={currentTaskIndex + 1}
        pageMode={settings.taskFeedbackPageMode ?? 'all_on_one'}
      />
    )
  }

  // Submitting
  if (phase === 'submitting') {
    return <SubmittingScreen />
  }

  // Complete - in embedded mode, StudyFlowPlayer handles the thank-you screen
  // so we return null to avoid a brief flash of CompleteScreen before ThankYouStep
  if (phase === 'complete') {
    if (embeddedMode) return null
    return <CompleteScreen />
  }

  // Error State - fallback if no valid phase
  return <ErrorScreen errorMessage="An error occurred. Please contact support." />
}
