'use client'

import { RecordingIndicator } from './recording-indicator'
import { AudioLevelIndicator } from './audio-level-indicator'
import { ThinkAloudPrompt } from './think-aloud-prompt'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

type RecordingIndicatorPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface RecordingOverlayProps {
  isRecording: boolean
  isPaused?: boolean
  isUploading?: boolean
  uploadProgress?: number
  recordingError?: string | null
  audioLevel?: number
  isSpeaking?: boolean
  showAudioLevel?: boolean
  showPrompt?: boolean
  currentPrompt?: string
  onDismissPrompt?: () => void
  promptPosition?: ThinkAloudPromptPosition
  autoDismissPromptSeconds?: number
  thinkAloudEnabled?: boolean
  indicatorPosition?: RecordingIndicatorPosition
}

export function RecordingOverlay({
  // Recording state
  isRecording,
  isPaused = false,
  isUploading = false,
  uploadProgress = 0,
  recordingError = null,

  // Audio level
  audioLevel = 0,
  isSpeaking = false,
  showAudioLevel = false,

  // Think-aloud prompt
  showPrompt = false,
  currentPrompt = '',
  onDismissPrompt,
  promptPosition = 'top-right',
  autoDismissPromptSeconds = 10,
  thinkAloudEnabled = false,

  // Position
  indicatorPosition = 'top-right',
}: RecordingOverlayProps) {
  // Don't render anything if not recording and not uploading
  if (!isRecording && !isUploading) {
    return null
  }

  return (
    <>
      {/* Recording Indicator with optional Audio Level */}
      <RecordingIndicator
        isRecording={isRecording}
        isPaused={isPaused}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={recordingError}
        position={indicatorPosition}
      >
        {showAudioLevel && isRecording && (
          <AudioLevelIndicator
            audioLevel={audioLevel}
            isSpeaking={isSpeaking}
            visible
            compact
          />
        )}
      </RecordingIndicator>

      {/* Think-Aloud Prompt (shown when silence detected) */}
      {thinkAloudEnabled && onDismissPrompt && (
        <ThinkAloudPrompt
          visible={showPrompt}
          prompt={currentPrompt}
          onDismiss={onDismissPrompt}
          position={promptPosition}
          autoDismissSeconds={autoDismissPromptSeconds}
        />
      )}
    </>
  )
}
