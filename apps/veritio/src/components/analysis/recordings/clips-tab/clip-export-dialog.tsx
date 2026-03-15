'use client'

/**
 * ClipExportDialog Component
 *
 * A dialog for exporting video clips using ffmpeg.wasm.
 * Supports MP4 and WebM formats with quality and transition options.
 */

import { useState, useCallback, useEffect } from 'react'
import { Download, Loader2, X, Check, AlertCircle, Film, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { formatDuration } from '@/lib/utils'
import { useFFmpegClipExport, type ExportFormat } from './use-ffmpeg-clip-export'
import type { Clip } from './clips-tab'

export interface ClipExportDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** The clip to export */
  clip: Clip | null
  /** Video URL for the recording */
  videoUrl: string
}

/**
 * Dialog for exporting clips to MP4 or WebM format.
 *
 * Uses ffmpeg.wasm for browser-based video processing.
 * Downloads the exported file directly to the user's device.
 *
 * @example
 * ```tsx
 * <ClipExportDialog
 *   open={exportDialogOpen}
 *   onOpenChange={setExportDialogOpen}
 *   clip={selectedClip}
 *   videoUrl={recording.playback_url}
 * />
 * ```
 */
export function ClipExportDialog({
  open,
  onOpenChange,
  clip,
  videoUrl,
}: ClipExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('mp4')
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium')
  const [fadeTransition, setFadeTransition] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const {
    isReady,
    isExporting,
    progress,
    error,
    loadFFmpeg,
    exportClip,
    cancelExport,
    clearError,
  } = useFFmpegClipExport()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasStarted(false)
      clearError()
    }
  }, [open, clearError])

  // Load ffmpeg when dialog opens (but don't block UI)
  useEffect(() => {
    if (open && !isReady) {
      loadFFmpeg().catch(() => {
        // Error will be shown in UI
      })
    }
  }, [open, isReady, loadFFmpeg])

  // Handle export
  const handleExport = useCallback(async () => {
    if (!clip || !videoUrl) return

    setHasStarted(true)

    try {
      // Ensure ffmpeg is loaded
      if (!isReady) {
        await loadFFmpeg()
      }

      // Export the clip
      const blob = await exportClip(videoUrl, {
        startMs: clip.start_ms,
        endMs: clip.end_ms,
        format,
        quality,
        fadeTransition,
        fadeDuration: 0.5,
      })

      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Close dialog after successful export
      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (_err) {
      // Error is handled by the hook
    }
  }, [clip, videoUrl, isReady, loadFFmpeg, exportClip, format, quality, fadeTransition, onOpenChange])

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (isExporting) {
      cancelExport()
    } else {
      onOpenChange(false)
    }
  }, [isExporting, cancelExport, onOpenChange])

  if (!clip) return null

  const clipDuration = clip.end_ms - clip.start_ms
  const isComplete = progress?.stage === 'complete'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Export Clip
          </DialogTitle>
          <DialogDescription>
            Export &ldquo;{clip.title}&rdquo; ({formatDuration(clipDuration)}) as a video file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export settings */}
          {!hasStarted && (
            <>
              {/* Format selection */}
              <div className="space-y-3">
                <Label>Format</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as ExportFormat)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mp4" id="format-mp4" />
                    <Label htmlFor="format-mp4" className="cursor-pointer">
                      MP4 <span className="text-muted-foreground text-xs">(recommended)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webm" id="format-webm" />
                    <Label htmlFor="format-webm" className="cursor-pointer">
                      WebM
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Quality selection */}
              <div className="space-y-3">
                <Label>Quality</Label>
                <RadioGroup
                  value={quality}
                  onValueChange={(v) => setQuality(v as 'high' | 'medium' | 'low')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="quality-high" />
                    <Label htmlFor="quality-high" className="cursor-pointer">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="quality-medium" />
                    <Label htmlFor="quality-medium" className="cursor-pointer">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="quality-low" />
                    <Label htmlFor="quality-low" className="cursor-pointer">Low</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Fade transition */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fade-switch">Fade transitions</Label>
                  <p className="text-xs text-muted-foreground">
                    Add 0.5s fade in/out at clip edges
                  </p>
                </div>
                <Switch
                  id="fade-switch"
                  checked={fadeTransition}
                  onCheckedChange={setFadeTransition}
                />
              </div>
            </>
          )}

          {/* Progress indicator */}
          {hasStarted && progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {progress.stage === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : isComplete ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{progress.message}</p>
                  {progress.stage !== 'loading' && progress.stage !== 'error' && (
                    <p className="text-xs text-muted-foreground">
                      {progress.stage === 'complete'
                        ? 'Your download should start automatically'
                        : 'This may take a moment for longer clips'}
                    </p>
                  )}
                </div>
              </div>

              {progress.stage !== 'error' && progress.stage !== 'complete' && (
                <Progress value={progress.percent} className="h-2" />
              )}

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error.message}</p>
                </div>
              )}
            </div>
          )}

          {/* FFmpeg loading notice */}
          {!isReady && !hasStarted && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
              <Settings2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">First-time setup</p>
                <p>The video processor will be downloaded when you start the export (~30MB).</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {isExporting ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </>
            ) : (
              'Close'
            )}
          </Button>
          {!isComplete && (
            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
