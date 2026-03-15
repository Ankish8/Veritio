'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { TreeTestPhase, TaskResult, TreeTestPlayerProps, PostTaskQuestionResponse } from './types'
import {
  InstructionsScreen,
  TaskHeader,
  TreeNavigation,
} from './components'
import { PostTaskQuestionsScreen } from '../shared'
import { RecordingConsentScreen } from '../shared/recording-consent-screen'
import { RecordingIndicator } from '../shared/recording-indicator'
import { ThinkAloudEducationScreen } from '../shared/think-aloud-education-screen'
import { ThinkAloudPrompt } from '../shared/think-aloud-prompt'
import { AudioLevelIndicator } from '../shared/audio-level-indicator'
import { useActivitySession } from '@/hooks/use-activity-session'
import { useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import { ErrorScreen } from '../card-sort/screens/error-screen'
import { SubmittingScreen } from '../card-sort/screens/submitting-screen'
import { CompleteScreen } from '../card-sort/screens/complete-screen'
import { useTreeTestRecording } from './use-tree-test-recording'
import { useTreeTestTasks } from './use-tree-test-tasks'

export function TreeTestPlayer({
  studyId,
  shareCode,
  tasks: initialTasks,
  nodes,
  settings,
  thankYouMessage,
  embeddedMode = false,
  previewMode = false,
  sessionToken: propSessionToken,
  onComplete,
  preventionData,
}: TreeTestPlayerProps) {
  // Get demographic data from study flow store (collected during identifier step)
  const participantDemographicData = useStudyFlowPlayerStore(
    (state) => state.participantDemographicData
  )

  const recordingEnabled = settings.sessionRecordingSettings?.enabled ?? false

  // Phase-based state machine
  const [phase, setPhase] = useState<TreeTestPhase>(() => {
    if (embeddedMode) {
      return recordingEnabled ? 'recording_consent' : 'task_active'
    }
    return 'instructions'
  })

  // Use unified session management hook
  const {
    participantId,
    sessionToken,
    errorMessage,
    initializeSession,
    submitActivity,
  } = useActivitySession({
    shareCode,
    embeddedMode,
    previewMode,
    propSessionToken,
    onComplete,
    preventionData,
    demographicData: participantDemographicData,
  })

  // Recording hook
  const recording = useTreeTestRecording({
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    settings,
  })

  // Tasks & navigation hook
  const taskState = useTreeTestTasks({
    initialTasks,
    nodes,
    randomizeTasks: settings.randomizeTasks ?? false,
    dontRandomizeFirstTask: settings.dontRandomizeFirstTask ?? false,
  })

  // Eagerly initialize session on mount so it's ready when the user clicks "Start"
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      initializeSession()
      if (embeddedMode) {
        taskState.startTaskTiming()
      }
    }
  }, [embeddedMode, initializeSession, taskState.startTaskTiming]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recording consent handlers
  const handleRecordingConsent = useCallback(async () => {
    try {
      await recording.startRecording()
      taskState.resetTaskState()
      taskState.startTaskTiming()
      setPhase(recording.nextPhaseAfterConsent)
      if (recording.nextPhaseAfterConsent === 'task_active' && taskState.currentTask) {
        recording.captureTaskStart(taskState.currentTask.id, taskState.currentTask.question || `Task ${taskState.currentTaskIndex + 1}`)
      }
    } catch {
      taskState.resetTaskState()
      taskState.startTaskTiming()
      setPhase('task_active')
    }
  }, [recording, taskState])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleThinkAloudEducationComplete = useCallback(() => {
    setPhase('task_active')
    if (taskState.currentTask) {
      recording.captureTaskStart(taskState.currentTask.id, taskState.currentTask.question || `Task ${taskState.currentTaskIndex + 1}`)
    }
  }, [taskState.currentTask, taskState.currentTaskIndex, recording.captureTaskStart]) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleRecordingDecline = useCallback(() => {
    taskState.resetTaskState()
    taskState.startTaskTiming()
    setPhase('task_active')
  }, [taskState.resetTaskState, taskState.startTaskTiming]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle "Continue" from instructions screen
  const handleInstructionsContinue = async () => {
    const success = await initializeSession()
    if (success) {
      if (recording.shouldShowRecordingConsent) {
        setPhase('recording_consent')
      } else {
        taskState.resetTaskState()
        taskState.startTaskTiming()
        setPhase('task_active')
      }
    } else {
      setPhase('error')
    }
  }

  // Node interaction handlers (wrap to inject captureCustomEvent)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleNodeToggle = useCallback((nodeId: string) => {
    taskState.handleNodeToggle(nodeId, recording.captureCustomEvent)
  }, [taskState.handleNodeToggle, recording.captureCustomEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleNodeSelect = useCallback((nodeId: string) => {
    taskState.handleNodeSelect(nodeId, recording.captureCustomEvent)
  }, [taskState.handleNodeSelect, recording.captureCustomEvent]) // eslint-disable-line react-hooks/exhaustive-deps

  // Submit all results
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const submitResults = useCallback(async (results: TaskResult[]) => {
    await recording.stopRecordingWithTranscript()
    setPhase('submitting')

    const submitData = {
      sessionToken,
      responses: results.map((r) => {
        const taskQuestions = taskState.questionResponses.find((qr) => qr.taskId === r.taskId)
        return {
          taskId: r.taskId,
          pathTaken: r.pathTaken,
          selectedNodeId: r.selectedNodeId,
          timeToFirstClickMs: r.timeToFirstClickMs,
          totalTimeMs: r.totalTimeMs,
          skipped: r.skipped,
          postTaskResponses: taskQuestions?.responses,
        }
      }),
    }

    const success = await submitActivity(`/api/participate/${shareCode}/submit/tree-test`, submitData)

    if (success) {
      setPhase('complete')
    } else {
      setPhase('error')
    }
  }, [sessionToken, shareCode, taskState.questionResponses, submitActivity, recording.stopRecordingWithTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  // Record task result - checks for post-task questions before advancing
  const recordTaskResult = useCallback((result: TaskResult) => {
    if (taskState.currentTask) {
      const outcome = result.skipped ? 'skipped' : (result.isCorrect ? 'success' : 'failure')
      recording.captureTaskEnd(taskState.currentTask.id, taskState.currentTask.question || `Task ${taskState.currentTaskIndex + 1}`, outcome)
    }

    if (taskState.hasPostTaskQuestions()) {
      taskState.setPendingTaskResult(result)
      setPhase('post_task_questions')
      return
    }

    const status = taskState.advanceTask(result, recording.captureTaskStart)
    if (status === 'next') {
      setPhase('task_active')
    } else {
      submitResults([...taskState.taskResults, result])
    }
  }, [taskState, recording, submitResults])

  // Handle post-task questions completion
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handlePostTaskQuestionsComplete = useCallback((responses: PostTaskQuestionResponse[]) => {
    const result = taskState.handlePostTaskQuestionsComplete(responses, recording.captureTaskStart)
    if (!result) return

    if (!result.isDone) {
      setPhase('task_active')
    } else {
      submitResults(result.allResults)
    }
  }, [taskState.handlePostTaskQuestionsComplete, recording.captureTaskStart, submitResults]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle confirming the selected answer
  const handleConfirmAnswer = () => {
    const result = taskState.buildConfirmResult()
    if (result) recordTaskResult(result)
  }

  // Handle skipping a task
  const handleSkipTask = () => {
    const result = taskState.buildSkipResult()
    if (result) recordTaskResult(result)
  }

  // --- Render phases ---

  if (phase === 'instructions') {
    return <InstructionsScreen onContinue={handleInstructionsContinue} />
  }

  if (phase === 'recording_consent' && recordingEnabled) {
    if (!participantId || !sessionToken) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-4" />
            <p style={{ color: 'var(--style-text-secondary)' }}>Preparing recording...</p>
          </div>
        </div>
      )
    }
    return (
      <RecordingConsentScreen
        captureMode={settings.sessionRecordingSettings?.captureMode || 'audio'}
        studyType="tree_test"
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        allowDecline
        privacyNotice={settings.sessionRecordingSettings?.privacyNotice}
      />
    )
  }

  if (phase === 'think_aloud_education') {
    return <ThinkAloudEducationScreen onComplete={handleThinkAloudEducationComplete} />
  }

  if (phase === 'error') {
    return <ErrorScreen errorMessage={errorMessage || 'Something went wrong'} />
  }

  if (phase === 'submitting') {
    return <SubmittingScreen />
  }

  if (phase === 'post_task_questions' && taskState.currentTaskQuestions.length > 0) {
    return (
      <PostTaskQuestionsScreen
        taskNumber={taskState.currentTaskIndex + 1}
        questions={taskState.currentTaskQuestions}
        onComplete={handlePostTaskQuestionsComplete}
        pageMode={settings.taskFeedbackPageMode ?? 'all_on_one'}
      />
    )
  }

  if (phase === 'complete') {
    if (embeddedMode) {
      return null
    }
    return <CompleteScreen message={thankYouMessage} />
  }

  // Active task screen (tree navigation)
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="sticky top-0 z-10">
        <TaskHeader
          taskNumber={taskState.currentTaskIndex + 1}
          totalTasks={taskState.tasks.length}
          question={taskState.currentTask?.question || ''}
          progress={taskState.progress}
          allowSkip={settings.allowSkipTasks ?? false}
          onSkip={handleSkipTask}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-6 max-w-2xl">
          <TreeNavigation
            nodes={nodes}
            expandedNodeIds={taskState.expandedNodeIds}
            selectedNodeId={taskState.selectedNodeId}
            answerButtonText={settings.answerButtonText || "I'd find it here"}
            onNodeToggle={handleNodeToggle}
            onNodeSelect={handleNodeSelect}
            onConfirmAnswer={handleConfirmAnswer}
          />
        </div>
      </div>

      {(recording.isRecording || recording.isUploading) && (
        <RecordingIndicator
          isRecording={recording.isRecording}
          isPaused={recording.isPaused}
          isUploading={recording.isUploading}
          uploadProgress={recording.uploadProgress}
          error={recording.recordingError}
          position="top-right"
        >
          {recording.thinkAloudSettings.enabled && recording.isRecording && (
            <AudioLevelIndicator
              audioLevel={recording.audioLevel}
              isSpeaking={recording.isSpeaking}
              visible
              compact
            />
          )}
        </RecordingIndicator>
      )}

      {recording.thinkAloudSettings.enabled && (
        <ThinkAloudPrompt
          visible={recording.showPrompt}
          prompt={recording.currentPrompt}
          onDismiss={recording.dismissPrompt}
          position={recording.thinkAloudSettings.promptPosition}
          autoDismissSeconds={10}
        />
      )}
    </div>
  )
}
