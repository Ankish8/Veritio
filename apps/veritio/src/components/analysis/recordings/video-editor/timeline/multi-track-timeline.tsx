'use client'

/**
 * Multi-Track Timeline Component
 *
 * Full-featured NLE-style timeline with multiple tracks:
 * - Screen recording track
 * - Webcam track
 * - Clips track
 * - Annotations track
 * - Markers track (comments, tasks)
 *
 * Features:
 * - Drag-and-drop clip editing
 * - Split, trim, move, copy operations
 * - Snapping to significant points
 * - Undo/redo support
 * - Keyboard shortcuts
 */

import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import { EnhancedToolbar } from './enhanced-toolbar'
import { TimelineRuler } from './timeline-ruler'
import { TrackRow } from './track-row'
import { Playhead } from './playhead'
import { InOutPointMarkers } from './in-out-point-markers'
import { CreateClipDialog } from '../create-clip-dialog'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { useTimelineStore } from '@/stores/timeline-store'
import { useToolStore } from '@/stores/tool-store'
import { useTimelineShortcuts, useTimelineEditing, useCommandEditing } from '../hooks'
import type { ClipItem, MarkerItem, MediaItem } from '@/lib/video-editor/tracks/track-types'
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

export interface MultiTrackTimelineProps {
  recordingId: string
  clips: Clip[]
  comments: Comment[]
  taskEvents: TaskEvent[]
  duration: number
  hasWebcam: boolean
  /** URL for the primary recording audio (for waveform display) */
  audioUrl?: string | null
  onSeek: (time: number) => void
  onCreateClip: (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
    tags?: string[]
  }) => Promise<unknown>
  onClipTrim?: (clipId: string, startMs: number, endMs: number) => Promise<unknown>
  onDeleteClip?: (clipId: string) => Promise<void>
}

/** Header width for track labels */
const HEADER_WIDTH = 80

