'use client'

import { useMemo, useCallback } from 'react'
import { DraggableClipSegment } from './draggable-clip-segment'

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

export interface ClipTrackProps {
  clips: Clip[]
  duration: number
  pixelsPerMs: number
  selectedClipId: string | null
  snapEnabled: boolean
  currentTime: number
  commentTimes: number[]
  taskTimes: number[]
  onClipSelect: (id: string | null) => void
  onClipTrim: (clipId: string, startMs: number, endMs: number) => void
  onSeek: (time: number) => void
}

/**
 * Track showing clips as colored, draggable segments.
 * Features:
 * - Color-coded by first tag
 * - Click to select and seek
 * - Drag edges to trim start/end times
 * - Snapping to playhead, comments, tasks, and other clips
 */
export function ClipTrack({
  clips,
  duration,
  pixelsPerMs,
  selectedClipId,
  snapEnabled,
  currentTime,
  commentTimes,
  taskTimes,
  onClipSelect,
  onClipTrim,
  onSeek,
}: ClipTrackProps) {
  // Calculate snap points (playhead, comments, tasks, clip edges)
  const snapPoints = useMemo(() => {
    const points: number[] = [currentTime]

    // Add comment times
    points.push(...commentTimes)

    // Add task times
    points.push(...taskTimes)

    // Add clip edges
    clips.forEach((clip) => {
      points.push(clip.start_ms, clip.end_ms)
    })

    // Add start and end of recording
    points.push(0, duration)

    // Remove duplicates and sort
    return [...new Set(points)].sort((a, b) => a - b)
  }, [currentTime, commentTimes, taskTimes, clips, duration])

  // Sort clips by start time
  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => a.start_ms - b.start_ms)
  }, [clips])

  // Handle track background click (deselect)
  const handleTrackClick = useCallback(() => {
    onClipSelect(null)
  }, [onClipSelect])

  return (
    <div
      className="h-16 bg-muted/20 relative border-b"
      onClick={handleTrackClick}
    >
      {/* Track label */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-muted/50 border-r flex items-center px-2 z-10">
        <span className="text-xs text-muted-foreground font-medium">Clips</span>
      </div>

      {/* Clips container */}
      <div className="absolute left-20 right-0 top-0 bottom-0">
        {/* Draggable clip segments */}
        {sortedClips.map((clip) => (
          <DraggableClipSegment
            key={clip.id}
            clip={clip}
            pixelsPerMs={pixelsPerMs}
            duration={duration}
            isSelected={clip.id === selectedClipId}
            snapEnabled={snapEnabled}
            snapPoints={snapPoints}
            onSelect={() => onClipSelect(clip.id)}
            onSeek={onSeek}
            onTrim={onClipTrim}
          />
        ))}
      </div>
    </div>
  )
}
