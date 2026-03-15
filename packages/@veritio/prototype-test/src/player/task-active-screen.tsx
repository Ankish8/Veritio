'use client'
import type { PrototypeTestPrototype, PrototypeTestSettings } from '@veritio/study-types'
import type { ComponentStateEvent, ComponentStateSnapshot } from '@veritio/study-types/study-flow-types'
import type { PanelCorner, FigmaClickEvent, FigmaNavigationEvent } from './types'
import {
  InstructionsScreen,
  FigmaEmbed,
  TaskCompleteButton,
  TaskOverlay,
  SuccessModal,
  SkipConfirmationDialog,
  GiveUpConfirmationDialog,
} from './components'
import { RecordingIndicator, ThinkAloudPrompt, AudioLevelIndicator } from '@veritio/study-flow/player'
import { OVERLAY_COLORS } from '@veritio/core/colors'
import { getScaleMode } from './utils'
import type { DEFAULT_THINK_ALOUD } from '../builder/shared/types'
import type { ThinkAloudPromptPosition } from '../builder/shared/recording-types'

interface TaskActiveScreenProps {
  // Prototype
  prototype: PrototypeTestPrototype
  displayFrameId?: string
  previewMode: boolean

  // Task info
  currentTaskIndex: number
  totalTasks: number
  currentTaskTitle: string
  currentTaskInstruction?: string
  taskStarted: boolean
  isFreeFlow: boolean

  // Settings
  settings: PrototypeTestSettings

  // UI state
  isInstructionsPhase: boolean
  prototypeLoaded: boolean
  awaitingPermissions: boolean
  isOverlayExpanded: boolean
  panelCorner: PanelCorner
  showSuccessModal: boolean
  showSkipConfirmation: boolean
  showGiveUpConfirmation: boolean

  // Recording
  isRecording: boolean
  isPaused: boolean
  isUploading: boolean
  uploadProgress: number
  recordingError?: string | null
  thinkAloudEnabled: boolean
  audioLevel: number
  isSpeaking: boolean
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: () => void
  thinkAloudPromptPosition?: ThinkAloudPromptPosition

  // Frame mapping
  getFigmaNodeIdFromFrameId: (frameId: string | undefined) => string | null | undefined

  // Handlers
  onInstructionsContinue: () => void
  onFigmaLoad: () => void
  onFigmaClick?: (event: FigmaClickEvent) => void
  onFigmaNavigate?: (event: FigmaNavigationEvent) => void
  onFigmaStateChange?: (event: ComponentStateEvent) => void
  onFigmaStateSnapshot?: (snapshot: ComponentStateSnapshot) => void
  onStartTask: () => void
  onSkipClick: () => void
  onGiveUpClick: () => void
  onManualComplete: () => void
  onResumeOverlay: () => void
  onToggleExpand: (expanded: boolean) => void
  onSuccessModalContinue: () => void
  onSkipConfirmationChange: (open: boolean) => void
  onConfirmSkip: () => void
  onGiveUpConfirmationChange: (open: boolean) => void
  onConfirmGiveUp: () => void
}

