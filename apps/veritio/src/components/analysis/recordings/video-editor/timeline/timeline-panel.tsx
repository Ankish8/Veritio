'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TimelineToolbar } from './timeline-toolbar'
import { TimelineRuler } from './timeline-ruler'
import { ClipTrack } from './clip-track'
import { MarkersTrack } from './markers-track'
import { Playhead } from './playhead'
import { InOutPointMarkers } from './in-out-point-markers'
import { TimelineSelectionLayer } from './timeline-selection-layer'
import { CreateClipDialog } from '../create-clip-dialog'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import type { TaskEvent } from '../../task-timeline/task-timeline'

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

interface Comment {
  id: string
  recording_id: string
  timestamp_ms: number | null
  content: string
  author_id: string
  author_name: string | null
  author_email: string | null
  created_at: string
  updated_at: string
}

export interface TimelinePanelProps {
  clips: Clip[]
  comments: Comment[]
  taskEvents: TaskEvent[]
  duration: number
  onSeek: (time: number) => void
  onCreateClip: (data: { startMs: number; endMs: number; title: string; description?: string; tags?: string[] }) => Promise<unknown>
  onClipTrim?: (clipId: string, startMs: number, endMs: number) => Promise<unknown>
}

/**
 * Full-width timeline panel at the bottom of the video editor.
 *
 * Features:
 * - Timeline toolbar (zoom, snap, add clip)
 * - Time ruler with tick marks
 * - Clip track showing clips as colored segments
 * - Markers track for comments and tasks
 * - Playhead for current position
 */
export function TimelinePanel({
  clips,
  comments,
  taskEvents,
  duration,
  onSeek,
  onCreateClip,
  onClipTrim,
}: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tracksRef = useRef<HTMLDivElement>(null)

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [pendingClipRange, setPendingClipRange] = useState<{ startMs: number; endMs: number } | null>(null)

  // Store state
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const zoomLevel = useVideoEditorStore((s) => s.zoomLevel)
  const scrollPosition = useVideoEditorStore((s) => s.scrollPosition)
  const setScrollPosition = useVideoEditorStore((s) => s.setScrollPosition)
  const setTimelineWidth = useVideoEditorStore((s) => s.setTimelineWidth)
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId)
  const selectClip = useVideoEditorStore((s) => s.selectClip)
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)
  const snapEnabled = useVideoEditorStore((s) => s.snapEnabled)

  // Calculate timeline width based on zoom
  const basePixelsPerSecond = 100 // At zoom 1
  const pixelsPerMs = (basePixelsPerSecond * zoomLevel) / 1000
  const timelineWidth = Math.max(duration * pixelsPerMs, 800)

  // Update store with timeline width
  useEffect(() => {
    if (containerRef.current) {
      setTimelineWidth(containerRef.current.offsetWidth)
    }
  }, [setTimelineWidth])

  // Handle scroll sync
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollLeft)
  }, [setScrollPosition])

  // Handle click on timeline to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollPosition
    const clickedTime = x / pixelsPerMs
    onSeek(Math.max(0, Math.min(clickedTime, duration)))
  }, [scrollPosition, pixelsPerMs, duration, onSeek])

  // Handle opening the create clip dialog
  const handleOpenCreateDialog = useCallback(() => {
    if (clipCreation.inPoint !== null && clipCreation.outPoint !== null) {
      const startMs = Math.min(clipCreation.inPoint, clipCreation.outPoint)
      const endMs = Math.max(clipCreation.inPoint, clipCreation.outPoint)

      if (endMs - startMs >= 100) { // Minimum 100ms
        setPendingClipRange({ startMs, endMs })
        setIsCreateDialogOpen(true)
      }
    }
  }, [clipCreation])

  // Handle creating the clip (called from dialog)
  const handleCreateClip = useCallback(async (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
    tags?: string[]
  }) => {
    await onCreateClip(data)
    clearClipCreation()
    setPendingClipRange(null)
  }, [onCreateClip, clearClipCreation])

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      // Keep the in/out points so user can retry
      setPendingClipRange(null)
    }
  }, [])

  // Convert time to pixel position
  const _timeToPosition = useCallback((timeMs: number) => {
    return timeMs * pixelsPerMs
  }, [pixelsPerMs])

  // Filter comments with timestamps
  const timestampedComments = comments.filter(c => c.timestamp_ms !== null)

  // Extract comment times for snapping
  const commentTimes = useMemo(() => {
    return timestampedComments.map(c => c.timestamp_ms!)
  }, [timestampedComments])

  // Extract task times for snapping
  const taskTimes = useMemo(() => {
    return taskEvents.map(t => t.timestamp_ms)
  }, [taskEvents])

  // Handle clip trim
  const handleClipTrim = useCallback(async (clipId: string, startMs: number, endMs: number) => {
    if (onClipTrim) {
      await onClipTrim(clipId, startMs, endMs)
    }
  }, [onClipTrim])

  // Check if we have a valid selection
  const hasValidSelection = clipCreation.inPoint !== null && clipCreation.outPoint !== null

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Toolbar */}
      <TimelineToolbar
        onCreateClip={handleOpenCreateDialog}
        hasClipSelection={hasValidSelection}
        onClearSelection={clearClipCreation}
      />

      {/* Timeline tracks container */}
      <div
        ref={tracksRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onScroll={handleScroll}
      >
        <div
          className="relative min-h-full"
          style={{ width: timelineWidth }}
        >
          {/* Ruler */}
          <TimelineRuler
            duration={duration}
            pixelsPerMs={pixelsPerMs}
            onClick={handleTimelineClick}
          />

          {/* In/Out Point Markers - overlay on all tracks */}
          <InOutPointMarkers
            clipCreation={clipCreation}
            pixelsPerMs={pixelsPerMs}
            duration={duration}
          />

          {/* Clip track */}
          <div className="relative">
            <ClipTrack
              clips={clips}
              duration={duration}
              pixelsPerMs={pixelsPerMs}
              selectedClipId={selectedClipId}
              snapEnabled={snapEnabled}
              currentTime={currentTime}
              commentTimes={commentTimes}
              taskTimes={taskTimes}
              onClipSelect={selectClip}
              onClipTrim={handleClipTrim}
              onSeek={onSeek}
            />

            {/* Selection layer for drag-to-select */}
            <TimelineSelectionLayer
              duration={duration}
              pixelsPerMs={pixelsPerMs}
              height={64}
              offsetLeft={80}
            />
          </div>

          {/* Markers track */}
          <MarkersTrack
            comments={timestampedComments}
            taskEvents={taskEvents}
            duration={duration}
            pixelsPerMs={pixelsPerMs}
            onSeek={onSeek}
          />

          {/* Playhead */}
          <Playhead
            currentTime={currentTime}
            duration={duration}
            pixelsPerMs={pixelsPerMs}
            onSeek={onSeek}
          />
        </div>
      </div>

      {/* Create Clip Dialog */}
      {pendingClipRange && (
        <CreateClipDialog
          open={isCreateDialogOpen}
          onOpenChange={handleDialogClose}
          startMs={pendingClipRange.startMs}
          endMs={pendingClipRange.endMs}
          onCreateClip={handleCreateClip}
        />
      )}
    </div>
  )
}
