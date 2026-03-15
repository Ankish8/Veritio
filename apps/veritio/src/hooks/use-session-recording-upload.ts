'use client'

import { useCallback, useRef } from 'react'
import { useRecordingStore } from '@/stores/recording-store'

const TARGET_PART_SIZE = 10 * 1024 * 1024 // 10MB target - all parts must be same size except last (5MB minimum for R2/S3)

export interface UploadRefs {
  uploadQueueRef: React.MutableRefObject<Array<{ blob: Blob; partNumber: number }>>
  isUploadingRef: React.MutableRefObject<boolean>
  bufferRef: React.MutableRefObject<Blob[]>
  bufferSizeRef: React.MutableRefObject<number>
  partNumberRef: React.MutableRefObject<number>
}

export interface WebcamUploadRefs {
  webcamUploadQueueRef: React.MutableRefObject<Array<{ blob: Blob; partNumber: number }>>
  webcamIsUploadingRef: React.MutableRefObject<boolean>
  webcamBufferRef: React.MutableRefObject<Blob[]>
  webcamBufferSizeRef: React.MutableRefObject<number>
  webcamPartNumberRef: React.MutableRefObject<number>
}

interface UseSessionRecordingUploadOptions {
  sessionToken: string
  participantId: string
  onError?: (error: Error) => void
}

