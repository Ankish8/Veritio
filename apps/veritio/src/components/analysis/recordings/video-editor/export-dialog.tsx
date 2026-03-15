'use client'

/**
 * Export Dialog Component
 *
 * Dialog for exporting clips and annotated videos.
 * Supports various export options and formats.
 */

import { useState, useCallback } from 'react'
import { Download, Film, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recording ID for export */
  recordingId: string
  /** Clip ID if exporting a specific clip */
  clipId?: string
  /** Time range for export */
  timeRange?: { startMs: number; endMs: number }
  /** Whether recording has annotations */
  hasAnnotations: boolean
  /** Callback when export starts */
  onExport: (config: ExportConfig) => Promise<void>
}

export interface ExportConfig {
  format: 'mp4' | 'webm' | 'gif'
  quality: 'high' | 'medium' | 'low'
  includeAnnotations: boolean
  includeWebcam: boolean
  resolution: '1080p' | '720p' | '480p'
  timeRange?: { startMs: number; endMs: number }
}

type ExportStatus = 'idle' | 'preparing' | 'processing' | 'complete' | 'error'

export function ExportDialog({
  open,
  onOpenChange,
  recordingId: _recordingId,
  clipId,
  timeRange,
  hasAnnotations,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<'mp4' | 'webm' | 'gif'>('mp4')
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high')
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('720p')
  const [includeAnnotations, setIncludeAnnotations] = useState(hasAnnotations)
  const [includeWebcam, setIncludeWebcam] = useState(true)
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    setStatus('preparing')
    setProgress(0)
    setError(null)

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 500)

      setStatus('processing')

      await onExport({
        format,
        quality,
        resolution,
        includeAnnotations,
        includeWebcam,
        timeRange,
      })

      clearInterval(progressInterval)
      setProgress(100)
      setStatus('complete')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [format, quality, resolution, includeAnnotations, includeWebcam, timeRange, onExport])

  const handleClose = useCallback(() => {
    if (status === 'processing') return // Prevent closing during export
    setStatus('idle')
    setProgress(0)
    setError(null)
    onOpenChange(false)
  }, [status, onOpenChange])

  const isProcessing = status === 'preparing' || status === 'processing'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            {clipId ? 'Export this clip as a video file' : 'Export the recording or selection'}
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' && (
          <div className="space-y-6 py-4">
            {/* Format selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mp4" id="mp4" />
                    <Label htmlFor="mp4" className="font-normal cursor-pointer">
                      MP4
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="webm" id="webm" />
                    <Label htmlFor="webm" className="font-normal cursor-pointer">
                      WebM
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="gif" id="gif" />
                    <Label htmlFor="gif" className="font-normal cursor-pointer">
                      GIF
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Resolution selection */}
            <div className="space-y-2">
              <Label>Resolution</Label>
              <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)}>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1080p" id="1080p" />
                    <Label htmlFor="1080p" className="font-normal cursor-pointer">
                      1080p
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="720p" id="720p" />
                    <Label htmlFor="720p" className="font-normal cursor-pointer">
                      720p
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="480p" id="480p" />
                    <Label htmlFor="480p" className="font-normal cursor-pointer">
                      480p
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Quality selection */}
            <div className="space-y-2">
              <Label>Quality</Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="font-normal cursor-pointer">
                      High
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="font-normal cursor-pointer">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="font-normal cursor-pointer">
                      Low
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Options</Label>
              <div className="space-y-2">
                {hasAnnotations && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="annotations"
                      checked={includeAnnotations}
                      onCheckedChange={(checked) => setIncludeAnnotations(!!checked)}
                    />
                    <Label htmlFor="annotations" className="font-normal cursor-pointer">
                      Burn-in annotations
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="webcam"
                    checked={includeWebcam}
                    onCheckedChange={(checked) => setIncludeWebcam(!!checked)}
                  />
                  <Label htmlFor="webcam" className="font-normal cursor-pointer">
                    Include webcam overlay
                  </Label>
                </div>
              </div>
            </div>

            {/* Time range info */}
            {timeRange && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                Exporting: {formatTime(timeRange.startMs)} - {formatTime(timeRange.endMs)} (
                {formatDuration(timeRange.endMs - timeRange.startMs)})
              </div>
            )}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {status === 'preparing' ? 'Preparing export...' : 'Processing video...'}
              </p>
            </div>
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">{progress}% complete</p>
          </div>
        )}

        {/* Complete state */}
        {status === 'complete' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium">Export Complete!</p>
              <p className="text-sm text-muted-foreground text-center">
                Your video has been exported and is ready for download.
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="text-red-600 text-xl">!</span>
              </div>
              <p className="font-medium text-destructive">Export Failed</p>
              <p className="text-sm text-muted-foreground text-center">{error}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </>
          )}
          {status === 'complete' && (
            <Button onClick={handleClose}>Done</Button>
          )}
          {status === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleExport}>Try Again</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Format milliseconds as MM:SS */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/** Format duration as human-readable string */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}
