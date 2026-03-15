'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn, formatDuration } from '@/lib/utils'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { toast } from '@/components/ui/sonner'

export interface TimelineSelectionLayerProps {
  duration: number
  pixelsPerMs: number
  height: number
  offsetLeft: number // To account for the track label width
}

/**
 * Invisible layer that captures drag events for creating clip selections.
 *
 * Features:
 * - Drag to select a time range (sets in/out points)
 * - Shows selection preview while dragging
 * - Updates the video editor store on drag end
 */
export function TimelineSelectionLayer({
  duration,
  pixelsPerMs,
  height,
  offsetLeft,
}: TimelineSelectionLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  // Store actions
  const setInPoint = useVideoEditorStore((s) => s.setInPoint)
  const setOutPoint = useVideoEditorStore((s) => s.setOutPoint)
  const setIsCreatingClip = useVideoEditorStore((s) => s.setIsCreatingClip)

  // Convert mouse position to time
  const positionToTime = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return 0
      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left - offsetLeft
      const time = Math.max(0, Math.min((x / pixelsPerMs), duration))
      return time
    },
    [pixelsPerMs, duration, offsetLeft]
  )

  // Handle mouse down - start drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left click
      if (e.button !== 0) return

      // Don't interfere with clip segment interactions
      const target = e.target as HTMLElement
      if (target.closest('[data-clip-segment]')) return

      const time = positionToTime(e.clientX)
      setIsDragging(true)
      setDragStart(time)
      setDragEnd(time)
      setIsCreatingClip(true)
    },
    [positionToTime, setIsCreatingClip]
  )

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const time = positionToTime(e.clientX)
      setDragEnd(time)
    }

    const handleMouseUp = (_e: MouseEvent) => {
      if (dragStart !== null && dragEnd !== null) {
        const startMs = Math.min(dragStart, dragEnd)
        const endMs = Math.max(dragStart, dragEnd)

        // Only set points if selection is at least 100ms
        if (endMs - startMs >= 100) {
          setInPoint(startMs)
          setOutPoint(endMs)
          toast.success('Selection created', {
            description: `${formatDuration(startMs)} → ${formatDuration(endMs)} (${formatDuration(endMs - startMs)})`,
            duration: 2000,
          })
        } else {
          setIsCreatingClip(false)
        }
      }

      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart, dragEnd, positionToTime, setInPoint, setOutPoint, setIsCreatingClip])

  // Calculate selection preview bounds
  const selectionBounds =
    isDragging && dragStart !== null && dragEnd !== null
      ? {
          left: Math.min(dragStart, dragEnd) * pixelsPerMs + offsetLeft,
          width: Math.abs(dragEnd - dragStart) * pixelsPerMs,
        }
      : null

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 z-5',
        isDragging ? 'cursor-col-resize' : 'cursor-crosshair'
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Drag selection preview */}
      {selectionBounds && selectionBounds.width > 2 && (
        <div
          className="absolute top-0 bg-primary/30 border-l-2 border-r-2 border-primary pointer-events-none"
          style={{
            left: selectionBounds.left,
            width: Math.max(selectionBounds.width, 2),
            height,
          }}
        >
          {/* Time labels at edges */}
          {dragStart !== null && dragEnd !== null && (
            <>
              <div className="absolute -top-5 left-0 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-[12px] px-1.5 py-0.5 rounded font-medium shadow-sm">
                  {formatDuration(Math.min(dragStart, dragEnd))}
                </span>
              </div>
              <div className="absolute -top-5 right-0 translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-[12px] px-1.5 py-0.5 rounded font-medium shadow-sm">
                  {formatDuration(Math.max(dragStart, dragEnd))}
                </span>
              </div>
              {/* Duration in center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded font-medium shadow-sm">
                  {formatDuration(Math.abs(dragEnd - dragStart))}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
