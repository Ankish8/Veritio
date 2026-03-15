'use client'

/**
 * useFFmpegClipExport Hook
 *
 * A hook that provides video clip extraction using ffmpeg.wasm.
 * Handles loading ffmpeg, extracting clip segments, and encoding to MP4/WebM.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// FFmpeg types (from @ffmpeg/ffmpeg)
interface FFmpegInstance {
  load: () => Promise<void>
  writeFile: (name: string, data: Uint8Array) => Promise<void>
  exec: (args: string[]) => Promise<number>
  readFile: (name: string) => Promise<Uint8Array>
  deleteFile: (name: string) => Promise<void>
  on: (event: string, callback: (data: { progress: number }) => void) => void
  terminate: () => void
}

export type ExportFormat = 'mp4' | 'webm'

export interface ClipExportOptions {
  /** Start time in milliseconds */
  startMs: number
  /** End time in milliseconds */
  endMs: number
  /** Output format */
  format: ExportFormat
  /** Video quality (crf: lower = better quality, higher file size) */
  quality?: 'high' | 'medium' | 'low'
  /** Include fade in/out transitions */
  fadeTransition?: boolean
  /** Fade duration in seconds */
  fadeDuration?: number
}

export interface ClipExportProgress {
  /** Current stage of processing */
  stage: 'loading' | 'downloading' | 'processing' | 'encoding' | 'complete' | 'error'
  /** Progress percentage (0-100) */
  percent: number
  /** Human-readable status message */
  message: string
}

export interface UseFFmpegClipExportReturn {
  /** Whether ffmpeg is loaded and ready */
  isReady: boolean
  /** Whether an export is in progress */
  isExporting: boolean
  /** Current export progress */
  progress: ClipExportProgress | null
  /** Any error that occurred */
  error: Error | null
  /** Load ffmpeg.wasm (call before first export) */
  loadFFmpeg: () => Promise<void>
  /** Export a clip from a video URL */
  exportClip: (videoUrl: string, options: ClipExportOptions) => Promise<Blob>
  /** Cancel the current export */
  cancelExport: () => void
  /** Clear any error */
  clearError: () => void
}

// Quality presets (CRF values)
const QUALITY_PRESETS = {
  high: { crf: 18, preset: 'slow' },
  medium: { crf: 23, preset: 'medium' },
  low: { crf: 28, preset: 'fast' },
} as const

/**
 * Hook for exporting video clips using ffmpeg.wasm.
 *
 * @example
 * ```tsx
 * const { loadFFmpeg, exportClip, isExporting, progress } = useFFmpegClipExport()
 *
 * const handleExport = async () => {
 *   await loadFFmpeg()
 *   const blob = await exportClip(videoUrl, {
 *     startMs: 5000,
 *     endMs: 35000,
 *     format: 'mp4',
 *     quality: 'medium',
 *     fadeTransition: true,
 *   })
 *   // Download the blob
 *   const url = URL.createObjectURL(blob)
 *   const a = document.createElement('a')
 *   a.href = url
 *   a.download = 'clip.mp4'
 *   a.click()
 * }
 * ```
 */
