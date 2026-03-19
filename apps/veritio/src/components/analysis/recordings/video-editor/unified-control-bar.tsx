'use client'

/**
 * Unified Control Bar
 *
 * A single control bar that combines all video controls:
 * - Play/Pause
 * - Volume
 * - Seekable progress bar with markers
 * - Time display
 * - Clip creation (Set Start, Set End, Create Clip)
 * - Playback speed
 * - Fullscreen
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Scissors,
  X,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn, formatDuration } from '@/lib/utils'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { CreateClipDialog } from './create-clip-dialog'
import { TaskMarker } from './task-marker'
import { getClipColor } from './sidebar/editor-sidebar'
import type { TaskEvent } from '../task-timeline/task-timeline'

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

export interface UnifiedControlBarProps {
  duration: number
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  clips: Clip[]
  comments: Comment[]
  taskEvents: TaskEvent[]
  onTogglePlayback: () => void
  onSeek: (timeMs: number) => void
  onPlaybackRateChange: (rate: number) => void
  onCreateClip: (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
  }) => Promise<unknown>
  onVolumeChange?: (volume: number) => void
  onMuteChange?: (muted: boolean) => void
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2]

export function UnifiedControlBar({
  duration,
  currentTime,
  isPlaying,
  playbackRate,
  clips,
  comments,
  taskEvents,
  onTogglePlayback,
  onSeek,
  onPlaybackRateChange,
  onCreateClip,
  onVolumeChange,
  onMuteChange,
}: UnifiedControlBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  // Store subscription for clip creation cleanup after save
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)

  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Get time from mouse position
  const getTimeFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!trackRef.current || duration <= 0) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      return (x / rect.width) * duration
    },
    [duration]
  )

  // Handle click on progress bar
  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromEvent(e)
      onSeek(time)
    },
    [getTimeFromEvent, onSeek]
  )

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      const time = getTimeFromEvent(e)
      onSeek(time)
    },
    [getTimeFromEvent, onSeek]
  )

  // Handle hover for time preview
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      setHoverX(x)
      setHoverTime(getTimeFromEvent(e))
    },
    [getTimeFromEvent]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null)
  }, [])

  // Handle drag — mousemove is passive-safe (no preventDefault needed)
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      const time = getTimeFromEvent(e)
      onSeek(time)
    }

    const handleUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, getTimeFromEvent, onSeek])

  // Volume handlers — sync with parent via callbacks
  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0]
    setVolume(newVolume)
    const newMuted = newVolume === 0
    setIsMuted(newMuted)
    onVolumeChange?.(newVolume)
    if (newMuted !== isMuted) onMuteChange?.(newMuted)
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    onMuteChange?.(newMuted)
  }

  // Get volume icon based on level
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  // Playback rate
  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length
    onPlaybackRateChange(PLAYBACK_RATES[nextIndex])
  }

  // Fullscreen — use data attribute for stable lookup instead of fragile CSS class traversal
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    const container = trackRef.current?.closest('[data-fullscreen-container]')
    if (container) {
      container.requestFullscreen()
    }
  }

  // Handle clip creation
  const handleCreateClip = useCallback(
    async (data: {
      startMs: number
      endMs: number
      title: string
      description?: string
    }) => {
      await onCreateClip(data)
      clearClipCreation()
    },
    [onCreateClip] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Filter comments with timestamps
  const timestampedComments = comments.filter((c) => c.timestamp_ms !== null)

  return (
    <div className="flex flex-col bg-muted/50 border-t">
      {/* Progress bar row */}
      <ProgressTrack
        trackRef={trackRef}
        duration={duration}
        progress={progress}
        clips={clips}
        timestampedComments={timestampedComments}
        taskEvents={taskEvents}
        hoverTime={hoverTime}
        hoverX={hoverX}
        onProgressClick={handleProgressClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onSeek={onSeek}
      />

      {/* Controls row */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePlayback}
                className="h-9 w-9 p-0"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isPlaying ? 'Pause' : 'Play'} (Space)</p>
            </TooltipContent>
          </Tooltip>

          {/* Volume - Popover with vertical slider */}
          <Popover open={isVolumeOpen} onOpenChange={setIsVolumeOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <VolumeIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              className="w-10 p-2"
              onInteractOutside={() => setIsVolumeOpen(false)}
            >
              <div className="flex flex-col items-center gap-2">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.05}
                  orientation="vertical"
                  className="h-24"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="h-7 w-7 p-0"
                >
                  <VolumeIcon className="h-3 w-3" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Time display */}
          <div className="text-sm text-muted-foreground font-mono ml-2 min-w-[100px]">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </div>
        </div>

        {/* Center: Clip creation */}
        <ClipCreationControls
          onCreateClip={() => setIsCreateDialogOpen(true)}
        />

        {/* Right: Settings */}
        <div className="flex items-center gap-1">
          {/* Playback speed */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={cyclePlaybackRate}
                className="h-8 px-2 text-xs font-medium"
              >
                {playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Playback speed</p>
            </TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-9 w-9 p-0">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Fullscreen</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Create Clip Dialog */}
      <ClipCreationDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateClip={handleCreateClip}
      />
    </div>
  )
}

