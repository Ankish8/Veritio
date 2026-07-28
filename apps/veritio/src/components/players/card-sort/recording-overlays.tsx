import { ThinkAloudPrompt } from '../shared/think-aloud-prompt'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

interface RecordingOverlaysProps {
  thinkAloudEnabled: boolean
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: () => void
  promptPosition?: ThinkAloudPromptPosition
}

export function RecordingOverlays({
  thinkAloudEnabled,
  showPrompt,
  currentPrompt,
  dismissPrompt,
  promptPosition,
}: RecordingOverlaysProps) {
  return (
    <>
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
