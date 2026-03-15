'use client'

import { useCallback, useMemo } from 'react'
import { useAudioLevelMonitor } from './use-audio-level-monitor'
import { useLiveTranscription, type TranscriptSegment } from './use-live-transcription'

export type SilenceDetectionMode = 'transcription' | 'audio_levels' | 'auto'

export interface UseSilenceDetectionOptions {
  /** MediaStream containing audio track */
  mediaStream: MediaStream | null
  /** Whether detection is enabled */
  enabled: boolean
  /** Detection mode: 'transcription' (Deepgram), 'audio_levels' (Web Audio), or 'auto' (try transcription first) */
  mode?: SilenceDetectionMode
  /** Study ID (required for transcription mode) */
  studyId?: string
  /** Participant ID (required for transcription mode) */
  participantId?: string
  /** Session token (required for transcription mode) */
  sessionToken?: string
  /** Audio level threshold (0-1) for audio_levels mode. Default: 0.15 */
  audioLevelThreshold?: number
  /** Silence duration threshold in seconds. Default: 15 */
  silenceThresholdSeconds?: number
  /** Callback when silence is detected */
  onSilenceDetected?: () => void
  /** Callback when speech resumes */
  onSpeechResumed?: () => void
  /** Callback when transcript is received (transcription mode only) */
  onTranscript?: (text: string, isFinal: boolean) => void
}

export interface UseSilenceDetectionReturn {
  /** Whether speech is currently detected */
  isSpeaking: boolean
  /** Whether silence has been detected (threshold exceeded) */
  isSilent: boolean
  /** Current silence duration in seconds */
  silenceDuration: number
  /** Current audio level (0-100) - only available in audio_levels mode */
  audioLevel: number
  /** Recent transcript text - only available in transcription mode */
  recentTranscript: string
  /** Active detection mode being used */
  activeMode: 'transcription' | 'audio_levels' | 'none'
  /** Whether transcription is connected (if using transcription mode) */
  isTranscriptionConnected: boolean
  /** Any error from the detection system */
  error: string | null
  /** Reset silence detection state */
  resetSilence: () => void
  /** All accumulated transcript segments (transcription mode only) */
  accumulatedSegments: TranscriptSegment[]
  /** Full accumulated transcript text (transcription mode only) */
  fullTranscript: string
  /** Total word count (transcription mode only) */
  wordCount: number
  /** Save accumulated transcript to database. Call when recording stops. */
  saveTranscript: (recordingId: string) => Promise<{ transcriptId: string; status: string } | null>
  /** Clear accumulated segments (for new recording) */
  clearSegments: () => void
}

/** Unified silence detection with Deepgram transcription and audio level fallback. */
export function useSilenceDetection(
  options: UseSilenceDetectionOptions
): UseSilenceDetectionReturn {
  const {
    mediaStream,
    enabled,
    mode = 'auto',
    studyId,
    participantId,
    sessionToken,
    audioLevelThreshold = 0.15,
    silenceThresholdSeconds = 15,
    onSilenceDetected,
    onSpeechResumed,
    onTranscript,
  } = options

  const hasTranscriptionParams = !!studyId && !!participantId && !!sessionToken
  const shouldTryTranscription =
    (mode === 'transcription' || mode === 'auto') && hasTranscriptionParams

  const transcription = useLiveTranscription({
    mediaStream,
    enabled: enabled && shouldTryTranscription,
    studyId: studyId || '',
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    silenceThresholdSeconds,
    onSilenceDetected,
    onSpeechResumed,
    onTranscript,
  })

  // Use audio levels as immediate backup while transcription connects
  const shouldUseAudioLevels =
    mode === 'audio_levels' ||
    (mode === 'auto' && !transcription.isConnected)

  const audioMonitor = useAudioLevelMonitor({
    mediaStream,
    enabled: enabled && shouldUseAudioLevels,
    audioLevelThreshold,
    silenceThresholdSeconds,
    onSilenceDetected,
    onSpeechResumed,
  })

  // Priority: transcription (if connected) > audio_levels (fallback)
  const activeMode = useMemo((): 'transcription' | 'audio_levels' | 'none' => {
    if (!enabled) return 'none'
    if (transcription.isConnected) return 'transcription'
    if (shouldUseAudioLevels && mediaStream) return 'audio_levels'
    return 'none'
  }, [enabled, transcription.isConnected, shouldUseAudioLevels, mediaStream])

  const resetSilence = useCallback(() => {
    transcription.resetSilence()
    audioMonitor.resetSilence()
  }, [transcription, audioMonitor])

  return useMemo((): UseSilenceDetectionReturn => {
    const baseTranscriptFunctions = {
      accumulatedSegments: transcription.accumulatedSegments,
      fullTranscript: transcription.fullTranscript,
      wordCount: transcription.wordCount,
      saveTranscript: transcription.saveTranscript,
      clearSegments: transcription.clearSegments,
    }

    if (activeMode === 'transcription') {
      return {
        isSpeaking: transcription.isSpeaking,
        isSilent: transcription.isSilent,
        silenceDuration: transcription.silenceDuration,
        audioLevel: 0, // Not available in transcription mode
        recentTranscript: transcription.recentTranscript,
        activeMode: 'transcription',
        isTranscriptionConnected: transcription.isConnected,
        error: transcription.error,
        resetSilence,
        ...baseTranscriptFunctions,
      }
    }

    if (activeMode === 'audio_levels') {
      return {
        isSpeaking: audioMonitor.isSpeaking,
        isSilent: audioMonitor.isSilent,
        silenceDuration: audioMonitor.silenceDuration,
        audioLevel: audioMonitor.audioLevel,
        recentTranscript: '',
        activeMode: 'audio_levels',
        isTranscriptionConnected: false,
        error: transcription.error ? 'Transcription unavailable, using audio levels' : null,
        resetSilence,
        ...baseTranscriptFunctions,
      }
    }

    return {
      isSpeaking: false,
      isSilent: false,
      silenceDuration: 0,
      audioLevel: 0,
      recentTranscript: '',
      activeMode: 'none',
      isTranscriptionConnected: false,
      error: null,
      resetSilence,
      ...baseTranscriptFunctions,
    }
  }, [
    activeMode,
    transcription.isSpeaking,
    transcription.isSilent,
    transcription.silenceDuration,
    transcription.recentTranscript,
    transcription.isConnected,
    transcription.error,
    transcription.accumulatedSegments,
    transcription.fullTranscript,
    transcription.wordCount,
    transcription.saveTranscript,
    transcription.clearSegments,
    audioMonitor.isSpeaking,
    audioMonitor.isSilent,
    audioMonitor.silenceDuration,
    audioMonitor.audioLevel,
    resetSilence,
  ])
}