/* ---------- Extracted sub-components ---------- */

interface ProgressTrackProps {
  trackRef: React.RefObject<HTMLDivElement | null>
  duration: number
  progress: number
  clips: Clip[]
  timestampedComments: Comment[]
  taskEvents: TaskEvent[]
  hoverTime: number | null
  hoverX: number
  onProgressClick: (e: React.MouseEvent) => void
  onMouseDown: (e: React.MouseEvent) => void
  onMouseMove: (e: React.MouseEvent) => void
  onMouseLeave: () => void
  onSeek: (timeMs: number) => void
}

function ProgressTrack({
  trackRef,
  duration,
  progress,
  clips,
  timestampedComments,
  taskEvents,
  hoverTime,
  hoverX,
  onProgressClick,
  onMouseDown,
  onMouseMove,
  onMouseLeave,
  onSeek,
}: ProgressTrackProps) {
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const hasInPoint = clipCreation.inPoint !== null
  const hasOutPoint = clipCreation.outPoint !== null

  const selectionStart =
    hasInPoint && hasOutPoint
      ? Math.min(clipCreation.inPoint!, clipCreation.outPoint!)
      : null
  const selectionEnd =
    hasInPoint && hasOutPoint
      ? Math.max(clipCreation.inPoint!, clipCreation.outPoint!)
      : null

  return (
    <div className="px-4 pt-3 pb-1">
      <div
        ref={trackRef}
        className="relative h-2 bg-muted rounded-full cursor-pointer group"
        onClick={onProgressClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Existing clips shown as segments with matching pastel colors */}
        {clips.map((clip, index) => {
          const left = (clip.start_ms / duration) * 100
          const width = ((clip.end_ms - clip.start_ms) / duration) * 100
          const colorScheme = getClipColor(index)
          return (
            <div
              key={clip.id}
              className={cn("absolute top-0 h-full rounded-full", colorScheme.timeline)}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={clip.title}
            />
          )
        })}

        {/* Selection highlight */}
        {selectionStart !== null && selectionEnd !== null && (
          <div
            className="absolute top-0 h-full bg-yellow-500/50 rounded-full"
            style={{
              left: `${(selectionStart / duration) * 100}%`,
              width: `${((selectionEnd - selectionStart) / duration) * 100}%`,
            }}
          />
        )}

        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full bg-primary/30 rounded-full pointer-events-none"
          style={{ width: `${progress}%` }}
        />

        {/* Comment markers */}
        {timestampedComments.map((comment) => {
          const left = ((comment.timestamp_ms || 0) / duration) * 100
          return (
            <div
              key={comment.id}
              className="absolute top-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full -translate-y-1/2 -translate-x-1/2 hover:scale-150 transition-transform cursor-pointer z-10"
              style={{ left: `${left}%` }}
              title={comment.content}
              onClick={(e) => {
                e.stopPropagation()
                onSeek(comment.timestamp_ms || 0)
              }}
            />
          )
        })}

        {/* Task markers - Positioned above timeline */}
        {taskEvents.map((task) => (
          <TaskMarker
            key={task.task_id}
            task={task}
            duration={duration}
            onSeek={onSeek}
          />
        ))}

        {/* In/Out point markers - simple triangular handles */}
        {hasInPoint && (
          <div
            className="absolute h-full z-20 pointer-events-none"
            style={{ left: `${(clipCreation.inPoint! / duration) * 100}%` }}
          >
            {/* Triangle handle pointing down */}
            <div
              className="absolute -top-2.5 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid #22c55e',
              }}
            />
            {/* Vertical line */}
            <div className="absolute top-0 left-0 w-0.5 h-full bg-green-500 -translate-x-1/2" />
          </div>
        )}
        {hasOutPoint && (
          <div
            className="absolute h-full z-20 pointer-events-none"
            style={{ left: `${(clipCreation.outPoint! / duration) * 100}%` }}
          >
            {/* Triangle handle pointing down */}
            <div
              className="absolute -top-2.5 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid #ef4444',
              }}
            />
            {/* Vertical line */}
            <div className="absolute top-0 left-0 w-0.5 h-full bg-red-500 -translate-x-1/2" />
          </div>
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 w-1 h-full bg-primary rounded-full -translate-x-1/2 shadow-sm pointer-events-none z-20"
          style={{ left: `${progress}%` }}
        />

        {/* Hover time tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 px-2 py-1 bg-popover border rounded text-xs shadow-md pointer-events-none z-30 -translate-x-1/2"
            style={{ left: hoverX }}
          >
            {formatDuration(hoverTime)}
          </div>
        )}

        {/* Hover line */}
        {hoverTime !== null && (
          <div
            className="absolute top-0 w-px h-full bg-muted-foreground/30 pointer-events-none"
            style={{ left: hoverX }}
          />
        )}
      </div>
    </div>
  )
}

