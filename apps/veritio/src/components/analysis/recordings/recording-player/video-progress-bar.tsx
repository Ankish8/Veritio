'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BufferRange {
  start: number
  end: number
}

export interface VideoProgressBarProps {
  /** Current playback time in seconds */
  currentTime: number
  /** Total duration in seconds */
  duration: number
  /** Buffered time ranges */
  bufferedRanges: BufferRange[]
  /** Whether the video is currently seeking */
  isSeeking?: boolean
  /** Callback when user seeks to a new position */
  onSeek: (time: number) => void
  /** Optional className */
  className?: string
}

/**
 * YouTube-style video progress bar with buffer visualization.
 *
 * Features:
 * - Shows buffered portions in light gray
 * - Shows played portion in primary color
 * - Hover preview with time tooltip
 * - Drag to seek functionality
 * - Click to seek
 */
export function VideoProgressBar({
  currentTime,
  duration,
  bufferedRanges,
  isSeeking,
  onSeek,
  className,
}: VideoProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState(0)

  // Calculate percentage from time
  const timeToPercent = useCallback((time: number) => {
    if (!duration || duration <= 0) return 0
    return Math.min(100, Math.max(0, (time / duration) * 100))
  }, [duration])

  // Calculate time from mouse position
  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current || !duration) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return percent * duration
  }, [duration])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const position = ((e.clientX - rect.left) / rect.width) * 100
    setHoverPosition(Math.min(100, Math.max(0, position)))
    setHoverTime(getTimeFromPosition(e.clientX))
  }, [getTimeFromPosition])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverTime(null)
    }
  }, [isDragging])

  // Handle click to seek
  const handleClick = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromPosition(e.clientX)
    onSeek(time)
  }, [getTimeFromPosition, onSeek])

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const time = getTimeFromPosition(e.clientX)
    onSeek(time)
  }, [getTimeFromPosition, onSeek])

  // Handle drag move and end
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX)
      onSeek(time)
      setHoverTime(time)
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect()
        const position = ((e.clientX - rect.left) / rect.width) * 100
        setHoverPosition(Math.min(100, Math.max(0, position)))
      }
    }

    const handleUp = () => {
      setIsDragging(false)
      setHoverTime(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, getTimeFromPosition, onSeek])

  const progressPercent = timeToPercent(currentTime)

  return (
    <div className={cn('relative group', className)}>
      {/* Time tooltip on hover */}
      {hoverTime !== null && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap"
          style={{ left: `${hoverPosition}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Track container */}
      <div
        ref={trackRef}
        className={cn(
          'relative h-1.5 bg-muted rounded-full cursor-pointer transition-all',
          'group-hover:h-2.5',
          isDragging && 'h-2.5'
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Buffered ranges (light gray) */}
        {bufferedRanges.map((range, index) => (
          <div
            key={index}
            className="absolute top-0 h-full bg-muted-foreground/30 rounded-full"
            style={{
              left: `${timeToPercent(range.start)}%`,
              width: `${timeToPercent(range.end) - timeToPercent(range.start)}%`,
            }}
          />
        ))}

        {/* Progress (played portion) */}
        <div
          className={cn(
            'absolute top-0 h-full bg-primary rounded-full transition-all',
            isSeeking && 'opacity-70'
          )}
          style={{ width: `${progressPercent}%` }}
        />

        {/* Hover indicator line */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/50 pointer-events-none"
            style={{ left: `${hoverPosition}%` }}
          />
        )}

        {/* Thumb (draggable handle) */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-md transition-all',
            'opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100',
            isDragging && 'opacity-100 scale-110',
            isSeeking && 'animate-pulse'
          )}
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
