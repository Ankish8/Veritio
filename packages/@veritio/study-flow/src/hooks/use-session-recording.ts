'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useRecordingStore } from '../stores/recording-store'
import { useRecordingCapabilities } from './use-recording-capabilities'
import type { RecordingCaptureMode } from '../types/player-types'

const CHUNK_INTERVAL_MS = 5000 // 5 seconds per chunk
const TARGET_PART_SIZE = 10 * 1024 * 1024 // 10MB target - all parts must be same size except last

export interface UseSessionRecordingOptions {
  studyId: string
  participantId: string
  sessionToken: string
  captureMode: RecordingCaptureMode
  scope?: 'session' | 'task' | 'question'
  taskAttemptId?: string
  onRecordingStart?: (recordingId: string) => void
  onRecordingStop?: () => void
  onError?: (error: Error) => void
}

export interface UseSessionRecordingReturn {
  isRecording: boolean
  isPaused: boolean
  isUploading: boolean
  uploadProgress: number
  recordingId: string | null
  recordingStartTime: number | null
  mediaStream: MediaStream | null
  startRecording: () => Promise<void>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<void>
  error: string | null
}

interface UploadPipeline {
  uploadQueue: Array<{ blob: Blob; partNumber: number }>
  isUploading: boolean
  buffer: Blob[]
  bufferSize: number
  partNumber: number
}

function createUploadPipeline(): UploadPipeline {
  return { uploadQueue: [], isUploading: false, buffer: [], bufferSize: 0, partNumber: 1 }
}

