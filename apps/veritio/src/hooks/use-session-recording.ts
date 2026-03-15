'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useRecordingStore } from '@/stores/recording-store'
import { useRecordingCapabilities } from './use-recording-capabilities'
import { useSessionRecordingPermissions } from './use-session-recording-permissions'
import { useSessionRecordingUpload } from './use-session-recording-upload'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'

const CHUNK_INTERVAL_MS = 5000 // 5 seconds per chunk

export interface UseSessionRecordingOptions {
  studyId: string
  participantId: string
  sessionToken: string
  captureMode: RecordingCaptureMode
  /** Capture entire screen instead of current tab. Use when the study opens external tabs (e.g. live website testing). */
  preferFullScreen?: boolean
  /** Recording scope: 'session' for whole study, 'task' for per-task recordings, 'question' for audio response questions */
  scope?: 'session' | 'task' | 'question'
  /** Task attempt ID (required when scope is 'task') */
  taskAttemptId?: string
  /** Callback when recording starts successfully */
  onRecordingStart?: (recordingId: string) => void
  /** Callback when recording stops */
  onRecordingStop?: () => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

export interface UseSessionRecordingReturn {
  /** Whether recording is currently active */
  isRecording: boolean
  /** Whether recording is paused */
  isPaused: boolean
  /** Whether upload is in progress */
  isUploading: boolean
  /** Upload progress (0-100) */
  uploadProgress: number
  /** Current recording ID (for event correlation) */
  recordingId: string | null
  /** Recording start timestamp (for relative event timing) */
  recordingStartTime: number | null
  /** Current MediaStream (for audio level monitoring) */
  mediaStream: MediaStream | null
  /** Request permissions and start recording. Pass pre-acquired streams to skip permission prompts. */
  startRecording: (preAcquiredStreams?: MediaStream[]) => Promise<void>
  /** Pause the recording */
  pauseRecording: () => void
  /** Resume the recording */
  resumeRecording: () => void
  /** Stop the recording and wait for finalization (up to 30s timeout) */
  stopRecording: () => Promise<void>
  /** Current recording error if any */
  error: string | null
}

/** Manages session recording with MediaRecorder, chunked uploads, and pause/resume. */
export function useSessionRecording(options: UseSessionRecordingOptions): UseSessionRecordingReturn {
  const { studyId, participantId, sessionToken, captureMode, preferFullScreen, scope = 'session', taskAttemptId, onRecordingStart, onRecordingStop, onError } = options

  const {
    status,
    uploadProgress,
    uploadError,
    mediaRecorder,
    startRecording: storeStartRecording,
    pauseRecording: storePauseRecording,
    resumeRecording: storeResumeRecording,
    stopRecording: storeStopRecording,
    setStatus,
    setUploadError,
    reset,
  } = useRecordingStore()

  const { capabilities, getFallbackMode } = useRecordingCapabilities()
  const { requestPermissions } = useSessionRecordingPermissions({ preferFullScreen })
  const {
    uploadQueueRef,
    bufferRef,
    bufferSizeRef,
    webcamUploadQueueRef,
    webcamBufferRef,
    webcamBufferSizeRef,
    flushBuffer,
    flushWebcamBuffer,
    processUploadQueue,
    processWebcamUploadQueue,
    finalizeRecordingInBackground,
    resetUploadRefs,
  } = useSessionRecordingUpload({ sessionToken, participantId, onError })

  const webcamRecorderRef = useRef<MediaRecorder | null>(null)
  const webcamRecordingIdRef = useRef<string | null>(null)

  // Synchronous guard: React state updates are async, so multiple calls to
  // stopRecording() in the same render cycle would all pass the mediaRecorder check
  const isStoppingRef = useRef(false)

  const initializeRecording = useCallback(async (mode: RecordingCaptureMode): Promise<{
    recordingId: string
    uploadId: string
    webcamRecordingId?: string
    webcamUploadId?: string
  }> => {
    const isPreviewMode = sessionToken === 'preview-token' || participantId === 'preview-participant'
    if (isPreviewMode) {
      return {
        recordingId: `preview-recording-${crypto.randomUUID()}`,
        uploadId: 'preview-upload',
        ...(mode === 'video_and_audio' ? {
          webcamRecordingId: `preview-webcam-${crypto.randomUUID()}`,
          webcamUploadId: 'preview-webcam-upload',
        } : {}),
      }
    }

    const apiCaptureMode = mode === 'screen_and_audio' ? 'screen_audio'
      : mode === 'video_and_audio' ? 'screen_audio_webcam'
      : mode // 'audio' stays as-is

    const requestBody = {
      study_id: studyId,
      participant_id: participantId,
      capture_mode: apiCaptureMode,
      scope,
      ...(scope === 'task' && taskAttemptId ? { task_attempt_id: taskAttemptId } : {}),
    }

    const response = await fetch(`/api/recordings/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: Record<string, unknown> = {}
      try {
        errorData = JSON.parse(errorText)
      } catch {
        // Non-JSON error response
      }
      const errorMessage = (errorData.error as string) || (errorData.message as string) || `Failed to initialize recording (${response.status})`
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return {
      recordingId: data.recording_id,
      uploadId: data.upload_id,
      webcamRecordingId: data.webcam_recording_id,
      webcamUploadId: data.webcam_upload_id,
    }
  }, [studyId, participantId, sessionToken, scope, taskAttemptId])

  const startRecording = useCallback(async (preAcquiredStreams?: MediaStream[]) => {
    try {
      // When streams were pre-acquired (e.g. from inline consent screen), the user
      // already granted all permissions — skip capability-based fallback which may
      // incorrectly downgrade the mode (e.g. video_and_audio → screen_and_audio)
      // because enumerateDevices() ran before permissions were granted.
      const modeToUse = preAcquiredStreams?.length
        ? captureMode
        : (getFallbackMode(captureMode) || captureMode)
      const streams = await requestPermissions(modeToUse, preAcquiredStreams)
      const { recordingId, uploadId, webcamRecordingId, webcamUploadId } = await initializeRecording(modeToUse)

      const mimeType = capabilities.preferredMimeType || 'video/webm'
      const recorder = new MediaRecorder(streams.primary, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000,  // 128 kbps
      })

      resetUploadRefs()
      isStoppingRef.current = false

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          bufferRef.current.push(event.data)
          bufferSizeRef.current += event.data.size
          flushBuffer(recordingId)
        }
      }

      recorder.onerror = () => {
        const error = new Error('Primary MediaRecorder error')
        setUploadError(error.message)
        onError?.(error)
      }

      recorder.start(CHUNK_INTERVAL_MS)

      if (streams.webcam && webcamRecordingId && webcamUploadId) {
        webcamRecordingIdRef.current = webcamRecordingId

        const webcamRecorder = new MediaRecorder(streams.webcam, {
          mimeType,
          videoBitsPerSecond: 1500000, // 1.5 Mbps (lower quality for webcam)
        })

        webcamRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            webcamBufferRef.current.push(event.data)
            webcamBufferSizeRef.current += event.data.size
            flushWebcamBuffer(webcamRecordingId)
          }
        }

        webcamRecorder.onerror = () => {
          const error = new Error('Webcam MediaRecorder error')
          setUploadError(error.message)
          onError?.(error)
        }

        webcamRecorder.start(CHUNK_INTERVAL_MS)
        webcamRecorderRef.current = webcamRecorder
      }

      storeStartRecording({
        recordingId,
        uploadId,
        participantId,
        studyId,
        captureMode: modeToUse,
        mediaRecorder: recorder,
        mediaStream: streams.primary,
      })

      onRecordingStart?.(recordingId)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording')
      setUploadError(error.message)
      onError?.(error)
      reset()
    }
  }, [
    captureMode,
    capabilities.preferredMimeType,
    getFallbackMode,
    requestPermissions,
    initializeRecording,
    flushBuffer,
    flushWebcamBuffer,
    resetUploadRefs,
    bufferRef,
    bufferSizeRef,
    webcamBufferRef,
    webcamBufferSizeRef,
    storeStartRecording,
    participantId,
    studyId,
    setUploadError,
    onError,
    onRecordingStart,
    reset,
  ])

  const pauseRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      storePauseRecording()
    }
    if (webcamRecorderRef.current && webcamRecorderRef.current.state === 'recording') {
      webcamRecorderRef.current.pause()
    }
  }, [mediaRecorder, storePauseRecording])

  const resumeRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      storeResumeRecording()
    }
    if (webcamRecorderRef.current && webcamRecorderRef.current.state === 'paused') {
      webcamRecorderRef.current.resume()
    }
  }, [mediaRecorder, storeResumeRecording])

  const stopRecording = useCallback(async () => {
    if (isStoppingRef.current) return
    if (!mediaRecorder) return

    isStoppingRef.current = true

    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }

    if (webcamRecorderRef.current && webcamRecorderRef.current.state !== 'inactive') {
      webcamRecorderRef.current.stop()
    }

    storeStopRecording()

    const recordingId = useRecordingStore.getState().recordingId
    const webcamRecordingId = webcamRecordingIdRef.current

    const primaryPromise = recordingId
      ? finalizeRecordingInBackground(
          recordingId,
          uploadQueueRef.current,
          processUploadQueue,
          flushBuffer,
          'Primary'
        )
      : Promise.resolve()

    const webcamPromise = webcamRecordingId
      ? finalizeRecordingInBackground(
          webcamRecordingId,
          webcamUploadQueueRef.current,
          processWebcamUploadQueue,
          flushWebcamBuffer,
          'Webcam'
        )
      : Promise.resolve()

    // Wait for finalization to complete, but cap at 30s so users aren't stuck forever.
    // If finalization takes longer, beacon/cron will handle the rest.
    const finalizationPromise = Promise.allSettled([primaryPromise, webcamPromise]).then(() => {
      setStatus('completed')
      // Reset after a short delay so the thank-you screen can show "Recording saved!" briefly
      setTimeout(() => reset(), 2000)
    })
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 30000))
    await Promise.race([finalizationPromise, timeout])

    webcamRecorderRef.current = null
    webcamRecordingIdRef.current = null

    onRecordingStop?.()
  }, [
    mediaRecorder,
    storeStopRecording,
    flushBuffer,
    flushWebcamBuffer,
    uploadQueueRef,
    webcamUploadQueueRef,
    processUploadQueue,
    processWebcamUploadQueue,
    finalizeRecordingInBackground,
    setStatus,
    onRecordingStop,
    reset,
  ])

  const attemptFinalizeOnUnload = useCallback(() => {
    const state = useRecordingStore.getState()
    // Only beacon-finalize if we're actively recording/paused — not if already
    // finalizing (uploading/completed) or idle. Without this guard, the beacon
    // would re-finalize a recording that stopRecording() is already handling.
    if (!state.recordingId || state.status === 'idle' || state.status === 'uploading' || state.status === 'completed') return

    const isPreviewMode = sessionToken === 'preview-token' || participantId === 'preview-participant'
    if (isPreviewMode) return

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop()
    }

    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop())
    }

    const data = JSON.stringify({
      sessionToken,
      participantId,
    })
    navigator.sendBeacon(`/api/recordings/${state.recordingId}/finalize-beacon`, data)
  }, [sessionToken, participantId])

  // Warn user before closing tab while recording is being finalized (uploading)
  useEffect(() => {
    const handleBeforeUnloadWarning = (e: BeforeUnloadEvent) => {
      const state = useRecordingStore.getState()
      if (state.status === 'uploading') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnloadWarning)
    return () => window.removeEventListener('beforeunload', handleBeforeUnloadWarning)
  }, [])

  useEffect(() => {
    // pagehide fires for both regular navigation AND bfcache eviction.
    // NOTE: We intentionally do NOT listen to visibilitychange here because
    // it fires on normal tab switches (e.g., live website test opening a new tab).
    // Sending a finalize beacon on tab switch would kill active recordings.
    // beforeunload + pagehide are sufficient for catching real page closes.
    window.addEventListener('beforeunload', attemptFinalizeOnUnload)
    window.addEventListener('pagehide', attemptFinalizeOnUnload)

    return () => {
      window.removeEventListener('beforeunload', attemptFinalizeOnUnload)
      window.removeEventListener('pagehide', attemptFinalizeOnUnload)
    }
  }, [attemptFinalizeOnUnload])

  useEffect(() => {
    return () => {
      const state = useRecordingStore.getState()
      if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop()
      }
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop())
      }
      useRecordingStore.getState().reset()
    }
  }, [])

  const recordingId = useRecordingStore(state => state.recordingId)
  const recordingStartTime = useRecordingStore(state => state.startTime)
  const mediaStream = useRecordingStore(state => state.mediaStream)

  return {
    isRecording: status === 'recording',
    isPaused: status === 'paused',
    isUploading: status === 'uploading',
    uploadProgress,
    recordingId,
    recordingStartTime,
    mediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    error: uploadError,
  }
}