export function MultiTrackTimeline({
  recordingId,
  clips,
  comments,
  taskEvents,
  duration,
  hasWebcam,
  audioUrl,
  onSeek,
  onCreateClip,
  onClipTrim,
  onDeleteClip: _onDeleteClip,
}: MultiTrackTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tracksRef = useRef<HTMLDivElement>(null)

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [pendingClipRange, setPendingClipRange] = useState<{
    startMs: number
    endMs: number
  } | null>(null)

  // Video editor store
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const zoomLevel = useVideoEditorStore((s) => s.zoomLevel)
  const setZoomLevel = useVideoEditorStore((s) => s.setZoomLevel)
  const scrollPosition = useVideoEditorStore((s) => s.scrollPosition)
  const setScrollPosition = useVideoEditorStore((s) => s.setScrollPosition)
  const setTimelineWidth = useVideoEditorStore((s) => s.setTimelineWidth)
  const snapEnabled = useVideoEditorStore((s) => s.snapEnabled)
  const toggleSnap = useVideoEditorStore((s) => s.toggleSnap)
  const zoomIn = useVideoEditorStore((s) => s.zoomIn)
  const zoomOut = useVideoEditorStore((s) => s.zoomOut)
  const fitToView = useVideoEditorStore((s) => s.fitToView)
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)

  // Timeline store
  const tracks = useTimelineStore((s) => s.tracks)
  const trackOrder = useTimelineStore((s) => s.trackOrder)
  const selectedItemIds = useTimelineStore((s) => s.selectedItemIds)
  const selectedTrackIds = useTimelineStore((s) => s.selectedTrackIds)
  const isInitialized = useTimelineStore((s) => s.isInitialized)
  const initializeTimeline = useTimelineStore((s) => s.initializeTimeline)
  const selectItem = useTimelineStore((s) => s.selectItem)
  const selectTrack = useTimelineStore((s) => s.selectTrack)
  const clearSelection = useTimelineStore((s) => s.clearSelection)
  const toggleTrackVisibility = useTimelineStore((s) => s.toggleTrackVisibility)
  const toggleTrackAudio = useTimelineStore((s) => s.toggleTrackAudio)
  const toggleTrackLock = useTimelineStore((s) => s.toggleTrackLock)
  const addItem = useTimelineStore((s) => s.addItem)
  const getTrackByType = useTimelineStore((s) => s.getTrackByType)

  // Tool store
  const activeTool = useToolStore((s) => s.activeTool)

  // Calculate timeline dimensions
  const basePixelsPerSecond = 100
  const pixelsPerMs = (basePixelsPerSecond * zoomLevel) / 1000
  const timelineWidth = Math.max(duration * pixelsPerMs, 800)

  // Timeline editing (trim/drag operations with undo/redo)
  const { handleTrimStart, handleDragStart } = useTimelineEditing({
    pixelsPerMs,
    duration,
    onClipTrim,
  })

  // Command-based editing (for split, delete, duplicate with undo/redo)
  const { splitItem: commandSplitItem, splitAtPlayhead, deleteSelected, duplicateSelected } = useCommandEditing()

  // Initialize timeline on mount
  useEffect(() => {
    if (!isInitialized && recordingId && duration > 0) {
      initializeTimeline(recordingId, duration, hasWebcam)
    }
  }, [recordingId, duration, hasWebcam, isInitialized, initializeTimeline])

  // Add source media items to screen and webcam tracks
  useEffect(() => {
    if (!isInitialized || duration <= 0) return

    // Add screen recording source
    const screenTrack = getTrackByType('screen')
    if (screenTrack && screenTrack.items.length === 0) {
      addItem(screenTrack.id, {
        type: 'media',
        mediaType: 'screen',
        label: 'Screen Recording',
        color: '#3b82f6',
        isPrimary: true,
        startMs: 0,
        endMs: duration,
        layer: 0,
      } as Omit<MediaItem, 'id' | 'trackId'>)
    }

    // Add webcam source if available
    if (hasWebcam) {
      const webcamTrack = getTrackByType('webcam')
      if (webcamTrack && webcamTrack.items.length === 0) {
        addItem(webcamTrack.id, {
          type: 'media',
          mediaType: 'webcam',
          label: 'Webcam',
          color: '#10b981',
          isPrimary: true,
          startMs: 0,
          endMs: duration,
          layer: 0,
        } as Omit<MediaItem, 'id' | 'trackId'>)
      }
    }
  }, [isInitialized, duration, hasWebcam, getTrackByType, addItem])

  // Sync clips from props to timeline store
  useEffect(() => {
    if (!isInitialized) return

    const clipsTrack = getTrackByType('clips')
    if (!clipsTrack) return

    // Add clips that don't exist in the store
    clips.forEach((clip) => {
      const existingItem = clipsTrack.items.find(
        (item) => (item as ClipItem).clipId === clip.id
      )

      if (!existingItem) {
        addItem(clipsTrack.id, {
          type: 'clip',
          clipId: clip.id,
          title: clip.title,
          tags: clip.tags,
          thumbnailUrl: clip.thumbnail_url,
          description: clip.description,
          startMs: clip.start_ms,
          endMs: clip.end_ms,
          layer: 0,
        } as Omit<ClipItem, 'id' | 'trackId'>)
      }
    })
  }, [clips, isInitialized, getTrackByType, addItem])

  // Sync comments and tasks to markers track
  useEffect(() => {
    if (!isInitialized) return

    const markersTrack = getTrackByType('markers')
    if (!markersTrack) return

    // Add comments as markers
    const timestampedComments = comments.filter((c) => c.timestamp_ms !== null)
    timestampedComments.forEach((comment) => {
      const existingItem = markersTrack.items.find(
        (item) =>
          (item as MarkerItem).markerType === 'comment' &&
          (item as MarkerItem).referenceId === comment.id
      )

      if (!existingItem) {
        addItem(markersTrack.id, {
          type: 'marker',
          markerType: 'comment',
          referenceId: comment.id,
          label: comment.content.slice(0, 50),
          startMs: comment.timestamp_ms!,
          endMs: comment.timestamp_ms! + 1000, // 1 second marker
          layer: 0,
          color: '#8b5cf6',
        } as Omit<MarkerItem, 'id' | 'trackId'>)
      }
    })

    // Add tasks as markers
    taskEvents.forEach((task) => {
      const existingItem = markersTrack.items.find(
        (item) =>
          (item as MarkerItem).markerType === 'task' &&
          (item as MarkerItem).referenceId === task.task_id
      )

      if (!existingItem) {
        addItem(markersTrack.id, {
          type: 'marker',
          markerType: 'task',
          referenceId: task.task_id,
          label: task.task_title,
          startMs: task.timestamp_ms,
          endMs: task.timestamp_ms + 1000, // 1 second marker
          layer: 0,
          color: task.outcome === 'success' ? '#10b981' : '#f59e0b',
        } as Omit<MarkerItem, 'id' | 'trackId'>)
      }
    })
  }, [comments, taskEvents, isInitialized, getTrackByType, addItem])

  // Update container width
  useEffect(() => {
    if (containerRef.current) {
      setTimelineWidth(containerRef.current.offsetWidth)
    }
  }, [setTimelineWidth])

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollPosition(e.currentTarget.scrollLeft)
    },
    [setScrollPosition]
  )

  // Handle ruler click to seek
  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + scrollPosition - HEADER_WIDTH
      const clickedTime = x / pixelsPerMs
      onSeek(Math.max(0, Math.min(clickedTime, duration)))
    },
    [scrollPosition, pixelsPerMs, duration, onSeek]
  )

  // Handle create clip dialog
  const handleOpenCreateDialog = useCallback(() => {
    if (clipCreation.inPoint !== null && clipCreation.outPoint !== null) {
      const startMs = Math.min(clipCreation.inPoint, clipCreation.outPoint)
      const endMs = Math.max(clipCreation.inPoint, clipCreation.outPoint)

      if (endMs - startMs >= 100) {
        setPendingClipRange({ startMs, endMs })
        setIsCreateDialogOpen(true)
      }
    }
  }, [clipCreation])

  // Handle create clip
  const handleCreateClip = useCallback(
    async (data: {
      startMs: number
      endMs: number
      title: string
      description?: string
      tags?: string[]
    }) => {
      await onCreateClip(data)
      clearClipCreation()
      setPendingClipRange(null)
    },
    [onCreateClip, clearClipCreation]
  )

  // Handle dialog close
  const handleDialogClose = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      setPendingClipRange(null)
    }
  }, [])

  // Handle delete selected items (with undo/redo)
  const handleDeleteSelected = useCallback(() => {
    deleteSelected()
  }, [deleteSelected])

  // Handle split at playhead (with undo/redo)
  const handleSplitAtPlayhead = useCallback(() => {
    splitAtPlayhead()
  }, [splitAtPlayhead])

  // Handle razor click to split an item at a specific time (with undo/redo)
  const handleRazorClick = useCallback(
    (itemId: string, timeMs: number) => {
      commandSplitItem(itemId, timeMs)
    },
    [commandSplitItem]
  )

  // Handle duplicate selected items (with undo/redo)
  const handleDuplicateSelected = useCallback(() => {
    duplicateSelected()
  }, [duplicateSelected])

  // Timeline keyboard shortcuts
  useTimelineShortcuts({
    enabled: true,
    onSplitAtPlayhead: handleSplitAtPlayhead,
    onDeleteSelected: handleDeleteSelected,
    onDuplicateSelected: handleDuplicateSelected,
  })

  // Check if we have a valid selection
  const hasValidSelection =
    clipCreation.inPoint !== null && clipCreation.outPoint !== null

  // Get ordered tracks
  const orderedTracks = useMemo(() => {
    return trackOrder.map((id) => tracks[id]).filter(Boolean)
  }, [trackOrder, tracks])

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Enhanced toolbar */}
      <EnhancedToolbar
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToView={fitToView}
        snapEnabled={snapEnabled}
        onToggleSnap={toggleSnap}
        hasSelection={hasValidSelection || selectedItemIds.size > 0}
        onCreateClip={handleOpenCreateDialog}
        onClearSelection={() => {
          clearClipCreation()
          clearSelection()
        }}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* Timeline content */}
      <div
        ref={tracksRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
        onScroll={handleScroll}
      >
        <div
          className="relative min-h-full"
          style={{ width: timelineWidth + HEADER_WIDTH }}
        >
          {/* Ruler */}
          <div className="sticky top-0 z-20 bg-background">
            <div className="flex">
              {/* Empty space for track headers */}
              <div
                className="flex-shrink-0 bg-muted/50"
                style={{ width: HEADER_WIDTH }}
              />
              {/* Ruler content */}
              <div className="flex-1" onClick={handleRulerClick}>
                <TimelineRuler
                  duration={duration}
                  pixelsPerMs={pixelsPerMs}
                />
              </div>
            </div>
          </div>

          {/* In/Out Point Markers */}
          <InOutPointMarkers
            clipCreation={clipCreation}
            pixelsPerMs={pixelsPerMs}
            duration={duration}
          />

          {/* Tracks */}
          <div className="relative">
            {orderedTracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                pixelsPerMs={pixelsPerMs}
                duration={duration}
                currentTime={currentTime}
                isSelected={selectedTrackIds.has(track.id)}
                selectedItemIds={selectedItemIds}
                activeTool={activeTool}
                audioUrl={track.type === 'screen' ? audioUrl : undefined}
                onSelectTrack={() => selectTrack(track.id)}
                onToggleVisibility={() => toggleTrackVisibility(track.id)}
                onToggleAudio={() => toggleTrackAudio(track.id)}
                onToggleLock={() => toggleTrackLock(track.id)}
                onSelectItem={(itemId, add) => selectItem(itemId, add)}
                onSeek={onSeek}
                onTrimStart={handleTrimStart}
                onDragStart={handleDragStart}
                onRazorClick={handleRazorClick}
              />
            ))}
          </div>

          {/* Playhead */}
          <div style={{ marginLeft: HEADER_WIDTH }}>
            <Playhead
              currentTime={currentTime}
              duration={duration}
              pixelsPerMs={pixelsPerMs}
              onSeek={onSeek}
            />
          </div>
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
