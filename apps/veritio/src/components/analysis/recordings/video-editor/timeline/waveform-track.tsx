'use client'

/**
 * Waveform Track Component
 *
 * Displays an audio waveform visualization using wavesurfer.js.
 * Syncs with video playback and supports click-to-seek.
 */

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { cn } from '@/lib/utils'

export interface WaveformTrackProps {
  /** Audio/video URL to visualize */
  audioUrl: string
  /** Width of the waveform container */
  width: number
  /** Height of the waveform */
  height?: number
  /** Pixels per millisecond for zoom sync */
  pixelsPerMs: number
  /** Current playback time in milliseconds */
  currentTimeMs: number
  /** Total duration in milliseconds */
  duration: number
  /** Waveform color */
  waveColor?: string
  /** Progress color */
  progressColor?: string
  /** Whether to show cursor */
  showCursor?: boolean
  /** Callback when user clicks to seek */
  onSeek?: (timeMs: number) => void
}

export function WaveformTrack({
  audioUrl,
  width,
  height = 48,
  pixelsPerMs,
  currentTimeMs,
  duration,
  waveColor = '#64748b',
  progressColor = '#3b82f6',
  showCursor = true,
  onSeek,
}: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    // Track if cleanup was called to suppress abort errors
    let isDestroyed = false

     
    setIsLoading(true)
     
    setError(null)

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: showCursor ? 1 : 0,
      cursorColor: '#ef4444',
      normalize: true,
      interact: !!onSeek,
      hideScrollbar: true,
      fillParent: false,
      minPxPerSec: pixelsPerMs * 1000,
    })

    wavesurferRef.current = wavesurfer

    // Load audio
    wavesurfer.load(audioUrl)

    wavesurfer.on('ready', () => {
      if (isDestroyed) return
      setIsReady(true)
      setIsLoading(false)
    })

    wavesurfer.on('error', (err) => {
      // Ignore abort errors from cleanup
      if (isDestroyed || err.name === 'AbortError') return
      setError(err.message || 'Failed to load audio')
      setIsLoading(false)
    })

    // Handle seek
    if (onSeek) {
      wavesurfer.on('interaction', () => {
        if (isDestroyed) return
        const time = wavesurfer.getCurrentTime() * 1000
        onSeek(time)
      })
    }

    return () => {
      isDestroyed = true
      try {
        wavesurfer.destroy()
      } catch {
        // Ignore errors during cleanup (e.g., AbortError)
      }
      wavesurferRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl])

  // Update zoom level
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return
    wavesurferRef.current.zoom(pixelsPerMs * 1000)
  }, [pixelsPerMs, isReady])

  // Sync playback position
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return

    const timeSeconds = currentTimeMs / 1000
    const currentPosition = wavesurferRef.current.getCurrentTime()

    // Only seek if difference is significant (> 100ms)
    if (Math.abs(currentPosition - timeSeconds) > 0.1) {
      wavesurferRef.current.seekTo(timeSeconds / (duration / 1000))
    }
  }, [currentTimeMs, duration, isReady])

  // Update colors
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return
    wavesurferRef.current.setOptions({ waveColor, progressColor })
  }, [waveColor, progressColor, isReady])

  return (
    <div
      className={cn(
        'relative bg-muted/30',
        isLoading && 'animate-pulse'
      )}
      style={{ height, width }}
    >
      {/* Waveform container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Loading waveform...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-destructive">{error}</div>
        </div>
      )}
    </div>
  )
}
