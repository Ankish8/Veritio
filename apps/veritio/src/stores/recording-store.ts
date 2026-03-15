import { create } from 'zustand'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'

export type RecordingStatus = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'uploading' | 'completed' | 'error'
export type PermissionStatus = 'pending' | 'granted' | 'denied'

export interface RecordingChunk {
  blob: Blob
  timestamp: number
  partNumber: number
}

interface RecordingState {
  // Recording session
  recordingId: string | null
  uploadId: string | null
  participantId: string | null
  studyId: string | null

  // Recording state
  status: RecordingStatus
  captureMode: RecordingCaptureMode | null
  hasConsented: boolean

  // Permission tracking
  permissionStatus: {
    microphone: PermissionStatus
    camera: PermissionStatus
    screen: PermissionStatus
  }

  // Recording metadata
  startTime: number | null
  pauseTime: number | null
  duration: number // Total recording duration in ms

  // Upload tracking
  chunks: RecordingChunk[]
  uploadedChunks: number
  totalChunks: number
  uploadProgress: number // 0-100
  uploadError: string | null

  // MediaRecorder instance (not persisted)
  mediaRecorder: MediaRecorder | null
  mediaStream: MediaStream | null

  // Actions
  setConsent: (consented: boolean) => void
  setPermissionStatus: (device: 'microphone' | 'camera' | 'screen', status: PermissionStatus) => void
  startRecording: (config: {
    recordingId: string
    uploadId: string
    participantId: string
    studyId: string
    captureMode: RecordingCaptureMode
    mediaRecorder: MediaRecorder
    mediaStream: MediaStream
  }) => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  addChunk: (chunk: RecordingChunk) => void
  markChunkUploaded: (partNumber: number) => void
  setUploadProgress: (progress: number) => void
  setUploadError: (error: string | null) => void
  setStatus: (status: RecordingStatus) => void
  reset: () => void
}

const initialState = {
  recordingId: null,
  uploadId: null,
  participantId: null,
  studyId: null,
  status: 'idle' as RecordingStatus,
  captureMode: null,
  hasConsented: false,
  permissionStatus: {
    microphone: 'pending' as PermissionStatus,
    camera: 'pending' as PermissionStatus,
    screen: 'pending' as PermissionStatus,
  },
  startTime: null,
  pauseTime: null,
  duration: 0,
  chunks: [],
  uploadedChunks: 0,
  totalChunks: 0,
  uploadProgress: 0,
  uploadError: null,
  mediaRecorder: null,
  mediaStream: null,
}

/**
 * Recording store for managing client-side recording state.
 *
 * Tracks:
 * - Recording session metadata (IDs, timestamps)
 * - Permission status for microphone/camera/screen
 * - Recording state (idle, recording, paused, uploading)
 * - Chunk upload progress
 * - MediaRecorder instance
 *
 * @example
 * ```tsx
 * const { status, hasConsented, setConsent, startRecording } = useRecordingStore()
 *
 * if (!hasConsented) {
 *   return <ConsentScreen onConsent={() => setConsent(true)} />
 * }
 * ```
 */
export const useRecordingStore = create<RecordingState>((set, get) => ({
  ...initialState,

  setConsent: (consented) => set({ hasConsented: consented }),

  setPermissionStatus: (device, status) =>
    set((state) => ({
      permissionStatus: {
        ...state.permissionStatus,
        [device]: status,
      },
    })),

  startRecording: (config) =>
    set({
      recordingId: config.recordingId,
      uploadId: config.uploadId,
      participantId: config.participantId,
      studyId: config.studyId,
      captureMode: config.captureMode,
      mediaRecorder: config.mediaRecorder,
      mediaStream: config.mediaStream,
      status: 'recording',
      startTime: Date.now(),
      pauseTime: null,
      duration: 0,
      chunks: [],
      uploadedChunks: 0,
      uploadProgress: 0,
      uploadError: null,
    }),

  pauseRecording: () => {
    const state = get()
    if (state.status !== 'recording') return

    set({
      status: 'paused',
      pauseTime: Date.now(),
    })
  },

  resumeRecording: () => {
    const state = get()
    if (state.status !== 'paused') return

    // Add paused duration to total duration
    const pauseDuration = state.pauseTime ? Date.now() - state.pauseTime : 0

    set({
      status: 'recording',
      pauseTime: null,
      duration: state.duration + pauseDuration,
    })
  },

  stopRecording: () => {
    const state = get()

    // Calculate final duration
    const endTime = Date.now()
    const totalDuration = state.startTime
      ? endTime - state.startTime - (state.pauseTime ? endTime - state.pauseTime : 0)
      : 0

    // Stop media tracks
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop())
    }

    set({
      status: 'uploading',
      duration: totalDuration,
      mediaRecorder: null,
      mediaStream: null,
    })
  },

  addChunk: (chunk) =>
    set((state) => ({
      chunks: [...state.chunks, chunk],
      totalChunks: state.totalChunks + 1,
    })),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  markChunkUploaded: (partNumber) =>
    set((state) => ({
      uploadedChunks: state.uploadedChunks + 1,
      uploadProgress: state.totalChunks > 0
        ? Math.round(((state.uploadedChunks + 1) / state.totalChunks) * 100)
        : 0,
    })),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setUploadError: (error) => set({ uploadError: error, status: error ? 'error' : get().status }),

  setStatus: (status) => set({ status }),

  reset: () => {
    const state = get()

    // Clean up media streams
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop())
    }

    set(initialState)
  },
}))
