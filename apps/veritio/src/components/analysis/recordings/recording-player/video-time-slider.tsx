'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useMediaState, useMediaRemote, type MediaPlayerInstance } from '@vidstack/react'
import { cn } from '@/lib/utils'
import type { TaskEvent } from '../task-timeline/task-timeline'

/** Clip marker data for rendering on timeline */
export interface ClipMarker {
  id: string
  startMs: number
  endMs: number
  title: string
}

/** Selection range for clip creation/editing */
export interface ClipSelectionRange {
  startMs: number
  endMs: number
}

export interface VideoTimeSliderProps {
  /** Task events to display as markers */
  taskEvents?: TaskEvent[]
  /** Duration in milliseconds (fallback if vidstack doesn't have it yet) */
  durationMs?: number
  /** Optional className */
  className?: string
  /** Existing clips to display as colored ranges on timeline */
  clips?: ClipMarker[]
  /** When in clip selection mode, shows selection handles */
  clipSelectionMode?: boolean
  /** Current clip selection range (when clipSelectionMode is true) */
  clipSelectionRange?: ClipSelectionRange
  /** Callback when clip selection range changes via drag handles */
  onClipSelectionChange?: (range: ClipSelectionRange) => void
  /** Callback when a clip marker is clicked */
  onClipMarkerClick?: (clip: ClipMarker) => void
  /** Optional player ref for direct seeking (more reliable than remote.seek) */
  playerRef?: React.RefObject<MediaPlayerInstance | null>
}

const OUTCOME_COLORS = {
  success: 'bg-green-500',
  failure: 'bg-red-500',
  skipped: 'bg-yellow-500',
  abandoned: 'bg-gray-400',
} as const

const OUTCOME_LABELS = {
  success: 'Completed',
  failure: 'Failed',
  skipped: 'Skipped',
  abandoned: 'Abandoned',
} as const

