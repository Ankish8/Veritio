/**
 * Hook for managing recording consent flow in prototype testing.
 *
 * Handles the recording consent phase:
 * - Starting recording after consent
 * - Declining recording and continuing without it
 * - Error handling for recording failures
 */
import { useCallback } from 'react'
import type { PrototypeTestPhase } from '../types'

interface UseRecordingConsentOptions {
  recordingEnabled: boolean
  embeddedMode: boolean
  startRecording: () => Promise<void>
  resetTaskState: () => void
  startTaskTiming: () => void
  setPhase: (phase: PrototypeTestPhase) => void
  onRecordingConsent?: () => void
  nextPhaseAfterConsent?: PrototypeTestPhase
}
export function useRecordingConsent({
  recordingEnabled,
  embeddedMode,
  startRecording,
  resetTaskState,
  startTaskTiming,
  setPhase,
  onRecordingConsent,
  nextPhaseAfterConsent = 'task_active',
}: UseRecordingConsentOptions) {
  const handleRecordingConsent = useCallback(async () => {
    // Signal that user consented - recording will start when task begins
    onRecordingConsent?.()
    resetTaskState()
    startTaskTiming()
    setPhase(nextPhaseAfterConsent)
  }, [onRecordingConsent, resetTaskState, startTaskTiming, setPhase, nextPhaseAfterConsent])
  const handleRecordingDecline = useCallback(() => {
    resetTaskState()
    startTaskTiming()
    setPhase('task_active')
  }, [resetTaskState, startTaskTiming, setPhase])
  const shouldShowRecordingConsent = recordingEnabled && !embeddedMode

  return {
    handleRecordingConsent,
    handleRecordingDecline,
    shouldShowRecordingConsent,
  }
}
