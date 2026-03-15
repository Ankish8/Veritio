'use client'

/**
 * ClipPreviewDialog Component
 *
 * A dialog that shows a preview of the clip before saving.
 * Also generates a thumbnail from the video at the clip's start time.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, Camera, RefreshCw, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn, formatDuration } from '@/lib/utils'

export interface ClipPreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** Video URL to preview */
  videoUrl: string
  /** Clip start time in ms */
  startMs: number
  /** Clip end time in ms */
  endMs: number
  /** Clip title */
  title: string
  /** Callback when clip is confirmed with optional thumbnail */
  onConfirm: (thumbnailDataUrl?: string) => void
  /** Callback when clip is cancelled */
  onCancel: () => void
  /** Whether saving is in progress */
  isSaving?: boolean
}

/**
 * Preview a clip and optionally generate a thumbnail before saving.
 *
 * Uses HTML5 video element and Canvas API for thumbnail generation.
 * The thumbnail is captured at the clip's start time.
 */
export function ClipPreviewDialog({
  open,
  onOpenChange,
  videoUrl,
  startMs,
  endMs,
  title,
  onConfirm,
  onCancel,
  isSaving = false,
}: ClipPreviewDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Duration of the clip
  const durationMs = endMs - startMs

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setThumbnailUrl(null)
      setVideoLoaded(false)
      setError(null)
    }
  }, [open])

  // Seek video to start time when loaded
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startMs / 1000
      setVideoLoaded(true)
    }
  }, [startMs])

  // Capture thumbnail from video
  const captureThumbnail = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !videoLoaded) {
      setError('Video not ready for thumbnail capture')
      return
    }

    setIsCapturing(true)
    setError(null)

    try {
      // Seek to clip start time
      video.currentTime = startMs / 1000

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

      // Set canvas size (16:9 aspect ratio, max 320px width)
      const aspectRatio = video.videoWidth / video.videoHeight
      const maxWidth = 320
      const width = Math.min(video.videoWidth, maxWidth)
      const height = width / aspectRatio

      canvas.width = width
      canvas.height = height

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.drawImage(video, 0, 0, width, height)

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setThumbnailUrl(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture thumbnail')
    } finally {
      setIsCapturing(false)
    }
  }, [videoLoaded, startMs])

  // Auto-capture thumbnail when video is loaded
  useEffect(() => {
    if (videoLoaded && !thumbnailUrl && !isCapturing) {
      // Small delay to ensure video is ready
      const timer = setTimeout(captureThumbnail, 100)
      return () => clearTimeout(timer)
    }
  }, [videoLoaded, thumbnailUrl, isCapturing, captureThumbnail])

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onConfirm(thumbnailUrl || undefined)
  }, [onConfirm, thumbnailUrl])

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  // Loop video within clip range
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoLoaded) return

    const handleTimeUpdate = () => {
      if (video.currentTime * 1000 >= endMs) {
        video.currentTime = startMs / 1000
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [videoLoaded, startMs, endMs])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview Clip</DialogTitle>
          <DialogDescription>
            Preview your clip before saving. A thumbnail will be automatically generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Clip info */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate">{title}</span>
            <span className="text-muted-foreground">
              {formatDuration(startMs)} - {formatDuration(endMs)} ({formatDuration(durationMs)})
            </span>
          </div>

          {/* Video preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onLoadedData={handleVideoLoaded}
              muted
              playsInline
              controls
            />
            {!videoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Thumbnail section */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <p className="text-sm font-medium mb-2">Thumbnail</p>
              <div
                className={cn(
                  'w-32 h-18 rounded-md border overflow-hidden bg-muted',
                  'flex items-center justify-center'
                )}
                style={{ aspectRatio: '16/9' }}
              >
                {thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumbnailUrl}
                    alt="Clip thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : isCapturing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                {thumbnailUrl
                  ? 'Thumbnail captured from clip start'
                  : isCapturing
                  ? 'Capturing thumbnail...'
                  : 'Thumbnail will be captured automatically'}
              </p>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {thumbnailUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={captureThumbnail}
                  disabled={isCapturing || !videoLoaded}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Recapture
                </Button>
              )}
            </div>
          </div>

          {/* Hidden canvas for thumbnail generation */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving || !videoLoaded}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save Clip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
