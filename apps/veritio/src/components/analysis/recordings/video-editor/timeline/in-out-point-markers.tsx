'use client'

import { useMemo } from 'react'
import { formatDuration } from '@/lib/utils'
import type { ClipCreationState } from '@/stores/video-editor-store'

export interface InOutPointMarkersProps {
  clipCreation: ClipCreationState
  pixelsPerMs: number
  duration: number
}

/**
 * Visual markers showing in-point (I) and out-point (O) positions on timeline.
 *
 * Features:
 * - Vertical lines at in/out positions with labels
 * - Selection range overlay between the points
 * - Drag handles for adjusting points (future enhancement)
 */
export function InOutPointMarkers({
  clipCreation,
  pixelsPerMs,
  duration: _duration,
}: InOutPointMarkersProps) {
  const { inPoint, outPoint } = clipCreation

  // Calculate marker positions
  const inPosition = inPoint !== null ? inPoint * pixelsPerMs : null
  const outPosition = outPoint !== null ? outPoint * pixelsPerMs : null

  // Calculate selection range
  const selectionRange = useMemo(() => {
    if (inPoint === null || outPoint === null) return null

    const startMs = Math.min(inPoint, outPoint)
    const endMs = Math.max(inPoint, outPoint)

    return {
      left: startMs * pixelsPerMs,
      width: (endMs - startMs) * pixelsPerMs,
      duration: endMs - startMs,
    }
  }, [inPoint, outPoint, pixelsPerMs])

  if (inPoint === null && outPoint === null) {
    return null
  }

  return (
    <>
      {/* Selection range overlay */}
      {selectionRange && (
        <div
          className="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-r-2 border-primary pointer-events-none z-10"
          style={{
            left: selectionRange.left,
            width: Math.max(selectionRange.width, 2),
          }}
        >
          {/* Duration label in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-primary text-primary-foreground text-[12px] px-1.5 py-0.5 rounded font-medium shadow-sm">
              {formatDuration(selectionRange.duration)}
            </span>
          </div>
        </div>
      )}

      {/* In-point marker */}
      {inPosition !== null && (
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: inPosition }}
        >
          {/* Marker line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-green-500" />

          {/* Label at top */}
          <div className="absolute -top-5 -translate-x-1/2 flex flex-col items-center">
            <span className="bg-green-500 text-white text-[12px] px-1.5 py-0.5 rounded font-semibold shadow-sm">
              I
            </span>
          </div>

          {/* Handle for dragging (visual only for now) */}
          <div className="absolute top-0 -translate-x-1/2 w-3 h-3">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-500" />
          </div>
        </div>
      )}

      {/* Out-point marker */}
      {outPosition !== null && (
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: outPosition }}
        >
          {/* Marker line */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" />

          {/* Label at top */}
          <div className="absolute -top-5 -translate-x-1/2 flex flex-col items-center">
            <span className="bg-red-500 text-white text-[12px] px-1.5 py-0.5 rounded font-semibold shadow-sm">
              O
            </span>
          </div>

          {/* Handle for dragging (visual only for now) */}
          <div className="absolute top-0 -translate-x-1/2 w-3 h-3">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
          </div>
        </div>
      )}
    </>
  )
}
