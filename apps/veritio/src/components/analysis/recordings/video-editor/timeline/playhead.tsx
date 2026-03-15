'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { formatDuration } from '@/lib/utils'

export interface PlayheadProps {
  currentTime: number
  duration: number
  pixelsPerMs: number
  onSeek: (time: number) => void
}

/**
 * Playhead component - vertical line showing current position.
 * Features:
 * - Red vertical line spanning all tracks
 * - Draggable head for seeking
 * - Time tooltip while dragging
 */
export function Playhead({
  currentTime,
  duration,
  pixelsPerMs,
  onSeek,
}: PlayheadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(currentTime)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate position (accounting for track label width of 80px)
  // Guard against invalid values that could produce Infinity or NaN
  const rawPosition = (isDragging ? dragTime : currentTime) * pixelsPerMs + 80
  const position = Number.isFinite(rawPosition) ? rawPosition : 80

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragTime(currentTime)
  }, [currentTime])

  // Handle drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      // Get the timeline tracks container
      const timeline = document.querySelector('.overflow-x-auto')
      if (!timeline) return

      const rect = timeline.getBoundingClientRect()
      const scrollLeft = timeline.scrollLeft

      // Calculate time from mouse position
      const x = e.clientX - rect.left + scrollLeft - 80 // Subtract track label width
      const time = Math.max(0, Math.min(x / pixelsPerMs, duration))
      setDragTime(time)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onSeek(dragTime)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragTime, pixelsPerMs, duration, onSeek])

  return (
    <div
      ref={containerRef}
      className="absolute top-0 bottom-0 pointer-events-none z-20"
      style={{ left: position }}
    >
      {/* Playhead line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 -translate-x-1/2" />

      {/* Draggable head */}
      <div
        className="absolute -top-1 -translate-x-1/2 pointer-events-auto cursor-ew-resize"
        onMouseDown={handleMouseDown}
      >
        {/* Triangle head */}
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500" />

        {/* Time tooltip (visible during drag) */}
        {isDragging && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
            {formatDuration(dragTime)}
          </div>
        )}
      </div>
    </div>
  )
}
