'use client'
import type { PrototypeTestPlayerProps } from './types'
import {
  ErrorScreen,
  SubmittingScreen,
  CompleteScreen,
  PostTaskQuestionsScreen,
} from './components'
import { RecordingConsentScreen, ThinkAloudEducationScreen } from '@veritio/study-flow/player'
import { usePrototypeTestLogic } from './use-prototype-test-logic'
import { TaskActiveScreen } from './task-active-screen'

export function PrototypeTestPlayer(props: PrototypeTestPlayerProps) {
  const { PostTaskQuestionsComponent, ...logicProps } = props

  const logic = usePrototypeTestLogic(logicProps)

  // No prototype configured
  if (!props.prototype) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <p style={{ color: 'var(--style-text-secondary)' }}>No prototype configured for this study.</p>
        </div>
      </div>
    )
  }

  // No tasks configured
  if (logic.tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <p style={{ color: 'var(--style-text-secondary)' }}>No tasks configured for this study.</p>
        </div>
      </div>
    )
  }

  // Terminal phases
  if (logic.phase === 'error') {
    return <ErrorScreen errorMessage={logic.errorMessage} />
  }

  if (logic.phase === 'submitting') {
    return <SubmittingScreen />
  }

  if (logic.phase === 'complete') {
    if (logic.embeddedMode) return null
    return <CompleteScreen />
  }

  // Post-task questions phase
  if (logic.phase === 'post_task_questions' && logic.currentTaskQuestions.length > 0) {
    const QuestionsComponent = PostTaskQuestionsComponent || PostTaskQuestionsScreen
    return (
      <QuestionsComponent
        taskNumber={logic.currentTaskIndex + 1}
        questions={logic.currentTaskQuestions}
        taskOutcome={logic.pendingTaskResult?.outcome}
        taskMetrics={logic.taskMetricsContext}
        onComplete={logic.handlePostTaskQuestionsComplete}
        pageMode={logic.settings.taskFeedbackPageMode ?? 'all_on_one'}
      />
    )
  }

  // Recording consent phase
  if (logic.phase === 'recording_consent' && logic.recordingEnabled) {
    if (!logic.participantId || !logic.sessionToken) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand)' }} />
            <p style={{ color: 'var(--style-text-secondary)' }}>Preparing recording...</p>
          </div>
        </div>
      )
    }
    return (
      <RecordingConsentScreen
        captureMode={logic.settings.sessionRecordingSettings?.captureMode || 'audio'}
        studyType="prototype_test"
        onConsent={logic.handleRecordingConsent}
        onDecline={logic.handleRecordingDecline}
        allowDecline
        privacyNotice={logic.settings.sessionRecordingSettings?.privacyNotice}
      />
    )
  }

  // Think-aloud education phase
  if (logic.phase === 'think_aloud_education') {
    return <ThinkAloudEducationScreen onComplete={logic.handleThinkAloudEducationComplete} />
  }

  // Active phases (instructions or task_active)
  const isInstructionsPhase = logic.phase === 'instructions'
  const isFreeFlow = logic.currentTask?.flow_type === 'free_flow'

  return (
    <TaskActiveScreen
      prototype={props.prototype}
      displayFrameId={logic.displayFrameId ?? undefined}
      previewMode={logic.previewMode}
      currentTaskIndex={logic.currentTaskIndex}
      totalTasks={logic.tasks.length}
      currentTaskTitle={logic.currentTask?.title || ''}
      currentTaskInstruction={logic.currentTask?.instruction ?? undefined}
      taskStarted={logic.taskStarted}
      isFreeFlow={isFreeFlow ?? false}
      settings={logic.settings}
      isInstructionsPhase={isInstructionsPhase}
      prototypeLoaded={logic.prototypeLoaded}
      awaitingPermissions={logic.awaitingPermissions}
      isOverlayExpanded={logic.isOverlayExpanded}
      panelCorner={logic.panelCorner}
      showSuccessModal={logic.showSuccessModal}
      showSkipConfirmation={logic.showSkipConfirmation}
      showGiveUpConfirmation={logic.showGiveUpConfirmation}
      isRecording={logic.isRecording}
      isPaused={logic.isPaused}
      isUploading={logic.isUploading}
      uploadProgress={logic.uploadProgress}
      recordingError={logic.recordingError}
      thinkAloudEnabled={logic.thinkAloudSettings.enabled}
      audioLevel={logic.audioLevel}
      isSpeaking={logic.isSpeaking}
      showPrompt={logic.showPrompt}
      currentPrompt={logic.currentPrompt}
      dismissPrompt={logic.dismissPrompt}
      thinkAloudPromptPosition={logic.thinkAloudSettings.promptPosition}
      getFigmaNodeIdFromFrameId={logic.getFigmaNodeIdFromFrameId}
      onInstructionsContinue={logic.handleInstructionsContinue}
      onFigmaLoad={logic.handleFigmaLoad}
      onFigmaClick={isInstructionsPhase || !logic.taskStarted ? undefined : logic.handleFigmaClick}
      onFigmaNavigate={isInstructionsPhase || !logic.taskStarted ? undefined : logic.handleFigmaNavigate}
      onFigmaStateChange={isInstructionsPhase || !logic.taskStarted ? undefined : logic.handleFigmaStateChange}
      onFigmaStateSnapshot={isInstructionsPhase || !logic.taskStarted ? undefined : logic.handleFigmaStateSnapshot}
      onStartTask={logic.handleStartTask}
      onSkipClick={logic.handleSkipClick}
      onGiveUpClick={logic.handleGiveUpClick}
      onManualComplete={logic.handleManualComplete}
      onResumeOverlay={() => logic.setIsOverlayExpanded(false)}
      onToggleExpand={logic.setIsOverlayExpanded}
      onSuccessModalContinue={logic.handleSuccessModalContinue}
      onSkipConfirmationChange={logic.setShowSkipConfirmation}
      onConfirmSkip={logic.handleConfirmSkip}
      onGiveUpConfirmationChange={logic.setShowGiveUpConfirmation}
      onConfirmGiveUp={logic.handleConfirmGiveUp}
    />
  )
}
