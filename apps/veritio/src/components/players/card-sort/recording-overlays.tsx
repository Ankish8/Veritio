import { RecordingIndicator } from '../shared/recording-indicator'
import { ThinkAloudPrompt } from '../shared/think-aloud-prompt'
import { AudioLevelIndicator } from '../shared/audio-level-indicator'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

interface RecordingOverlaysProps {
  isRecording: boolean
  isPaused: boolean
  isUploading: boolean
  uploadProgress: number
  recordingError: string | null
  thinkAloudEnabled: boolean
  audioLevel: number
  isSpeaking: boolean
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: () => void
  promptPosition?: ThinkAloudPromptPosition
}

export function RecordingOverlays({
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
  promptPosition,
}: RecordingOverlaysProps) {
  return (
    <>
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

      {thinkAloudEnabled && (
        <ThinkAloudPrompt
          visible={showPrompt}
          prompt={currentPrompt}
          onDismiss={dismissPrompt}
          position={promptPosition}
          autoDismissSeconds={10}
        />
      )}
    </>
  )
}
