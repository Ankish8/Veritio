'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface Clip {
  id: string
  recording_id: string
  start_ms: number
  end_ms: number
  title: string
  description: string | null
  tags: string[]
  thumbnail_url: string | null
  created_by: string
  created_at: string
}

// Tag to color mapping
const TAG_COLORS: Record<string, string> = {
  'Key Insight': 'bg-blue-500/60 border-blue-400',
  'Usability Issue': 'bg-orange-500/60 border-orange-400',
  'Pain Point': 'bg-red-500/60 border-red-400',
  'Success Moment': 'bg-green-500/60 border-green-400',
  'Confusion': 'bg-yellow-500/60 border-yellow-400',
  'Feature Request': 'bg-purple-500/60 border-purple-400',
  'Quote': 'bg-pink-500/60 border-pink-400',
}

const DEFAULT_CLIP_COLOR = 'bg-blue-500/50 border-blue-400'

export interface DraggableClipSegmentProps {
  clip: Clip
  pixelsPerMs: number
  duration: number
  isSelected: boolean
  snapEnabled: boolean
  snapPoints: number[] // Array of times (in ms) to snap to
  onSelect: () => void
  onSeek: (timeMs: number) => void
  onTrim: (clipId: string, startMs: number, endMs: number) => void
}

type DragType = 'left' | 'right' | null

/**
 * Draggable clip segment with edge trimming.
 *
 * Features:
 * - Drag left edge to adjust start time
 * - Drag right edge to adjust end time
 * - Snap to playhead, other clips, and markers
 * - Visual feedback during drag
 */
export function DraggableClipSegment({
  clip,
  pixelsPerMs,
  duration,
  isSelected,
  snapEnabled,
  snapPoints,
  onSelect,
  onSeek,
  onTrim,
}: DraggableClipSegmentProps) {
  const [dragType, setDragType] = useState<DragType>(null)
  const [tempStart, setTempStart] = useState<number | null>(null)
  const [tempEnd, setTempEnd] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const originalValuesRef = useRef({ start: 0, end: 0 })

  // Get the effective start and end (use temp values if dragging)
  const effectiveStart = tempStart ?? clip.start_ms
  const effectiveEnd = tempEnd ?? clip.end_ms

  // Calculate position and width
  const left = effectiveStart * pixelsPerMs
  const width = Math.max((effectiveEnd - effectiveStart) * pixelsPerMs, 20)

  // Get color for the clip based on its first tag
  const colorClass = clip.tags?.length > 0
    ? TAG_COLORS[clip.tags[0]] || DEFAULT_CLIP_COLOR
    : DEFAULT_CLIP_COLOR

  // Find closest snap point within threshold
  const findSnapPoint = useCallback((timeMs: number, threshold = 50): number | null => {
    if (!snapEnabled || snapPoints.length === 0) return null

    const thresholdMs = threshold / pixelsPerMs

    let closestPoint: number | null = null
    let closestDistance = Infinity

    for (const point of snapPoints) {
      const distance = Math.abs(point - timeMs)
      if (distance < thresholdMs && distance < closestDistance) {
        closestDistance = distance
        closestPoint = point
      }
    }

    return closestPoint
  }, [snapEnabled, snapPoints, pixelsPerMs])

  // Handle mouse down on handles
  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragType) => {
    e.stopPropagation()
    e.preventDefault()

    setDragType(type)
    startXRef.current = e.clientX
    originalValuesRef.current = { start: clip.start_ms, end: clip.end_ms }
  }, [clip.start_ms, clip.end_ms])

  // Handle mouse move during drag
  useEffect(() => {
    if (!dragType) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current
      const deltaMs = deltaX / pixelsPerMs

      if (dragType === 'left') {
        // Dragging left edge - adjust start time
        let newStart = Math.max(0, originalValuesRef.current.start + deltaMs)

        // Can't drag past the end (leave at least 100ms)
        newStart = Math.min(newStart, originalValuesRef.current.end - 100)

        // Try to snap
        const snapPoint = findSnapPoint(newStart)
        if (snapPoint !== null) {
          newStart = snapPoint
        }

        setTempStart(Math.round(newStart))
      } else if (dragType === 'right') {
        // Dragging right edge - adjust end time
        let newEnd = Math.min(duration, originalValuesRef.current.end + deltaMs)

        // Can't drag past the start (leave at least 100ms)
        newEnd = Math.max(newEnd, originalValuesRef.current.start + 100)

        // Try to snap
        const snapPoint = findSnapPoint(newEnd)
        if (snapPoint !== null) {
          newEnd = snapPoint
        }

        setTempEnd(Math.round(newEnd))
      }
    }

    const handleMouseUp = () => {
      if (tempStart !== null || tempEnd !== null) {
        // Commit the trim
        onTrim(
          clip.id,
          tempStart ?? clip.start_ms,
          tempEnd ?? clip.end_ms
        )
      }

      // Reset state
      setDragType(null)
      setTempStart(null)
      setTempEnd(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragType, pixelsPerMs, duration, clip.id, clip.start_ms, clip.end_ms, tempStart, tempEnd, onTrim, findSnapPoint])

  // Handle click on the clip (select and seek)
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    onSeek(clip.start_ms)
  }, [onSelect, onSeek, clip.start_ms])

  const isDragging = dragType !== null

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute top-2 bottom-2 rounded-md border-2 cursor-pointer transition-all',
        'hover:brightness-110 active:brightness-90',
        colorClass,
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        isDragging && 'brightness-125 z-20'
      )}
      style={{
        left,
        width,
      }}
      onClick={handleClick}
      title={clip.title}
    >
      {/* Left trim handle */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10',
          'hover:bg-white/30 active:bg-white/50 transition-colors',
          dragType === 'left' && 'bg-white/50'
        )}
        onMouseDown={(e) => handleMouseDown(e, 'left')}
      >
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-white/50 rounded-full" />
      </div>

      {/* Clip content */}
      <div className="absolute inset-x-3 inset-y-0 overflow-hidden">
        {width > 60 && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-xs text-white font-medium truncate pointer-events-none">
            {clip.title}
          </span>
        )}
      </div>

      {/* Right trim handle */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10',
          'hover:bg-white/30 active:bg-white/50 transition-colors',
          dragType === 'right' && 'bg-white/50'
        )}
        onMouseDown={(e) => handleMouseDown(e, 'right')}
      >
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-0.5 bg-white/50 rounded-full" />
      </div>

      {/* Drag feedback tooltip */}
      {isDragging && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-0.5 rounded text-xs shadow-md whitespace-nowrap z-30">
          {dragType === 'left' && `Start: ${formatTime(effectiveStart)}`}
          {dragType === 'right' && `End: ${formatTime(effectiveEnd)}`}
        </div>
      )}
    </div>
  )
}

// Helper to format time
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const milliseconds = Math.floor((ms % 1000) / 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
}
