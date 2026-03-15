'use client'

import { useCallback, useMemo } from 'react'
import { useAudioLevelMonitor } from './use-audio-level-monitor'
import { useLiveTranscription, type TranscriptSegment } from './use-live-transcription'

export type SilenceDetectionMode = 'transcription' | 'audio_levels' | 'auto'

export interface UseSilenceDetectionOptions {
  mediaStream: MediaStream | null
  enabled: boolean
  mode?: SilenceDetectionMode
  studyId?: string
  participantId?: string
  sessionToken?: string
  audioLevelThreshold?: number
  silenceThresholdSeconds?: number
  onSilenceDetected?: () => void
  onSpeechResumed?: () => void
  onTranscript?: (text: string, isFinal: boolean) => void
}

export interface UseSilenceDetectionReturn {
  isSpeaking: boolean
  isSilent: boolean
  silenceDuration: number
  audioLevel: number
  recentTranscript: string
  activeMode: 'transcription' | 'audio_levels' | 'none'
  isTranscriptionConnected: boolean
  error: string | null
  resetSilence: () => void
  accumulatedSegments: TranscriptSegment[]
  fullTranscript: string
  wordCount: number
  saveTranscript: (recordingId: string) => Promise<{ transcriptId: string; status: string } | null>
  clearSegments: () => void
}

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
        audioLevel: 0,
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