export function useSessionRecording(options: UseSessionRecordingOptions): UseSessionRecordingReturn {
  const { studyId, participantId, sessionToken, captureMode, scope = 'session', taskAttemptId, onRecordingStart, onRecordingStop, onError } = options

  const {
    status,
    uploadProgress,
    uploadError,
    mediaRecorder,
    startRecording: storeStartRecording,
    pauseRecording: storePauseRecording,
    resumeRecording: storeResumeRecording,
    stopRecording: storeStopRecording,
    addChunk,
    markChunkUploaded,
    setUploadError,
    setStatus,
    setPermissionStatus,
    reset,
  } = useRecordingStore()

  const { capabilities, getFallbackMode } = useRecordingCapabilities()

  const primaryPipelineRef = useRef<UploadPipeline>(createUploadPipeline())
  const webcamPipelineRef = useRef<UploadPipeline>(createUploadPipeline())

  const webcamRecorderRef = useRef<MediaRecorder | null>(null)
  const webcamRecordingIdRef = useRef<string | null>(null)

  const isStoppingRef = useRef(false)

  const requestPermissions = useCallback(async (
    mode: RecordingCaptureMode
  ): Promise<{ primary: MediaStream; webcam?: MediaStream }> => {
    let audioStream: MediaStream | null = null
    let videoStream: MediaStream | null = null
    let screenStream: MediaStream | null = null

    try {
      if (mode === 'audio' || mode === 'screen_and_audio' || mode === 'video_and_audio') {
        setPermissionStatus('microphone', 'pending')
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setPermissionStatus('microphone', 'granted')
      }

      if (mode === 'screen_and_audio' || mode === 'video_and_audio') {
        setPermissionStatus('screen', 'pending')
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
        } as DisplayMediaStreamOptions)
        setPermissionStatus('screen', 'granted')
      }

      if (mode === 'video_and_audio') {
        setPermissionStatus('camera', 'pending')
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setPermissionStatus('camera', 'granted')
      }

      const primaryStream = new MediaStream()
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => primaryStream.addTrack(track))
      }
      if (screenStream) {
        screenStream.getVideoTracks().forEach(track => primaryStream.addTrack(track))
      } else if (videoStream && mode !== 'video_and_audio') {
        videoStream.getVideoTracks().forEach(track => primaryStream.addTrack(track))
      }

      const webcamStream = (mode === 'video_and_audio' && videoStream)
        ? videoStream
        : undefined

      return { primary: primaryStream, webcam: webcamStream }
    } catch (err) {
      audioStream?.getTracks().forEach(track => track.stop())
      videoStream?.getTracks().forEach(track => track.stop())
      screenStream?.getTracks().forEach(track => track.stop())

      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermissionStatus('microphone', 'denied')
        setPermissionStatus('camera', 'denied')
        setPermissionStatus('screen', 'denied')
      }

      throw err
    }
  }, [setPermissionStatus])

  const initializeRecording = useCallback(async (mode: RecordingCaptureMode): Promise<{
    recordingId: string
    uploadId: string
    webcamRecordingId?: string
    webcamUploadId?: string
  }> => {
    const apiCaptureMode = mode === 'screen_and_audio' ? 'screen_audio'
      : mode === 'video_and_audio' ? 'screen_audio_webcam'
      : mode

    const response = await fetch(`/api/recordings/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        study_id: studyId,
        participant_id: participantId,
        capture_mode: apiCaptureMode,
        scope,
        ...(scope === 'task' && taskAttemptId ? { task_attempt_id: taskAttemptId } : {}),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to initialize recording')
    }

    const data = await response.json()
    return {
      recordingId: data.recording_id,
      uploadId: data.upload_id,
      webcamRecordingId: data.webcam_recording_id,
      webcamUploadId: data.webcam_upload_id,
    }
  }, [studyId, participantId, sessionToken, scope, taskAttemptId])

  const uploadChunk = useCallback(async (recordingId: string, blob: Blob, partNumber: number): Promise<void> => {
    const urlResponse = await fetch(`/api/recordings/${recordingId}/chunk-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({ part_number: partNumber }),
    })

    if (!urlResponse.ok) {
      const errorText = await urlResponse.text()
      throw new Error(`Failed to get upload URL: ${urlResponse.status} ${errorText}`)
    }

    const { upload_url } = await urlResponse.json()

    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'video/webm' },
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload chunk')
    }

    const etag = uploadResponse.headers.get('ETag')

    await fetch(`/api/recordings/${recordingId}/confirm-chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken,
      },
      body: JSON.stringify({
        part_number: partNumber,
        etag,
        chunk_size: blob.size,
      }),
    })

    markChunkUploaded(partNumber)
  }, [sessionToken, markChunkUploaded])

  const processQueue = useCallback(async (recordingId: string, pipeline: UploadPipeline) => {
    if (pipeline.isUploading || pipeline.uploadQueue.length === 0) return

    pipeline.isUploading = true

    while (pipeline.uploadQueue.length > 0) {
      const chunk = pipeline.uploadQueue[0]
      try {
        await uploadChunk(recordingId, chunk.blob, chunk.partNumber)
        pipeline.uploadQueue.shift()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed')
        setUploadError(error.message)
        onError?.(error)
        break
      }
    }

    pipeline.isUploading = false
  }, [uploadChunk, setUploadError, onError])

  const flushPipeline = useCallback((recordingId: string, pipeline: UploadPipeline, force = false, trackInStore = false) => {
    if (pipeline.buffer.length === 0) return
    if (!force && pipeline.bufferSize < TARGET_PART_SIZE) return

    const combinedBlob = new Blob(pipeline.buffer, { type: 'video/webm' })
    const partNumber = pipeline.partNumber++

    if (trackInStore) {
      addChunk({ blob: combinedBlob, timestamp: Date.now(), partNumber })
    }
    pipeline.uploadQueue.push({ blob: combinedBlob, partNumber })

    pipeline.buffer = []
    pipeline.bufferSize = 0

    processQueue(recordingId, pipeline)
  }, [addChunk, processQueue])

  const wireRecorder = useCallback((
    recorder: MediaRecorder,
    recordingId: string,
    pipeline: UploadPipeline,
    trackInStore: boolean,
    label: string,
  ) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        pipeline.buffer.push(event.data)
        pipeline.bufferSize += event.data.size
        flushPipeline(recordingId, pipeline, false, trackInStore)
      }
    }
    recorder.onerror = () => {
      const error = new Error(`${label} MediaRecorder error`)
      setUploadError(error.message)
      onError?.(error)
    }
  }, [flushPipeline, setUploadError, onError])

  const startRecording = useCallback(async () => {
    try {
      const modeToUse = getFallbackMode(captureMode) || captureMode
      const streams = await requestPermissions(modeToUse)
      const { recordingId, uploadId, webcamRecordingId, webcamUploadId } = await initializeRecording(modeToUse)

      const mimeType = capabilities.preferredMimeType || 'video/webm'
      const recorder = new MediaRecorder(streams.primary, {
        mimeType,
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      })

      primaryPipelineRef.current = createUploadPipeline()
      isStoppingRef.current = false

      wireRecorder(recorder, recordingId, primaryPipelineRef.current, true, 'Primary')
      recorder.start(CHUNK_INTERVAL_MS)

      if (streams.webcam && webcamRecordingId && webcamUploadId) {
        webcamRecordingIdRef.current = webcamRecordingId
        webcamPipelineRef.current = createUploadPipeline()

        const webcamRecorder = new MediaRecorder(streams.webcam, {
          mimeType,
          videoBitsPerSecond: 1500000,
        })

        wireRecorder(webcamRecorder, webcamRecordingId, webcamPipelineRef.current, false, 'Webcam')
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
    wireRecorder,
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

  const finalizeRecordingInBackground = useCallback(async (
    recordingId: string,
    pipeline: UploadPipeline,
    label: string,
    trackInStore = false
  ) => {
    try {
      flushPipeline(recordingId, pipeline, true, trackInStore)

      const MAX_WAIT_ITERATIONS = 300 // 30s (300 × 100ms) — give large recordings time to finish
      let iterations = 0
      while (pipeline.uploadQueue.length > 0 && iterations < MAX_WAIT_ITERATIONS) {
        await processQueue(recordingId, pipeline)
        await new Promise(resolve => setTimeout(resolve, 100))
        iterations++
      }

      if (pipeline.uploadQueue.length > 0) {
        // Upload queue not empty after timeout, proceeding with finalization
      }

      const MAX_RETRIES = 3
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`/api/recordings/${recordingId}/finalize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Token': sessionToken,
            },
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.error || `Finalize failed with status ${response.status}`

            if (
              errorMessage.includes('not in uploading state') ||
              errorMessage.includes('Recording not found') ||
              response.status === 401 ||
              response.status === 404
            ) {
              lastError = new Error(errorMessage)
              break
            }

            throw new Error(errorMessage)
          }

          return // Success
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(`Failed to finalize ${label}`)

          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 250 * Math.pow(2, attempt)))
          }
        }
      }

      if (lastError) {
        console.error(`[Recording] ${label} finalization failed after retries:`, lastError.message)
        setUploadError(lastError.message)
        onError?.(lastError)
      }
    } catch (err) {
      console.error(`[Recording] ${label} background finalization error:`, err)
    }
  }, [sessionToken, flushPipeline, processQueue, setUploadError, onError])

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
      ? finalizeRecordingInBackground(recordingId, primaryPipelineRef.current, 'Primary', true)
      : Promise.resolve()
    const webcamPromise = webcamRecordingId
      ? finalizeRecordingInBackground(webcamRecordingId, webcamPipelineRef.current, 'Webcam')
      : Promise.resolve()

    // Wait for finalization to complete, but cap at 30s so users aren't stuck forever.
    // If finalization takes longer, beacon/cron will handle the rest.
    const finalizationPromise = Promise.allSettled([primaryPromise, webcamPromise]).then(() => {
      setStatus('completed')
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