export function TaskActiveScreen({
  prototype,
  displayFrameId,
  previewMode,
  currentTaskIndex,
  totalTasks,
  currentTaskTitle,
  currentTaskInstruction,
  taskStarted,
  isFreeFlow,
  settings,
  isInstructionsPhase,
  prototypeLoaded,
  awaitingPermissions,
  isOverlayExpanded,
  panelCorner,
  showSuccessModal,
  showSkipConfirmation,
  showGiveUpConfirmation,
  isRecording,
  isPaused,
  isUploading,
  uploadProgress,
  recordingError,
  thinkAloudEnabled,
  audioLevel,
  isSpeaking,
  showPrompt,
  currentPrompt,
  dismissPrompt,
  thinkAloudPromptPosition,
  getFigmaNodeIdFromFrameId,
  onInstructionsContinue,
  onFigmaLoad,
  onFigmaClick,
  onFigmaNavigate,
  onFigmaStateChange,
  onFigmaStateSnapshot,
  onStartTask,
  onSkipClick,
  onGiveUpClick,
  onManualComplete,
  onResumeOverlay,
  onToggleExpand,
  onSuccessModalContinue,
  onSkipConfirmationChange,
  onConfirmSkip,
  onGiveUpConfirmationChange,
  onConfirmGiveUp,
}: TaskActiveScreenProps) {
  const showManualComplete = !isInstructionsPhase && taskStarted && !isFreeFlow && !settings.tasksEndAutomatically

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Figma Embed - always rendered for background preloading */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <FigmaEmbed
          prototype={prototype}
          currentFrameId={getFigmaNodeIdFromFrameId(displayFrameId)}
          taskKey={previewMode && !taskStarted ? `${currentTaskIndex}-preview` : currentTaskIndex}
          showHotspotHints={settings.clickableAreaFlashing ?? false}
          scaleMode={getScaleMode(settings.scalePrototype)}
          onLoad={onFigmaLoad}
          onClick={isInstructionsPhase || !taskStarted ? undefined : onFigmaClick}
          onNavigate={isInstructionsPhase || !taskStarted ? undefined : onFigmaNavigate}
          onStateChange={isInstructionsPhase || !taskStarted ? undefined : onFigmaStateChange}
          onStateSnapshot={isInstructionsPhase || !taskStarted ? undefined : onFigmaStateSnapshot}
        />
      </div>

      {/* Instructions Screen - overlaid on top during instructions phase */}
      {isInstructionsPhase && (
        <div
          className="absolute inset-0 z-40"
          style={{ backgroundColor: 'var(--style-card-bg)' }}
        >
          <InstructionsScreen onContinue={onInstructionsContinue} />
        </div>
      )}

      {/* Permission Pending Overlay */}
      {!isInstructionsPhase && prototypeLoaded && awaitingPermissions && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: OVERLAY_COLORS.backdropMedium }}>
          <div className="rounded-xl p-6 text-center max-w-sm" style={{ backgroundColor: 'var(--style-card-bg)' }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand)' }} />
            <p className="text-lg font-medium mb-2" style={{ color: 'var(--style-text-primary)' }}>
              Requesting permissions...
            </p>
            <p className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>
              Please allow access to your microphone, screen, and/or camera when prompted.
            </p>
          </div>
        </div>
      )}

      {/* Task Overlay */}
      {!isInstructionsPhase && prototypeLoaded && !awaitingPermissions && (
        <TaskOverlay
          taskNumber={currentTaskIndex + 1}
          totalTasks={totalTasks}
          title={currentTaskTitle}
          instruction={currentTaskInstruction}
          taskStarted={taskStarted}
          isExpanded={isOverlayExpanded}
          allowSkip={settings.allowSkipTasks ?? true}
          allowGiveUp={settings.allowFailureResponse ?? false}
          showProgress={settings.showTaskProgress ?? true}
          position={panelCorner}
          isFreeFlow={isFreeFlow}
          onStart={onStartTask}
          onSkip={onSkipClick}
          onGiveUp={onGiveUpClick}
          onResume={onResumeOverlay}
          onToggleExpand={onToggleExpand}
          onEndTask={onManualComplete}
        />
      )}

      {/* Manual complete button (shown when auto-complete disabled for task flow) */}
      {showManualComplete && (
        <TaskCompleteButton
          onClick={onManualComplete}
          label="Mark complete"
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onContinue={onSuccessModalContinue}
      />

      {/* Skip Confirmation Dialog */}
      <SkipConfirmationDialog
        open={showSkipConfirmation}
        onOpenChange={onSkipConfirmationChange}
        onConfirm={onConfirmSkip}
      />

      {/* Give Up Confirmation Dialog */}
      <GiveUpConfirmationDialog
        open={showGiveUpConfirmation}
        onOpenChange={onGiveUpConfirmationChange}
        onConfirm={onConfirmGiveUp}
      />

      {/* Recording Indicator with Audio Level */}
      {(isRecording || isUploading) && (
        <RecordingIndicator
          isRecording={isRecording}
          isPaused={isPaused}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          error={recordingError}
          position="top-right"
        >
          {thinkAloudEnabled && isRecording && (
            <AudioLevelIndicator
              audioLevel={audioLevel}
              isSpeaking={isSpeaking}
              visible
              compact
            />
          )}
        </RecordingIndicator>
      )}

      {/* Think-Aloud Prompt (shown when silence detected) */}
      {thinkAloudEnabled && (
        <ThinkAloudPrompt
          visible={showPrompt}
          prompt={currentPrompt}
          onDismiss={dismissPrompt}
          position={thinkAloudPromptPosition}
          autoDismissSeconds={10}
        />
      )}
    </div>
  )
}
