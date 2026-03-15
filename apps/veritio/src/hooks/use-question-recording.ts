'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSessionRecording } from './use-session-recording'

export type QuestionRecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'review' | 'uploading' | 'complete' | 'error'

export interface UseQuestionRecordingOptions {
  /** Study ID */
  studyId: string
  /** Participant ID */
  participantId: string
  /** Session token for API authentication */
  sessionToken: string
  /** Maximum recording duration in milliseconds */
  maxDurationMs: number
  /** Minimum recording duration in milliseconds (optional) */
  minDurationMs?: number
  /** Callback when recording completes successfully */
  onComplete?: (result: QuestionRecordingResult) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export interface QuestionRecordingResult {
  /** Recording ID from the recordings table */
  recordingId: string
  /** Client-generated response ID for linking */
  responseId: string
  /** Recording duration in milliseconds */
  durationMs: number
}

export interface UseQuestionRecordingReturn {
  /** Current recording state */
  state: QuestionRecordingState
  /** Duration of current recording in milliseconds */
  durationMs: number
  /** Whether recording can be stopped (meets minimum duration) */
  canStop: boolean
  /** Recording ID (available after recording starts) */
  recordingId: string | null
  /** Response ID (client-generated UUID for linking) */
  responseId: string | null
  /** Error message if in error state */
  error: string | null
  /** Start recording */
  startRecording: () => Promise<void>
  /** Pause recording */
  pauseRecording: () => void
  /** Resume recording */
  resumeRecording: () => void
  /** Stop recording and finalize */
  stopRecording: () => void
  /** Reset to start a new recording (re-record) */
  resetRecording: () => void
}

/** Manages audio recordings for audio_response questions using useSessionRecording. */
export function useQuestionRecording(options: UseQuestionRecordingOptions): UseQuestionRecordingReturn {
  const {
    studyId,
    participantId,
    sessionToken,
    maxDurationMs,
    minDurationMs = 0,
    onComplete,
    onError,
  } = options

  const [state, setState] = useState<QuestionRecordingState>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [responseId, setResponseId] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedDurationRef = useRef<number>(0)

  const sessionRecording = useSessionRecording({
    studyId,
    participantId,
    sessionToken,
    captureMode: 'audio',
    scope: 'question',
    taskAttemptId: responseId ?? undefined, // Link to response via taskAttemptId field
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onRecordingStart: (recordingId) => {
      setState('recording')
      // eslint-disable-next-line react-hooks/purity
      startTimeRef.current = Date.now()
      startDurationTimer()
    },
    onRecordingStop: () => {
      stopDurationTimer()
    },
    onError: (err) => {
      setState('error')
      setError(err.message)
      onError?.(err)
    },
  })

  const startDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current + pausedDurationRef.current
        setDurationMs(elapsed)

        // Auto-stop at max duration
        if (elapsed >= maxDurationMs) {
          sessionRecording.stopRecording()
          setState('review')
        }
      }
    }, 100) // Update every 100ms for smooth display
  }, [maxDurationMs, sessionRecording])

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopDurationTimer()
    }
  }, [stopDurationTimer])

  const startRecording = useCallback(async () => {
    try {
      setState('requesting')
      setError(null)
      setDurationMs(0)
      pausedDurationRef.current = 0

      const newResponseId = crypto.randomUUID()
      setResponseId(newResponseId)

      await sessionRecording.startRecording()
    } catch (err) {
      setState('error')
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      setError(message)
      onError?.(new Error(message))
    }
  }, [sessionRecording, onError])

  const pauseRecording = useCallback(() => {
    sessionRecording.pauseRecording()
    setState('paused')
    stopDurationTimer()

    if (startTimeRef.current) {
      pausedDurationRef.current += Date.now() - startTimeRef.current
      startTimeRef.current = null
    }
  }, [sessionRecording, stopDurationTimer])

  const resumeRecording = useCallback(() => {
    sessionRecording.resumeRecording()
    setState('recording')
    startTimeRef.current = Date.now()
    startDurationTimer()
  }, [sessionRecording, startDurationTimer])

  const stopRecording = useCallback(() => {
    sessionRecording.stopRecording()
    stopDurationTimer()
    setState('review')

    let finalDuration = pausedDurationRef.current
    if (startTimeRef.current) {
      finalDuration += Date.now() - startTimeRef.current
    }
    setDurationMs(finalDuration)

    if (sessionRecording.recordingId && responseId) {
      onComplete?.({
        recordingId: sessionRecording.recordingId,
        responseId,
        durationMs: finalDuration,
      })
    }
  }, [sessionRecording, stopDurationTimer, responseId, onComplete])

  const resetRecording = useCallback(() => {
    setState('idle')
    setDurationMs(0)
    setError(null)
    setResponseId(null)
    pausedDurationRef.current = 0
    startTimeRef.current = null
    stopDurationTimer()
  }, [stopDurationTimer])

  const canStop = durationMs >= minDurationMs

  return {
    state,
    durationMs,
    canStop,
    recordingId: sessionRecording.recordingId,
    responseId,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatDurationWithMax(currentMs: number, maxMs: number): string {
  return `${formatDuration(currentMs)} / ${formatDuration(maxMs)}`
}
