'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { SuccessPathway, PostTaskQuestion } from '@veritio/study-types'
import type { TaskMetricsContext } from '@veritio/study-types/study-flow-types'
import type {
  PrototypeTestPhase,
  PanelCorner,
  TaskResult,
  PrototypeTestPlayerProps,
  PostTaskQuestionResponse,
  TaskQuestionResponses,
} from './types'
import { useActivitySession } from '@veritio/study-flow/hooks'
import { useStudyFlowPlayerStore } from '../stores/study-flow-player'
import { castJsonArray } from '@veritio/core/database'
import { usePrototypeTaskTracking, useRecordingConsent } from './hooks'
import { getGoalFramesFromPathway } from '../algorithms/path-matching'
import { useFigmaEventHandlers } from './use-figma-event-handlers'
import { useRecordingSetup } from './use-recording-setup'
import { submitPrototypeTestResults } from './submit-results'

export function usePrototypeTestLogic({
  studyId,
  shareCode,
  prototype,
  frames,
  componentInstances = [],
  tasks: initialTasks,
  settings,
  embeddedMode = false,
  previewMode = false,
  sessionToken: propSessionToken,
  participantId: propParticipantId,
  onComplete,
  preventionData,
}: Omit<PrototypeTestPlayerProps, 'PostTaskQuestionsComponent'>) {
  // Get demographic data from study flow store
  const participantDemographicData = useStudyFlowPlayerStore(
    (state) => (state as any).participantDemographicData
  )

  // Phase-based state machine
  const [phase, setPhase] = useState<PrototypeTestPhase>(() => {
    const recordingEnabledInit = settings.sessionRecordingSettings?.enabled ?? false
    if (embeddedMode) {
      return recordingEnabledInit ? 'recording_consent' : 'task_active'
    }
    return 'instructions'
  })

  // Session management
  const {
    participantId,
    sessionToken,
    errorMessage: initErrorMessage,
    initializeSession,
  } = useActivitySession({
    shareCode,
    embeddedMode,
    previewMode,
    propSessionToken,
    propParticipantId,
  })

  const [submitErrorMessage, setSubmitErrorMessage] = useState('')
  const errorMessage = initErrorMessage || submitErrorMessage

  // Task progress
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [taskResults, setTaskResults] = useState<TaskResult[]>([])

  // Post-task questions state
  const [questionResponses, setQuestionResponses] = useState<TaskQuestionResponses[]>([])
  const [pendingTaskResult, setPendingTaskResult] = useState<TaskResult | null>(null)

  // Recording state
  const [taskAttemptIds, setTaskAttemptIds] = useState<Record<string, string>>({})
  const [recordingConsented, setRecordingConsented] = useState(false)

  // Task overlay state
  const [prototypeLoaded, setPrototypeLoaded] = useState(false)
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(true)
  const [taskStarted, setTaskStarted] = useState(false)
  const [awaitingPermissions, setAwaitingPermissions] = useState(false)
  const panelCorner = (settings.taskInstructionPosition as PanelCorner) || 'top-left'
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)
  const [showGiveUpConfirmation, setShowGiveUpConfirmation] = useState(false)
  const followedCorrectPathRef = useRef<boolean | undefined>(undefined)

  const { clickEventsRef, navigationEventsRef, componentStateEventsRef, currentFrameIdRef, currentComponentStatesRef, setCurrentTask, resetTaskState, startTaskTiming, recordClick, recordNavigation, recordStateChange, setCurrentFrame, buildTaskResult, getPathTaken } = usePrototypeTaskTracking()

  // Randomize tasks
  const tasks = useMemo(() => {
    if (!initialTasks || initialTasks.length === 0) return []
    if (!settings.randomizeTasks) return initialTasks

    const tasksToRandomize = settings.dontRandomizeFirstTask
      ? initialTasks.slice(1)
      : initialTasks

    const shuffled = [...tasksToRandomize].sort(() => Math.random() - 0.5)

    return settings.dontRandomizeFirstTask
      ? [initialTasks[0], ...shuffled]
      : shuffled
  }, [initialTasks, settings.randomizeTasks, settings.dontRandomizeFirstTask])

  const currentTask = tasks[currentTaskIndex]

  // Display frame ID (preview mode shows goal frame before task starts)
  const displayFrameId = useMemo(() => {
    if (!currentTask) return undefined

    if (previewMode && !taskStarted) {
      if (currentTask.flow_type !== 'free_flow') {
        const successCriteriaType = currentTask.success_criteria_type || 'destination'

        if (successCriteriaType === 'pathway') {
          const successPathway = currentTask.success_pathway as SuccessPathway
          const goalFrames = getGoalFramesFromPathway(successPathway)
          if (goalFrames.length > 0) return goalFrames[goalFrames.length - 1]
        } else if (successCriteriaType === 'destination') {
          const successFrameIds = (currentTask.success_frame_ids as string[]) || []
          if (successFrameIds.length > 0) return successFrameIds[0]
        }
      }
    }

    return currentTask.start_frame_id
  }, [currentTask, previewMode, taskStarted])

  // Current task attempt ID for recording linkage
  const currentTaskAttemptId = currentTask ? taskAttemptIds[currentTask.id] : undefined

  // Recording setup (session recording, event capture, silence detection, think-aloud prompts)
  const recording = useRecordingSetup({
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    settings,
    currentTaskAttemptId,
  })

  const { recordingEnabled, recordingScope, thinkAloudSettings, isRecording, isPaused, isUploading, uploadProgress, recordingId, startRecording, stopRecording, recordingError, captureRecordingClick, captureRecordingNav, captureTaskStart, captureTaskEnd, audioLevel, isSpeaking, showPrompt, currentPrompt, dismissPrompt, saveLiveTranscript } = recording

  // Figma event handlers (extracted hook)
  const figma = useFigmaEventHandlers({
    frames,
    componentInstances,
    currentTask,
    taskStarted,
    tasksEndAutomatically: settings.tasksEndAutomatically ?? false,
    currentFrameIdRef,
    currentComponentStatesRef,
    componentStateEventsRef,
    recordClick,
    recordNavigation,
    recordStateChange,
    setCurrentFrame,
    getPathTaken,
    captureRecordingClick,
    captureRecordingNav,
    followedCorrectPathRef,
    setShowSuccessModal,
  })

  // Wrap handleFigmaLoad to also set prototypeLoaded
  const handleFigmaLoad = useCallback(() => {
    setPrototypeLoaded(true)
    figma.handleFigmaLoad()
  }, [figma.handleFigmaLoad])

  // Set current task for event tracking whenever task changes
  useEffect(() => {
    if (currentTask?.id) setCurrentTask(currentTask.id)
  }, [currentTask?.id, setCurrentTask])

  // Initialize in embedded mode
  const hasInitialized = useRef(false)
  const isSubmittingRef = useRef(false)
  useEffect(() => {
    if (embeddedMode && !hasInitialized.current) {
      hasInitialized.current = true
      initializeSession()
      startTaskTiming()
    }
  }, [embeddedMode, initializeSession, startTaskTiming])

  // Trigger browser permissions after prototype loads
  const hasTriggeredPermissions = useRef(false)
  useEffect(() => {
    if (
      phase === 'task_active' &&
      recordingEnabled &&
      recordingConsented &&
      prototypeLoaded &&
      !isRecording &&
      !awaitingPermissions &&
      !hasTriggeredPermissions.current &&
      currentTaskIndex === 0
    ) {
      hasTriggeredPermissions.current = true
      setAwaitingPermissions(true)
      startRecording()
        .then(() => {
          setAwaitingPermissions(false)
        })
        .catch((error) => {
          console.error('Failed to start recording:', error)
          setAwaitingPermissions(false)
        })
    }
  }, [phase, recordingEnabled, recordingConsented, prototypeLoaded, isRecording, awaitingPermissions, currentTaskIndex, startRecording])

  // Recording consent handling
  const nextPhaseAfterConsent = thinkAloudSettings.enabled && thinkAloudSettings.showEducation
    ? 'think_aloud_education'
    : 'task_active'

  const { handleRecordingConsent, handleRecordingDecline, shouldShowRecordingConsent } = useRecordingConsent({
    recordingEnabled,
    embeddedMode,
    startRecording,
    resetTaskState,
    startTaskTiming,
    setPhase,
    onRecordingConsent: () => setRecordingConsented(true),
    nextPhaseAfterConsent,
  })

  const handleThinkAloudEducationComplete = useCallback(() => {
    setPhase('task_active')
  }, [setPhase])

  // Instructions continue
  const handleInstructionsContinue = useCallback(async () => {
    const success = await initializeSession()
    if (success) {
      if (shouldShowRecordingConsent) {
        setPhase('recording_consent')
      } else {
        resetTaskState()
        startTaskTiming()
        setPhase('task_active')
      }
    } else {
      setPhase('error')
    }
  }, [initializeSession, shouldShowRecordingConsent, resetTaskState, startTaskTiming])

  // Submit all results
  const submitResults = useCallback(async (results: TaskResult[], allQuestionResponses?: TaskQuestionResponses[]) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    const responsesToUse = allQuestionResponses ?? questionResponses

    if (!previewMode && sessionToken) {
      setPhase('submitting')
    }

    if (isRecording) {
      if (recordingId && thinkAloudSettings.enabled) {
        saveLiveTranscript(recordingId).catch(() => {})
      }
      stopRecording()
    }

    if (previewMode) {
      setPhase('complete')
      onComplete?.()
      return
    }

    if (!sessionToken) {
      // No sessionToken - skipping API submission
      setPhase('complete')
      onComplete?.()
      return
    }

    try {
      await submitPrototypeTestResults({
        results,
        questionResponses: responsesToUse,
        tasks,
        taskAttemptIds,
        shareCode,
        sessionToken,
        clickEvents: clickEventsRef.current,
        navigationEvents: navigationEventsRef.current,
        componentStateEvents: componentStateEventsRef.current,
        demographicData: participantDemographicData,
        preventionData,
      })

      setPhase('complete')
      onComplete?.()
    } catch (error) {
      setSubmitErrorMessage(error instanceof Error ? error.message : 'Failed to submit')
      setPhase('error')
      isSubmittingRef.current = false
    }
  }, [previewMode, sessionToken, shareCode, onComplete, questionResponses, taskAttemptIds, isRecording, stopRecording, preventionData, participantDemographicData, recordingId, thinkAloudSettings.enabled, saveLiveTranscript, tasks])

  // Get post-task questions for current task
  const currentTaskQuestions = useMemo(() => {
    if (!currentTask) return []
    return castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
  }, [currentTask])

  // Build task metrics context from pending result
  const taskMetricsContext: TaskMetricsContext | undefined = useMemo(() => {
    if (!pendingTaskResult) return undefined
    return {
      outcome: pendingTaskResult.outcome,
      isDirect: pendingTaskResult.followedCorrectPath,
      clickCount: pendingTaskResult.clickCount,
      misclickCount: pendingTaskResult.misclickCount,
      backtrackCount: pendingTaskResult.backtrackCount,
      totalTimeMs: pendingTaskResult.totalTimeMs,
      timeToFirstClickMs: pendingTaskResult.timeToFirstClickMs,
      pathTaken: pendingTaskResult.pathTaken,
      pathLength: pendingTaskResult.pathTaken.length,
    }
  }, [pendingTaskResult])

  // Complete current task and move to next
  const handleTaskComplete = useCallback(
    (outcome: 'success' | 'failure' | 'skipped') => {
      if (!currentTask) return

      captureTaskEnd(currentTask.id, currentTask.title || `Task ${currentTaskIndex + 1}`, outcome)

      if (recordingScope === 'task' && isRecording) {
        if (recordingId && thinkAloudSettings.enabled) {
          saveLiveTranscript(recordingId).catch(() => {})
        }
        stopRecording()
      }

      const result = buildTaskResult(currentTask, outcome, followedCorrectPathRef.current)

      const questions = castJsonArray<PostTaskQuestion>(currentTask.post_task_questions)
      if (questions.length > 0) {
        setPendingTaskResult(result)
        setPhase('post_task_questions')
        return
      }

      setTaskResults((prev) => [...prev, result])

      const nextIndex = currentTaskIndex + 1
      if (nextIndex < tasks.length) {
        setCurrentTaskIndex(nextIndex)
        resetTaskState()
        setTaskStarted(false)
        setIsOverlayExpanded(true)
        followedCorrectPathRef.current = undefined
      } else {
        submitResults([...taskResults, result])
      }
    },
    [currentTask, currentTaskIndex, tasks.length, taskResults, buildTaskResult, resetTaskState, submitResults, captureTaskEnd, recordingScope, isRecording, stopRecording, recordingId, thinkAloudSettings.enabled, saveLiveTranscript]
  )

  // Handle post-task questions completion
  const handlePostTaskQuestionsComplete = useCallback(
    (responses?: PostTaskQuestionResponse[]) => {
      if (!pendingTaskResult || !currentTask) return

      const newQuestionResponses: TaskQuestionResponses[] = [
        ...questionResponses,
        { taskId: currentTask.id, responses: responses || [] },
      ]

      setQuestionResponses(newQuestionResponses)
      setTaskResults((prev) => [...prev, pendingTaskResult])
      setPendingTaskResult(null)

      const nextIndex = currentTaskIndex + 1
      if (nextIndex < tasks.length) {
        setCurrentTaskIndex(nextIndex)
        resetTaskState()
        setTaskStarted(false)
        setIsOverlayExpanded(true)
        followedCorrectPathRef.current = undefined
        setPhase('task_active')
      } else {
        submitResults([...taskResults, pendingTaskResult], newQuestionResponses)
      }
    },
    [pendingTaskResult, currentTask, currentTaskIndex, tasks.length, taskResults, questionResponses, resetTaskState, submitResults]
  )

  // Handle starting a task
  const handleStartTask = useCallback(async () => {
    if (!currentTask) return

    const taskAttemptId = crypto.randomUUID()
    setTaskAttemptIds(prev => ({ ...prev, [currentTask.id]: taskAttemptId }))

    setTaskStarted(true)
    setIsOverlayExpanded(false)
    startTaskTiming()

    captureTaskStart(currentTask.id, currentTask.title || `Task ${currentTaskIndex + 1}`)

    if (recordingEnabled && recordingConsented && !isRecording) {
      const shouldStartRecording = recordingScope === 'task' && currentTaskIndex > 0

      if (shouldStartRecording) {
        try {
          await startRecording()
        } catch (error) {
          console.error('Failed to start recording:', error)
        }
      }
    }
  }, [currentTask, currentTaskIndex, startTaskTiming, captureTaskStart, recordingEnabled, recordingConsented, isRecording, recordingScope, startRecording])

  // Handle manual task completion
  const handleManualComplete = useCallback(() => {
    const result = figma.checkManualComplete()
    if (!result) return

    if (result.isSuccess) {
      followedCorrectPathRef.current = result.followedCorrectPath
      setShowSuccessModal(true)
    } else {
      handleTaskComplete('failure')
    }
  }, [figma.checkManualComplete, handleTaskComplete])

  const handleSkipClick = useCallback(() => {
    setShowSkipConfirmation(true)
  }, [])

  const handleConfirmSkip = useCallback(() => {
    setShowSkipConfirmation(false)
    handleTaskComplete('skipped')
  }, [handleTaskComplete])

  const handleGiveUpClick = useCallback(() => {
    setShowGiveUpConfirmation(true)
  }, [])

  const handleConfirmGiveUp = useCallback(() => {
    setShowGiveUpConfirmation(false)
    handleTaskComplete('failure')
  }, [handleTaskComplete])

  const handleSuccessModalContinue = useCallback(() => {
    setShowSuccessModal(false)
    handleTaskComplete('success')
  }, [handleTaskComplete])

  return {
    phase, errorMessage, embeddedMode, previewMode,
    tasks, currentTask, currentTaskIndex, taskStarted, displayFrameId,
    prototypeLoaded, isOverlayExpanded, setIsOverlayExpanded,
    awaitingPermissions, panelCorner,
    showSuccessModal, showSkipConfirmation, setShowSkipConfirmation,
    showGiveUpConfirmation, setShowGiveUpConfirmation,
    currentTaskQuestions, pendingTaskResult, taskMetricsContext,
    recordingEnabled, thinkAloudSettings,
    isRecording, isPaused, isUploading, uploadProgress, recordingError,
    audioLevel, isSpeaking, showPrompt, currentPrompt, dismissPrompt,
    participantId, sessionToken, settings,
    getFigmaNodeIdFromFrameId: figma.getFigmaNodeIdFromFrameId,
    handleInstructionsContinue, handleRecordingConsent, handleRecordingDecline,
    shouldShowRecordingConsent, handleThinkAloudEducationComplete, handleFigmaLoad,
    handleFigmaClick: figma.handleFigmaClick,
    handleFigmaNavigate: figma.handleFigmaNavigate,
    handleFigmaStateChange: figma.handleFigmaStateChange,
    handleFigmaStateSnapshot: figma.handleFigmaStateSnapshot,
    handleStartTask, handleManualComplete,
    handleSkipClick, handleConfirmSkip,
    handleGiveUpClick, handleConfirmGiveUp,
    handleSuccessModalContinue, handlePostTaskQuestionsComplete,
  }
}
