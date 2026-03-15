import { useCallback } from 'react'
import { useSessionRecording } from '@/hooks/use-session-recording'
import { useRecordingEventCapture } from '@/hooks/use-recording-event-capture'
import { useSilenceDetection } from '@/hooks/use-silence-detection'
import { useThinkAloudPrompts } from '@/hooks/use-think-aloud-prompts'
import { DEFAULT_THINK_ALOUD } from '@/components/builders/shared/types'
import type { TreeTestSettings } from '@veritio/study-types'
import type { TreeTestPhase } from './types'

interface UseTreeTestRecordingOptions {
  studyId: string
  participantId: string
  sessionToken: string
  settings: TreeTestSettings
}

export function useTreeTestRecording({
  studyId,
  participantId,
  sessionToken,
  settings,
}: UseTreeTestRecordingOptions) {
  const recordingEnabled = settings.sessionRecordingSettings?.enabled ?? false
  const thinkAloudSettings = settings.sessionRecordingSettings?.thinkAloud ?? DEFAULT_THINK_ALOUD

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
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    captureMode: settings.sessionRecordingSettings?.captureMode || 'audio',
  })

  // Recording event capture (captures node interactions, task events)
  const {
    captureTaskStart,
    captureTaskEnd,
    captureCustomEvent,
  } = useRecordingEventCapture({
    recordingId,
    recordingStartTime,
    sessionToken,
    isRecording,
  })

  // Silence detection for think-aloud
  const { audioLevel, isSpeaking, isSilent, silenceDuration, saveTranscript: saveLiveTranscript } = useSilenceDetection({
    mediaStream,
    enabled: isRecording && thinkAloudSettings.enabled,
    mode: 'auto',
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
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

  // Determine next phase after recording consent
  const nextPhaseAfterConsent: TreeTestPhase = thinkAloudSettings.enabled && thinkAloudSettings.showEducation
    ? 'think_aloud_education'
    : 'task_active'

  // Should we show recording consent? (after instructions but before tasks)
  const shouldShowRecordingConsent = recordingEnabled && !isRecording

  // Stop recording and save transcript
  const stopRecordingWithTranscript = useCallback(async () => {
    if (!isRecording) return
    try {
      if (recordingId && thinkAloudSettings.enabled) {
        await saveLiveTranscript(recordingId).catch(() => {})
      }
      await stopRecording()
    } catch {
      // Recording stop failed - continue anyway
    }
  }, [isRecording, recordingId, thinkAloudSettings.enabled, saveLiveTranscript, stopRecording])

  return {
    // Recording state
    recordingEnabled,
    thinkAloudSettings,
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingError,
    startRecording,
    stopRecordingWithTranscript,

    // Event capture
    captureTaskStart,
    captureTaskEnd,
    captureCustomEvent,

    // Think-aloud
    audioLevel,
    isSpeaking,
    showPrompt,
    currentPrompt,
    dismissPrompt,

    // Phase helpers
    nextPhaseAfterConsent,
    shouldShowRecordingConsent,
  }
}