export function VideoTimeSlider({
  taskEvents = [],
  durationMs,
  className,
  clips = [],
  clipSelectionMode = false,
  clipSelectionRange,
  onClipSelectionChange,
  onClipMarkerClick,
  playerRef,
}: VideoTimeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const remote = useMediaRemote()

  // Helper to seek - tries player ref first, then remote
  const seekTo = useCallback((time: number) => {
    if (playerRef?.current) {
      playerRef.current.currentTime = time
    } else {
      remote.seek(time)
    }
  }, [playerRef, remote])

  // Get state from Vidstack
  const currentTime = useMediaState('currentTime')
  const mediaDuration = useMediaState('duration')
  const buffered = useMediaState('buffered')
  const seeking = useMediaState('seeking')

  const [isDragging, setIsDragging] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState(0)

  // Clip selection drag state
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null)
  const [, setHoveredClip] = useState<ClipMarker | null>(null)

  // Use media duration or fallback to prop
  // Check for finite positive number (handles NaN, Infinity from streaming sources)
  const duration = Number.isFinite(mediaDuration) && mediaDuration > 0
    ? mediaDuration
    : (durationMs && durationMs > 0 ? durationMs / 1000 : 0)

  // Refs for event handlers
  const durationRef = useRef(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  // Convert TimeRanges to array
  const bufferedRanges = useMemo(() => {
    if (!buffered) return []
    const ranges: { start: number; end: number }[] = []
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i),
      })
    }
    return ranges
  }, [buffered])

  // Calculate percentage from time
  const timeToPercent = useCallback(
    (time: number) => {
      if (!duration || duration <= 0) return 0
      return Math.min(100, Math.max(0, (time / duration) * 100))
    },
    [duration]
  )

  // Calculate time from mouse position
  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !durationRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return percent * durationRef.current
    },
    []
  )

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const position = ((e.clientX - rect.left) / rect.width) * 100
      setHoverPosition(Math.min(100, Math.max(0, position)))
      setHoverTime(getTimeFromPosition(e.clientX))
    },
    [getTimeFromPosition]
  )

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverTime(null)
    }
  }, [isDragging])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromPosition(e.clientX)
      seekTo(time)
    },
    [getTimeFromPosition, seekTo]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const time = getTimeFromPosition(e.clientX)
      seekTo(time)
    },
    [getTimeFromPosition, seekTo]
  )

  // Handle drag
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      if (!trackRef.current || !durationRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const time = percent * durationRef.current
      // Use player ref for direct seeking during drag
      if (playerRef?.current) {
        playerRef.current.currentTime = time
      } else {
        remote.seek(time)
      }
      setHoverTime(time)
      setHoverPosition(percent * 100)
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
  }, [isDragging, remote, playerRef])

  // Handle clip selection handle drag
  useEffect(() => {
    if (!draggingHandle || !clipSelectionRange || !onClipSelectionChange) return

    const handleMove = (e: MouseEvent) => {
      if (!trackRef.current || !durationRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const percent = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const timeMs = Math.round(percent * durationRef.current * 1000)

      if (draggingHandle === 'start') {
        // Ensure start doesn't exceed end - 1 second
        const newStart = Math.min(timeMs, clipSelectionRange.endMs - 1000)
        onClipSelectionChange({
          startMs: Math.max(0, newStart),
          endMs: clipSelectionRange.endMs,
        })
      } else {
        // Ensure end doesn't go below start + 1 second
        const maxMs = durationRef.current * 1000
        const newEnd = Math.max(timeMs, clipSelectionRange.startMs + 1000)
        onClipSelectionChange({
          startMs: clipSelectionRange.startMs,
          endMs: Math.min(maxMs, newEnd),
        })
      }
    }

    const handleUp = () => {
      setDraggingHandle(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [draggingHandle, clipSelectionRange, onClipSelectionChange])

  const progressPercent = timeToPercent(currentTime)

  // Convert ms to percent for clips
  const msToPercent = useCallback(
    (ms: number) => {
      if (!duration || duration <= 0) return 0
      return Math.min(100, Math.max(0, (ms / 1000 / duration) * 100))
    },
    [duration]
  )

  // Find hovered task marker for tooltip
  const hoveredTask = useMemo(() => {
    if (hoverTime === null || !taskEvents.length || !duration || duration <= 0) return null
    const threshold = duration * 0.02
    return taskEvents.find((event) => {
      const eventTime = event.timestamp_ms / 1000
      return Math.abs(eventTime - hoverTime) < threshold
    })
  }, [hoverTime, taskEvents, duration])

  // Find hovered clip for tooltip
  const detectedHoveredClip = useMemo(() => {
    if (hoverTime === null || !clips.length || !duration || duration <= 0) return null
    const hoverMs = hoverTime * 1000
    return clips.find((clip) => hoverMs >= clip.startMs && hoverMs <= clip.endMs)
  }, [hoverTime, clips, duration])

  // Handle clip click
  const handleClipClick = useCallback(
    (e: React.MouseEvent, clip: ClipMarker) => {
      e.stopPropagation()
      onClipMarkerClick?.(clip)
    },
    [onClipMarkerClick]
  )

  return (
    <div className={cn('relative group/slider', className)}>
      {/* Hover tooltip */}
      {hoverTime !== null && (
        <div
          className="absolute -top-10 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded pointer-events-none z-20 whitespace-nowrap"
          style={{ left: `${hoverPosition}%` }}
        >
          {hoveredTask ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-medium">{hoveredTask.task_title}</span>
              <span className="text-white/70">
                {OUTCOME_LABELS[hoveredTask.outcome]} • {formatTime(hoveredTask.timestamp_ms / 1000)}
              </span>
            </div>
          ) : detectedHoveredClip ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-medium">{detectedHoveredClip.title}</span>
              <span className="text-white/70">
                Clip • {formatTime(detectedHoveredClip.startMs / 1000)} - {formatTime(detectedHoveredClip.endMs / 1000)}
              </span>
            </div>
          ) : duration > 0 ? (
            formatTime(hoverTime)
          ) : (
            <span className="text-white/70">Duration unknown</span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          'relative h-1 bg-white/30 rounded-full cursor-pointer transition-all',
          'group-hover/slider:h-1.5',
          isDragging && 'h-1.5'
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Buffered ranges - YouTube-style light gray */}
        {bufferedRanges.map((range, index) => {
          const startPercent = timeToPercent(range.start)
          const endPercent = timeToPercent(range.end)
          const width = Math.max(0, endPercent - startPercent)
          return (
            <div
              key={index}
              className="absolute top-0 h-full bg-white/60 rounded-full"
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
              }}
            />
          )
        })}

        {/* Clip markers - colored ranges for existing clips */}
        {clips.map((clip) => {
          const startPercent = msToPercent(clip.startMs)
          const endPercent = msToPercent(clip.endMs)
          const width = Math.max(0.5, endPercent - startPercent)
          return (
            <div
              key={clip.id}
              className={cn(
                'absolute top-0 h-full bg-blue-500/40 cursor-pointer',
                'hover:bg-blue-500/60 transition-colors',
                'border-l-2 border-r-2 border-blue-500'
              )}
              style={{
                left: `${startPercent}%`,
                width: `${width}%`,
              }}
              onClick={(e) => handleClipClick(e, clip)}
              onMouseEnter={() => setHoveredClip(clip)}
              onMouseLeave={() => setHoveredClip(null)}
              title={clip.title}
            />
          )
        })}

        {/* Clip selection overlay - when creating/editing a clip */}
        {clipSelectionMode && clipSelectionRange && (
          <>
            {/* Selected range highlight */}
            <div
              className="absolute top-0 h-full bg-yellow-400/50 pointer-events-none"
              style={{
                left: `${msToPercent(clipSelectionRange.startMs)}%`,
                width: `${Math.max(0.5, msToPercent(clipSelectionRange.endMs) - msToPercent(clipSelectionRange.startMs))}%`,
              }}
            />
            {/* Start handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg cursor-ew-resize z-10',
                'hover:scale-125 transition-transform',
                draggingHandle === 'start' && 'scale-125'
              )}
              style={{ left: `${msToPercent(clipSelectionRange.startMs)}%` }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDraggingHandle('start')
              }}
            />
            {/* End handle */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg cursor-ew-resize z-10',
                'hover:scale-125 transition-transform',
                draggingHandle === 'end' && 'scale-125'
              )}
              style={{ left: `${msToPercent(clipSelectionRange.endMs)}%` }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDraggingHandle('end')
              }}
            />
          </>
        )}

        {/* Progress */}
        <div
          className={cn(
            'absolute top-0 h-full bg-red-600 rounded-full',
            seeking && 'opacity-80'
          )}
          style={{ width: `${progressPercent}%` }}
        />

        {/* Task markers */}
        {taskEvents.map((event, idx) => {
          const position = timeToPercent(event.timestamp_ms / 1000)
          return (
            <div
              key={`${event.task_id}-${idx}`}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
                'w-3 h-3 rounded-full border-2 border-white shadow-lg',
                'transition-transform hover:scale-125',
                OUTCOME_COLORS[event.outcome]
              )}
              style={{ left: `${position}%` }}
              title={`${event.task_title} - ${OUTCOME_LABELS[event.outcome]}`}
            />
          )
        })}

        {/* Hover line */}
        {hoverTime !== null && !isDragging && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white/60 pointer-events-none"
            style={{ left: `${hoverPosition}%` }}
          />
        )}

        {/* Thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-3 h-3 bg-red-600 rounded-full shadow-md transition-all',
            'opacity-0 group-hover/slider:opacity-100 scale-100',
            isDragging && 'opacity-100 scale-110'
          )}
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
