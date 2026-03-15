'use client'
import { useSessionRecording, useRecordingEventCapture, useSilenceDetection, useThinkAloudPrompts } from '@veritio/study-flow/hooks'
import type { PrototypeTestSettings } from '@veritio/study-types'
import { DEFAULT_THINK_ALOUD } from '../builder/shared/types'

interface UseRecordingSetupParams {
  studyId: string
  participantId: string
  sessionToken: string
  settings: PrototypeTestSettings
  currentTaskAttemptId?: string
}

export function useRecordingSetup({
  studyId,
  participantId,
  sessionToken,
  settings,
  currentTaskAttemptId,
}: UseRecordingSetupParams) {
  const recordingEnabled = settings.sessionRecordingSettings?.enabled ?? false
  const recordingScope = settings.sessionRecordingSettings?.recordingScope || 'session'
  const thinkAloudSettings = settings.sessionRecordingSettings?.thinkAloud ?? DEFAULT_THINK_ALOUD

  // Session recording
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
    participantId,
    sessionToken,
    captureMode: settings.sessionRecordingSettings?.captureMode || 'audio',
    scope: recordingScope,
    taskAttemptId: recordingScope === 'task' ? currentTaskAttemptId : undefined,
  })

  // Recording event capture
  const {
    captureClick: captureRecordingClick,
    captureNavigation: captureRecordingNav,
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
  const {
    audioLevel,
    isSpeaking,
    isSilent,
    silenceDuration,
    saveTranscript: saveLiveTranscript,
  } = useSilenceDetection({
    mediaStream,
    enabled: isRecording && thinkAloudSettings.enabled,
    mode: 'auto',
    studyId,
    participantId,
    sessionToken,
    audioLevelThreshold: thinkAloudSettings.audioLevelThreshold,
    silenceThresholdSeconds: thinkAloudSettings.silenceThresholdSeconds,
  })

  // Think-aloud prompts
  const { showPrompt, currentPrompt, dismissPrompt } = useThinkAloudPrompts({
    enabled: thinkAloudSettings.enabled && isRecording,
    isSilent,
    customPrompts: thinkAloudSettings.customPrompts,
    captureCustomEvent,
    silenceDuration,
  })

  return {
    recordingEnabled,
    recordingScope,
    thinkAloudSettings,
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingId,
    mediaStream,
    startRecording,
    stopRecording,
    recordingError,
    captureRecordingClick,
    captureRecordingNav,
    captureTaskStart,
    captureTaskEnd,
    audioLevel,
    isSpeaking,
    showPrompt,
    currentPrompt,
    dismissPrompt,
    saveLiveTranscript,
  }
}
