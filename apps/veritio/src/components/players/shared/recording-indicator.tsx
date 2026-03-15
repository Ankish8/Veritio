'use client'

import { Circle, Upload, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RecordingIndicatorProps {
  isRecording: boolean
  isPaused?: boolean
  isUploading?: boolean
  uploadProgress?: number
  error?: string | null
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  children?: React.ReactNode
}

export function RecordingIndicator({
  isRecording,
  isPaused = false,
  isUploading = false,
  uploadProgress = 0,
  error = null,
  position = 'top-right',
  children,
}: RecordingIndicatorProps) {
  // Don't show if not recording and not uploading
  if (!isRecording && !isUploading && !error) {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all',
        positionClasses[position],
        error
          ? 'bg-destructive/90 text-destructive-foreground'
          : isUploading
            ? 'bg-card/90 border border-border'
            : isPaused
              ? 'bg-amber-500/90 text-white'
              : 'bg-card/90 border border-border'
      )}
      role="status"
      aria-live="polite"
    >
      {error ? (
        <>
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Recording Error</span>
        </>
      ) : isUploading ? (
        <>
          <Upload className="h-4 w-4 shrink-0 animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Uploading...</span>
            <span className="text-xs" style={{ color: 'var(--style-text-secondary)' }}>{uploadProgress}%</span>
          </div>
          {/* Progress bar */}
          <div
            className="w-16 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--brand-muted)' }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand)' }}
            />
          </div>
        </>
      ) : isPaused ? (
        <>
          <Circle className="h-3 w-3 fill-current shrink-0" />
          <span className="text-sm font-medium">Recording Paused</span>
        </>
      ) : (
        <>
          {/* Pulsing red dot */}
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </div>
          <span className="text-sm font-medium text-foreground">Recording</span>
          {/* Optional children (e.g., AudioLevelIndicator) */}
          {children}
        </>
      )}
    </div>
  )
}
