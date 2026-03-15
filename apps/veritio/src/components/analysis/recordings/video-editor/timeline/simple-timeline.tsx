'use client'

/**
 * Simple Timeline Component
 *
 * A minimal YouTube-style progress bar with:
 * - Scrubber for seeking
 * - Clip markers shown as colored segments
 * - Comment/task markers as dots
 * - In/out point selection for creating clips
 */

import { useRef, useCallback, useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { CreateClipDialog } from '../create-clip-dialog'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { TaskEvent } from '../../task-timeline/task-timeline'

interface Clip {
  id: string
  start_ms: number
  end_ms: number
  title: string
}

interface Comment {
  id: string
  timestamp_ms: number | null
  content: string
}

export interface SimpleTimelineProps {
  clips: Clip[]
  comments: Comment[]
  taskEvents: TaskEvent[]
  duration: number
  onSeek: (time: number) => void
  onCreateClip: (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
    tags?: string[]
  }) => Promise<unknown>
}

export function SimpleTimeline({
  clips,
  comments,
  taskEvents,
  duration,
  onSeek,
  onCreateClip,
}: SimpleTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Store state
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Get position from mouse event
  const getTimeFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!trackRef.current || duration <= 0) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      return (x / rect.width) * duration
    },
    [duration]
  )

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromEvent(e)
      onSeek(time)
    },
    [getTimeFromEvent, onSeek]
  )

  // Handle drag for seeking
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      const time = getTimeFromEvent(e)
      onSeek(time)
    },
    [getTimeFromEvent, onSeek]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromEvent(e)
      onSeek(time)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, getTimeFromEvent, onSeek])

  // Check if we have a valid clip selection
  const hasValidSelection =
    clipCreation.inPoint !== null &&
    clipCreation.outPoint !== null &&
    Math.abs(clipCreation.outPoint - clipCreation.inPoint) >= 100

  // Calculate selection range for display
  const selectionStart =
    clipCreation.inPoint !== null && clipCreation.outPoint !== null
      ? Math.min(clipCreation.inPoint, clipCreation.outPoint)
      : null
  const selectionEnd =
    clipCreation.inPoint !== null && clipCreation.outPoint !== null
      ? Math.max(clipCreation.inPoint, clipCreation.outPoint)
      : null

  // Handle create clip
  const handleOpenCreateDialog = useCallback(() => {
    if (hasValidSelection) {
      setIsCreateDialogOpen(true)
    }
  }, [hasValidSelection])

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
    },
    [onCreateClip, clearClipCreation]
  )

  // Filter comments with timestamps
  const timestampedComments = comments.filter((c) => c.timestamp_ms !== null)

  return (
    <div className="flex flex-col gap-2 p-3 bg-muted/30">
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          {hasValidSelection && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-muted-foreground">
                Selection: {formatDuration(selectionStart || 0)} - {formatDuration(selectionEnd || 0)}
              </span>
              <Button size="sm" variant="default" onClick={handleOpenCreateDialog}>
                <Plus className="h-3 w-3 mr-1" />
                Create Clip
              </Button>
              <Button size="sm" variant="ghost" onClick={clearClipCreation}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[12px]">I</kbd> for in-point,{' '}
          <kbd className="px-1 py-0.5 bg-muted rounded text-[12px]">O</kbd> for out-point
        </div>
      </div>

      {/* Progress bar */}
      <div
        ref={trackRef}
        className="relative h-8 bg-muted rounded cursor-pointer group"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Clips as colored segments */}
        {clips.map((clip) => {
          const left = (clip.start_ms / duration) * 100
          const width = ((clip.end_ms - clip.start_ms) / duration) * 100
          return (
            <div
              key={clip.id}
              className="absolute top-0 h-full bg-primary/30 border-l-2 border-r-2 border-primary/50 hover:bg-primary/40 transition-colors"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={clip.title}
            />
          )
        })}

        {/* In/Out selection highlight */}
        {selectionStart !== null && selectionEnd !== null && (
          <div
            className="absolute top-0 h-full bg-yellow-500/30 border-l-2 border-r-2 border-yellow-500"
            style={{
              left: `${(selectionStart / duration) * 100}%`,
              width: `${((selectionEnd - selectionStart) / duration) * 100}%`,
            }}
          />
        )}

        {/* Comment markers */}
        {timestampedComments.map((comment) => {
          const left = ((comment.timestamp_ms || 0) / duration) * 100
          return (
            <div
              key={comment.id}
              className="absolute top-1 w-2 h-2 bg-purple-500 rounded-full transform -translate-x-1 hover:scale-125 transition-transform cursor-pointer"
              style={{ left: `${left}%` }}
              title={comment.content}
              onClick={(e) => {
                e.stopPropagation()
                onSeek(comment.timestamp_ms || 0)
              }}
            />
          )
        })}

        {/* Task markers */}
        {taskEvents.map((task) => {
          const left = (task.timestamp_ms / duration) * 100
          return (
            <div
              key={task.task_id}
              className={cn(
                'absolute bottom-1 w-2 h-2 rounded-full transform -translate-x-1 hover:scale-125 transition-transform cursor-pointer',
                task.outcome === 'success' ? 'bg-green-500' : 'bg-amber-500'
              )}
              style={{ left: `${left}%` }}
              title={`${task.task_title} (${task.outcome})`}
              onClick={(e) => {
                e.stopPropagation()
                onSeek(task.timestamp_ms)
              }}
            />
          )
        })}

        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full bg-primary/20 pointer-events-none"
          style={{ width: `${progress}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 w-0.5 h-full bg-primary shadow-lg pointer-events-none"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
        </div>

        {/* Hover time tooltip - appears on hover */}
        <div className="absolute bottom-full mb-1 left-0 right-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
          <div className="text-xs text-center text-muted-foreground">
            Click or drag to seek
          </div>
        </div>
      </div>

      {/* Clips list (if any) */}
      {clips.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{clips.length} clip{clips.length !== 1 ? 's' : ''}:</span>
          {clips.slice(0, 3).map((clip) => (
            <button
              key={clip.id}
              className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded text-primary transition-colors"
              onClick={() => onSeek(clip.start_ms)}
            >
              {clip.title}
            </button>
          ))}
          {clips.length > 3 && <span>+{clips.length - 3} more</span>}
        </div>
      )}

      {/* Create Clip Dialog */}
      {selectionStart !== null && selectionEnd !== null && (
        <CreateClipDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          startMs={selectionStart}
          endMs={selectionEnd}
          onCreateClip={handleCreateClip}
        />
      )}
    </div>
  )
}