export function useFFmpegClipExport(): UseFFmpegClipExportReturn {
  const [isReady, setIsReady] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ClipExportProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const ffmpegRef = useRef<FFmpegInstance | null>(null)
  const abortRef = useRef(false)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (ffmpegRef.current) {
        try {
          ffmpegRef.current.terminate()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  // Load ffmpeg.wasm
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current || isReady) return

    setProgress({ stage: 'loading', percent: 0, message: 'Loading video processing library...' })
    setError(null)

    try {
      // Dynamic import to reduce initial bundle size
      const { FFmpeg } = await import('@ffmpeg/ffmpeg')
      const { toBlobURL } = await import('@ffmpeg/util')

      const ffmpeg = new FFmpeg()

      // Set up progress handler
      ffmpeg.on('progress', ({ progress: p }: { progress: number }) => {
        setProgress(prev => ({
          ...prev!,
          stage: 'encoding',
          percent: Math.round(p * 100),
          message: `Encoding: ${Math.round(p * 100)}%`,
        }))
      })

      setProgress({ stage: 'loading', percent: 25, message: 'Downloading ffmpeg core...' })

      // Load ffmpeg with multi-threaded core for better performance
      const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      })

      ffmpegRef.current = ffmpeg as unknown as FFmpegInstance
      setIsReady(true)
      setProgress(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load ffmpeg')
      setError(error)
      setProgress({ stage: 'error', percent: 0, message: error.message })
      throw error
    }
  }, [isReady])

  // Export a clip
  const exportClip = useCallback(
    async (videoUrl: string, options: ClipExportOptions): Promise<Blob> => {
      if (!ffmpegRef.current) {
        throw new Error('FFmpeg not loaded. Call loadFFmpeg() first.')
      }

      const ffmpeg = ffmpegRef.current
      abortRef.current = false

      setIsExporting(true)
      setError(null)

      const {
        startMs,
        endMs,
        format,
        quality = 'medium',
        fadeTransition = false,
        fadeDuration = 0.5,
      } = options

      const startSec = startMs / 1000
      const durationSec = (endMs - startMs) / 1000
      const qualitySettings = QUALITY_PRESETS[quality]

      const inputFile = 'input.mp4'
      const outputFile = `output.${format}`

      try {
        // Download the video
        setProgress({ stage: 'downloading', percent: 0, message: 'Downloading video...' })

        const response = await fetch(videoUrl)
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.status}`)
        }

        const totalSize = parseInt(response.headers.get('content-length') || '0', 10)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('Failed to read video stream')

        const chunks: Uint8Array[] = []
        let receivedSize = 0

        while (true) {
          if (abortRef.current) throw new Error('Export cancelled')

          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          receivedSize += value.length

          if (totalSize > 0) {
            setProgress({
              stage: 'downloading',
              percent: Math.round((receivedSize / totalSize) * 100),
              message: `Downloading: ${Math.round((receivedSize / totalSize) * 100)}%`,
            })
          }
        }

        // Combine chunks
        const videoData = new Uint8Array(receivedSize)
        let offset = 0
        for (const chunk of chunks) {
          videoData.set(chunk, offset)
          offset += chunk.length
        }

        // Write input file to ffmpeg
        setProgress({ stage: 'processing', percent: 0, message: 'Processing video...' })
        await ffmpeg.writeFile(inputFile, videoData)

        // Build ffmpeg command
        const ffmpegArgs = [
          '-ss', startSec.toString(),
          '-i', inputFile,
          '-t', durationSec.toString(),
        ]

        // Add codec options based on format
        if (format === 'mp4') {
          ffmpegArgs.push(
            '-c:v', 'libx264',
            '-preset', qualitySettings.preset,
            '-crf', qualitySettings.crf.toString(),
            '-c:a', 'aac',
            '-b:a', '128k',
          )
        } else {
          // WebM
          ffmpegArgs.push(
            '-c:v', 'libvpx-vp9',
            '-crf', qualitySettings.crf.toString(),
            '-b:v', '0',
            '-c:a', 'libopus',
            '-b:a', '128k',
          )
        }

        // Add fade transitions if enabled
        if (fadeTransition && fadeDuration > 0) {
          const fadeOutStart = durationSec - fadeDuration
          ffmpegArgs.push(
            '-vf', `fade=in:st=0:d=${fadeDuration},fade=out:st=${fadeOutStart}:d=${fadeDuration}`,
            '-af', `afade=in:st=0:d=${fadeDuration},afade=out:st=${fadeOutStart}:d=${fadeDuration}`,
          )
        }

        // Output settings
        ffmpegArgs.push(
          '-movflags', '+faststart', // Better streaming
          outputFile,
        )

        // Run ffmpeg
        setProgress({ stage: 'encoding', percent: 0, message: 'Encoding clip...' })
        const exitCode = await ffmpeg.exec(ffmpegArgs)

        if (exitCode !== 0) {
          throw new Error(`FFmpeg exited with code ${exitCode}`)
        }

        // Read output file
        const outputData = await ffmpeg.readFile(outputFile)

        // Clean up files
        await ffmpeg.deleteFile(inputFile)
        await ffmpeg.deleteFile(outputFile)

        // Create blob from output data
        const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm'
        // Copy the data to ensure we have a standard ArrayBuffer (not SharedArrayBuffer)
        const uint8Array = new Uint8Array(outputData as Uint8Array)
        const blob = new Blob([uint8Array], { type: mimeType })

        setProgress({ stage: 'complete', percent: 100, message: 'Export complete!' })

        return blob
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Export failed')
        setError(error)
        setProgress({ stage: 'error', percent: 0, message: error.message })
        throw error
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  // Cancel export
  const cancelExport = useCallback(() => {
    abortRef.current = true
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
    setProgress(null)
  }, [])

  return {
    isReady,
    isExporting,
    progress,
    error,
    loadFFmpeg,
    exportClip,
    cancelExport,
    clearError,
  }
}
