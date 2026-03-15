'use client'

import { useCallback, useMemo } from 'react'
import { useSessionRecording } from './use-session-recording'
import { useRecordingEventCapture, type UseRecordingEventCaptureReturn } from './use-recording-event-capture'
import { useSilenceDetection, type UseSilenceDetectionReturn } from './use-silence-detection'
import { useThinkAloudPrompts, type UseThinkAloudPromptsReturn } from './use-think-aloud-prompts'
import { DEFAULT_THINK_ALOUD, type ThinkAloudSettings, type RecordingCaptureMode } from '@/components/builders/shared/types'

export interface RecordingSettings {
  /** Whether recording is enabled for this study */
  enabled: boolean
  /** Capture mode: audio, screen_audio, camera, etc. */
  captureMode: RecordingCaptureMode
  /** Think-aloud settings */
  thinkAloud?: ThinkAloudSettings
  /** Recording scope: 'session' for whole study, 'task' for per-task recordings */
  recordingScope?: 'session' | 'task'
}

export interface UsePlayerRecordingOptions {
  /** Study ID */
  studyId: string
  /** Participant ID (can be empty string if not yet assigned) */
  participantId: string
  /** Session token (can be empty string if not yet assigned) */
  sessionToken: string
  /** Recording settings from study settings */
  recordingSettings: RecordingSettings | null | undefined
  /** Capture entire screen instead of current tab (for studies that open external tabs) */
  preferFullScreen?: boolean
  /** Recording scope override (defaults to recordingSettings.recordingScope or 'session') */
  scope?: 'session' | 'task'
  /** Task attempt ID (required when scope is 'task') */
  taskAttemptId?: string
  /** Callback when recording starts successfully */
  onRecordingStart?: (recordingId: string) => void
  /** Callback when recording stops */
  onRecordingStop?: () => void
}

export interface UsePlayerRecordingReturn {
  recordingEnabled: boolean
  thinkAloudSettings: ThinkAloudSettings
  isRecording: boolean
  isPaused: boolean
  isUploading: boolean
  uploadProgress: number
  recordingId: string | null
  recordingStartTime: number | null
  mediaStream: MediaStream | null
  recordingError: string | null
  startRecording: (preAcquiredStreams?: MediaStream[]) => Promise<void>
  stopRecording: () => Promise<void>
  captureCustomEvent: UseRecordingEventCaptureReturn['captureCustomEvent']
  captureClick: UseRecordingEventCaptureReturn['captureClick']
  captureNavigation: UseRecordingEventCaptureReturn['captureNavigation']
  captureTaskStart: UseRecordingEventCaptureReturn['captureTaskStart']
  captureTaskEnd: UseRecordingEventCaptureReturn['captureTaskEnd']
  flushEvents: UseRecordingEventCaptureReturn['flush']
  audioLevel: number
  isSpeaking: boolean
  isSilent: boolean
  silenceDuration: number
  saveTranscript: UseSilenceDetectionReturn['saveTranscript']
  showPrompt: boolean
  currentPrompt: string
  dismissPrompt: UseThinkAloudPromptsReturn['dismissPrompt']
  stopRecordingWithTranscript: () => Promise<void>
}

/** Composite hook combining session recording, event capture, silence detection, and think-aloud prompts. */
export function usePlayerRecording(options: UsePlayerRecordingOptions): UsePlayerRecordingReturn {
  const {
    studyId,
    participantId,
    sessionToken,
    recordingSettings,
    preferFullScreen,
    scope,
    taskAttemptId,
    onRecordingStart,
    onRecordingStop,
  } = options

  const recordingEnabled = recordingSettings?.enabled ?? false
  const thinkAloudSettings = recordingSettings?.thinkAloud ?? DEFAULT_THINK_ALOUD
  const captureMode = recordingSettings?.captureMode ?? 'audio'
  const recordingScope = scope ?? recordingSettings?.recordingScope ?? 'session'

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
    captureMode,
    preferFullScreen,
    scope: recordingScope,
    taskAttemptId,
    onRecordingStart,
    onRecordingStop,
  })

  const {
    captureCustomEvent,
    captureClick,
    captureNavigation,
    captureTaskStart,
    captureTaskEnd,
    flush: flushEvents,
  } = useRecordingEventCapture({
    recordingId,
    recordingStartTime,
    sessionToken,
    isRecording,
  })

  const {
    audioLevel,
    isSpeaking,
    isSilent,
    silenceDuration,
    saveTranscript,
  } = useSilenceDetection({
    mediaStream,
    enabled: isRecording && thinkAloudSettings.enabled,
    mode: 'auto', // Try Deepgram transcription first, fallback to audio levels
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    audioLevelThreshold: thinkAloudSettings.audioLevelThreshold,
    silenceThresholdSeconds: thinkAloudSettings.silenceThresholdSeconds,
  })

  const {
    showPrompt,
    currentPrompt,
    dismissPrompt,
  } = useThinkAloudPrompts({
    enabled: thinkAloudSettings.enabled && isRecording,
    isSilent,
    customPrompts: thinkAloudSettings.customPrompts,
    captureCustomEvent,
    silenceDuration,
  })

  const stopRecordingWithTranscript = useCallback(async () => {
    if (!isRecording) return

    try {
      // Save live transcript before stopping recording.
      // saveTranscript flushes Deepgram (CloseStream + wait) then saves.
      if (recordingId && thinkAloudSettings.enabled) {
        await saveTranscript(recordingId).catch(() => {
          return null
        })
      }
      await stopRecording()
    } catch {
      // Recording stop failed - continue anyway
    }
  }, [isRecording, recordingId, thinkAloudSettings.enabled, saveTranscript, stopRecording])

  return useMemo(() => ({
    recordingEnabled,
    thinkAloudSettings,
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingId,
    recordingStartTime,
    mediaStream,
    recordingError,
    startRecording,
    stopRecording,
    captureCustomEvent,
    captureClick,
    captureNavigation,
    captureTaskStart,
    captureTaskEnd,
    flushEvents,
    audioLevel,
    isSpeaking,
    isSilent,
    silenceDuration,
    saveTranscript,
    showPrompt,
    currentPrompt,
    dismissPrompt,
    stopRecordingWithTranscript,
  }), [
    recordingEnabled,
    thinkAloudSettings,
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    recordingId,
    recordingStartTime,
    mediaStream,
    recordingError,
    startRecording,
    stopRecording,
    captureCustomEvent,
    captureClick,
    captureNavigation,
    captureTaskStart,
    captureTaskEnd,
    flushEvents,
    audioLevel,
    isSpeaking,
    isSilent,
    silenceDuration,
    saveTranscript,
    showPrompt,
    currentPrompt,
    dismissPrompt,
    stopRecordingWithTranscript,
  ])
}
