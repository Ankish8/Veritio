'use client'

/**
 * useThumbnailGenerator Hook
 *
 * A hook that provides video thumbnail generation capabilities.
 * Uses HTML5 video and canvas APIs to capture frames from a video URL.
 */

import { useState, useCallback, useRef } from 'react'

export interface ThumbnailOptions {
  /** Maximum width in pixels (default: 320) */
  maxWidth?: number
  /** JPEG quality from 0 to 1 (default: 0.8) */
  quality?: number
  /** Output format (default: 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface UseThumbnailGeneratorReturn {
  /** Generate a thumbnail from a video URL at a specific time */
  generateThumbnail: (
    videoUrl: string,
    timeMs: number,
    options?: ThumbnailOptions
  ) => Promise<string>
  /** Whether a thumbnail is currently being generated */
  isGenerating: boolean
  /** Any error that occurred during generation */
  error: Error | null
  /** Clear any stored error */
  clearError: () => void
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  maxWidth: 320,
  quality: 0.8,
  format: 'image/jpeg',
}

/**
 * Hook for generating video thumbnails.
 *
 * @example
 * ```tsx
 * const { generateThumbnail, isGenerating, error } = useThumbnailGenerator()
 *
 * const handleCapture = async () => {
 *   const dataUrl = await generateThumbnail(videoUrl, startMs)
 *   setThumbnail(dataUrl)
 * }
 * ```
 */
export function useThumbnailGenerator(): UseThumbnailGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Keep video element in ref to avoid recreating
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const generateThumbnail = useCallback(
    async (
      videoUrl: string,
      timeMs: number,
      options: ThumbnailOptions = {}
    ): Promise<string> => {
      const opts = { ...DEFAULT_OPTIONS, ...options }

      setIsGenerating(true)
      setError(null)

      try {
        // Create or reuse video element
        let video = videoRef.current
        if (!video) {
          video = document.createElement('video')
          video.crossOrigin = 'anonymous'
          video.muted = true
          video.playsInline = true
          videoRef.current = video
        }

        // Load video
        video.src = videoUrl

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            video!.removeEventListener('canplay', handleCanPlay)
            video!.removeEventListener('error', handleError)
            resolve()
          }
          const handleError = () => {
            video!.removeEventListener('canplay', handleCanPlay)
            video!.removeEventListener('error', handleError)
            reject(new Error('Failed to load video'))
          }

          video!.addEventListener('canplay', handleCanPlay)
          video!.addEventListener('error', handleError)
          video!.load()
        })

        // Seek to target time
        video.currentTime = timeMs / 1000

        // Wait for seek to complete
        await new Promise<void>((resolve, reject) => {
          const handleSeeked = () => {
            video!.removeEventListener('seeked', handleSeeked)
            video!.removeEventListener('error', handleError)
            resolve()
          }
          const handleError = () => {
            video!.removeEventListener('seeked', handleSeeked)
            video!.removeEventListener('error', handleError)
            reject(new Error('Failed to seek video'))
          }

          video!.addEventListener('seeked', handleSeeked)
          video!.addEventListener('error', handleError)
        })

        // Create canvas and capture frame
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error('Failed to get canvas context')
        }

        // Calculate dimensions
        const aspectRatio = video.videoWidth / video.videoHeight
        const width = Math.min(video.videoWidth, opts.maxWidth)
        const height = width / aspectRatio

        canvas.width = width
        canvas.height = height

        // Draw frame
        ctx.drawImage(video, 0, 0, width, height)

        // Convert to data URL
        const dataUrl = canvas.toDataURL(opts.format, opts.quality)

        return dataUrl
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate thumbnail')
        setError(error)
        throw error
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    generateThumbnail,
    isGenerating,
    error,
    clearError,
  }
}

/**
 * Generate a thumbnail from a video URL at a specific time.
 * Standalone function for one-off thumbnail generation.
 *
 * @example
 * ```ts
 * const thumbnail = await generateVideoThumbnail(videoUrl, 5000) // 5 seconds
 * ```
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  timeMs: number,
  options: ThumbnailOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.playsInline = true
  video.src = videoUrl

  // Wait for video to be ready
  await new Promise<void>((resolve, reject) => {
    const handleCanPlay = () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      resolve()
    }
    const handleError = () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      reject(new Error('Failed to load video'))
    }

    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.load()
  })

  // Seek to target time
  video.currentTime = timeMs / 1000

  // Wait for seek to complete
  await new Promise<void>((resolve, reject) => {
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
      resolve()
    }
    const handleError = () => {
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('error', handleError)
      reject(new Error('Failed to seek video'))
    }

    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('error', handleError)
  })

  // Create canvas and capture frame
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Calculate dimensions
  const aspectRatio = video.videoWidth / video.videoHeight
  const width = Math.min(video.videoWidth, opts.maxWidth)
  const height = width / aspectRatio

  canvas.width = width
  canvas.height = height

  // Draw frame
  ctx.drawImage(video, 0, 0, width, height)

  // Convert to data URL
  const dataUrl = canvas.toDataURL(opts.format, opts.quality)

  // Clean up
  video.src = ''
  video.remove()

  return dataUrl
}