interface ClipCreationControlsProps {
  onCreateClip: () => void
}

function ClipCreationControls({ onCreateClip }: ClipCreationControlsProps) {
  const [isClipModeOpen, setIsClipModeOpen] = useState(false)

  // Store state for clip creation
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const setInPointAtPlayhead = useVideoEditorStore((s) => s.setInPointAtPlayhead)
  const setOutPointAtPlayhead = useVideoEditorStore((s) => s.setOutPointAtPlayhead)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)

  const hasInPoint = clipCreation.inPoint !== null
  const hasOutPoint = clipCreation.outPoint !== null
  const hasValidSelection =
    hasInPoint && hasOutPoint && Math.abs(clipCreation.outPoint! - clipCreation.inPoint!) >= 100

  if (!hasInPoint && !hasOutPoint) {
    return (
      <div className="flex items-center gap-2">
        <Popover open={isClipModeOpen} onOpenChange={setIsClipModeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Scissors className="h-3.5 w-3.5" />
              Create Clip
              <ChevronUp className={cn(
                "h-3 w-3 transition-transform",
                isClipModeOpen && "rotate-180"
              )} />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-64 p-3">
            <div className="space-y-3">
              <p className="text-sm font-medium">Create a clip from this recording</p>
              <p className="text-xs text-muted-foreground">
                Mark the start and end points to create a clip you can share or export.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setInPointAtPlayhead()
                    setIsClipModeOpen(false)
                  }}
                  className="flex-1 h-8 text-xs"
                >
                  Mark Start Here
                </Button>
              </div>
              <p className="text-[12px] text-muted-foreground text-center">
                Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">I</kbd> for start, <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">O</kbd> for end
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        <Scissors className="h-3.5 w-3.5 text-muted-foreground" />

        {/* Start marker */}
        <button
          onClick={setInPointAtPlayhead}
          className={cn(
            "text-xs px-2 py-1 rounded transition-colors",
            hasInPoint
              ? "bg-green-500/20 text-green-600 dark:text-green-400"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          {hasInPoint ? formatDuration(clipCreation.inPoint!) : 'Start?'}
        </button>

        <span className="text-muted-foreground text-xs">&rarr;</span>

        {/* End marker */}
        <button
          onClick={setOutPointAtPlayhead}
          className={cn(
            "text-xs px-2 py-1 rounded transition-colors",
            hasOutPoint
              ? "bg-red-500/20 text-red-600 dark:text-red-400"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          {hasOutPoint ? formatDuration(clipCreation.outPoint!) : 'End?'}
        </button>

        {/* Create button when valid */}
        {hasValidSelection && (
          <Button
            size="sm"
            onClick={onCreateClip}
            className="h-7 text-xs ml-2 bg-primary hover:bg-primary/90 shadow-sm"
          >
            Save Clip
          </Button>
        )}

        {/* Clear button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearClipCreation}
          className="h-7 w-7 p-0 ml-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

interface ClipCreationDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreateClip: (data: { startMs: number; endMs: number; title: string; description?: string }) => Promise<unknown>
}

function ClipCreationDialog({ isOpen, onOpenChange, onCreateClip }: ClipCreationDialogProps) {
  const clipCreation = useVideoEditorStore((s) => s.clipCreation)
  const hasInPoint = clipCreation.inPoint !== null
  const hasOutPoint = clipCreation.outPoint !== null

  if (!hasInPoint || !hasOutPoint) return null

  const selectionStart = Math.min(clipCreation.inPoint!, clipCreation.outPoint!)
  const selectionEnd = Math.max(clipCreation.inPoint!, clipCreation.outPoint!)

  return (
    <CreateClipDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      startMs={selectionStart}
      endMs={selectionEnd}
      onCreateClip={onCreateClip}
    />
  )
}