export function useSessionRecordingUpload(options: UseSessionRecordingUploadOptions) {
  const { sessionToken, participantId, onError } = options

  const {
    addChunk,
    markChunkUploaded,
    setUploadError,
  } = useRecordingStore()

  // Primary upload refs
  const uploadQueueRef = useRef<Array<{ blob: Blob; partNumber: number }>>([])
  const isUploadingRef = useRef(false)
  const bufferRef = useRef<Blob[]>([])
  const bufferSizeRef = useRef(0)
  const partNumberRef = useRef(1)

  // Webcam upload refs
  const webcamUploadQueueRef = useRef<Array<{ blob: Blob; partNumber: number }>>([])
  const webcamIsUploadingRef = useRef(false)
  const webcamBufferRef = useRef<Blob[]>([])
  const webcamBufferSizeRef = useRef(0)
  const webcamPartNumberRef = useRef(1)

  const isPreviewMode = sessionToken === 'preview-token' || participantId === 'preview-participant'

  const uploadChunk = useCallback(async (recordingId: string, blob: Blob, partNumber: number): Promise<void> => {
    if (isPreviewMode) {
      markChunkUploaded(partNumber)
      return
    }

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
      headers: {
        'Content-Type': 'video/webm',
      },
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload chunk')
    }

    const etag = uploadResponse.headers.get('ETag')

    if (!etag) {
      throw new Error('R2 did not return ETag header — check bucket CORS Access-Control-Expose-Headers')
    }

    const confirmResponse = await fetch(`/api/recordings/${recordingId}/confirm-chunk`, {
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

    if (!confirmResponse.ok) {
      const errorText = await confirmResponse.text().catch(() => 'Unknown error')
      throw new Error(`Failed to confirm chunk ${partNumber}: ${confirmResponse.status} ${errorText}`)
    }

    markChunkUploaded(partNumber)
  }, [sessionToken, isPreviewMode, markChunkUploaded])

  const processUploadQueue = useCallback(async (recordingId: string) => {
    if (isUploadingRef.current || uploadQueueRef.current.length === 0) return

    isUploadingRef.current = true

    while (uploadQueueRef.current.length > 0) {
      const chunk = uploadQueueRef.current[0]

      try {
        await uploadChunk(recordingId, chunk.blob, chunk.partNumber)
        uploadQueueRef.current.shift()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed')
        setUploadError(error.message)
        onError?.(error)
        break
      }
    }

    isUploadingRef.current = false
  }, [uploadChunk, setUploadError, onError])

  /** Flush buffer: combine buffered chunks and queue for upload. */
  const flushBuffer = useCallback((recordingId: string, force = false) => {
    if (bufferRef.current.length === 0) return
    if (!force && bufferSizeRef.current < TARGET_PART_SIZE) return

    const combinedBlob = new Blob(bufferRef.current, { type: 'video/webm' })
    const partNumber = partNumberRef.current++

    addChunk({
      blob: combinedBlob,
      timestamp: Date.now(),
      partNumber,
    })
    uploadQueueRef.current.push({ blob: combinedBlob, partNumber })

    bufferRef.current = []
    bufferSizeRef.current = 0
    processUploadQueue(recordingId)
  }, [addChunk, processUploadQueue])

  const processWebcamUploadQueue = useCallback(async (recordingId: string) => {
    if (webcamIsUploadingRef.current || webcamUploadQueueRef.current.length === 0) return

    webcamIsUploadingRef.current = true

    while (webcamUploadQueueRef.current.length > 0) {
      const chunk = webcamUploadQueueRef.current[0]

      try {
        await uploadChunk(recordingId, chunk.blob, chunk.partNumber)
        webcamUploadQueueRef.current.shift()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Webcam upload failed')
        setUploadError(error.message)
        onError?.(error)
        break
      }
    }

    webcamIsUploadingRef.current = false
  }, [uploadChunk, setUploadError, onError])

  const flushWebcamBuffer = useCallback((recordingId: string, force = false) => {
    if (webcamBufferRef.current.length === 0) return
    if (!force && webcamBufferSizeRef.current < TARGET_PART_SIZE) return

    const combinedBlob = new Blob(webcamBufferRef.current, { type: 'video/webm' })
    const partNumber = webcamPartNumberRef.current++

    webcamUploadQueueRef.current.push({ blob: combinedBlob, partNumber })

    webcamBufferRef.current = []
    webcamBufferSizeRef.current = 0

    processWebcamUploadQueue(recordingId)
  }, [processWebcamUploadQueue])

  /** Finalize a single recording in background (upload remaining chunks + call finalize API). */
  const finalizeRecordingInBackground = useCallback(async (
    recordingId: string,
    uploadQueue: Array<{ blob: Blob; partNumber: number }>,
    processQueue: (id: string) => Promise<void>,
    flushFn: (id: string, force: boolean) => void,
    label: string
  ) => {
    if (isPreviewMode) return

    try {
      flushFn(recordingId, true)

      const MAX_UPLOAD_WAIT_ITERATIONS = 300 // 30s (300 × 100ms) — give large recordings time to finish
      let uploadIterations = 0
      while (uploadQueue.length > 0 && uploadIterations < MAX_UPLOAD_WAIT_ITERATIONS) {
        await processQueue(recordingId)
        await new Promise(resolve => setTimeout(resolve, 100))
        uploadIterations++
      }

      const MAX_FINALIZE_RETRIES = 3
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= MAX_FINALIZE_RETRIES; attempt++) {
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

            // Non-recoverable errors - don't retry
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

          return
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(`Failed to finalize ${label}`)
          if (attempt < MAX_FINALIZE_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 250 * Math.pow(2, attempt)))
          }
        }
      }

      // All retries exhausted — cron job will catch stuck recordings
      if (lastError) {
        setUploadError(lastError.message)
        onError?.(lastError)
      }
    } catch {
      // Catch-all for unexpected errors — cron job handles stuck recordings
    }
  }, [sessionToken, isPreviewMode, setUploadError, onError])

  const resetUploadRefs = useCallback(() => {
    bufferRef.current = []
    bufferSizeRef.current = 0
    partNumberRef.current = 1
    webcamBufferRef.current = []
    webcamBufferSizeRef.current = 0
    webcamPartNumberRef.current = 1
  }, [])

  return {
    // Primary refs
    uploadQueueRef,
    bufferRef,
    bufferSizeRef,
    // Webcam refs
    webcamUploadQueueRef,
    webcamBufferRef,
    webcamBufferSizeRef,
    // Functions
    flushBuffer,
    flushWebcamBuffer,
    processUploadQueue,
    processWebcamUploadQueue,
    finalizeRecordingInBackground,
    resetUploadRefs,
  }
}
