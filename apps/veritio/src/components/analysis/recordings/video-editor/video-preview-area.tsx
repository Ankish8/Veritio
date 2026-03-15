'use client'

import { useCallback, useRef, useState } from 'react'
import type { MediaPlayerInstance } from '@vidstack/react'
import { Play, Pause } from 'lucide-react'
import { DualRecordingPlayer, type RecordingLayout } from '../recording-player/dual-recording-player'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { TaskEvent } from '../task-timeline/task-timeline'

export interface VideoPreviewAreaProps {
  playbackUrl: string | null
  webcamPlaybackUrl: string | null
  captureMode: string | null
  duration: number
  taskEvents: TaskEvent[]
  onTimeUpdate: (time: number) => void
  seekTo?: number
  onSeekComplete?: () => void
  /** External ref for the player instance */
  playerRef?: React.MutableRefObject<MediaPlayerInstance | null>
  /** Callback when play state changes */
  onPlayStateChange?: (playing: boolean) => void
  /** Callback when user presses I to set in-point (uses store's currentTime) */
  onSetInPoint?: () => void
  /** Callback when user presses O to set out-point (uses store's currentTime) */
  onSetOutPoint?: () => void
  /** Callback when actual video duration is detected (may differ from database value) */
  onDurationDetected?: (durationMs: number) => void
  /** Video layout mode */
  layout?: RecordingLayout
  /** Callback when layout changes */
  onLayoutChange?: (layout: RecordingLayout) => void
}

/**
 * Large video preview area.
 * Takes up most of the screen - controls are now in the unified control bar.
 *
 * Features:
 * - Large video display with aspect ratio preservation
 * - Click to play/pause
 * - Keyboard shortcuts (I/O for in/out points, space for play/pause)
 */
export function VideoPreviewArea({
  playbackUrl,
  webcamPlaybackUrl,
  captureMode,
  duration,
  taskEvents,
  onTimeUpdate,
  seekTo,
  onSeekComplete,
  playerRef: externalPlayerRef,
  onPlayStateChange,
  onSetInPoint,
  onSetOutPoint,
  onDurationDetected,
  layout,
  onLayoutChange,
}: VideoPreviewAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<'play' | 'pause' | null>(null)
  const iconTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Internal player ref if external not provided
  const internalPlayerRef = useRef<MediaPlayerInstance | null>(null)
  const playerRef = externalPlayerRef || internalPlayerRef

  // Video editor store
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)

  // Sync player state changes
  const handlePlayerStateChange = useCallback((playing: boolean) => {
    onPlayStateChange?.(playing)
  }, [onPlayStateChange])

  // Wrap in/out point setters to show toast notifications
  const handleSetInPoint = useCallback(() => {
    onSetInPoint?.()
    toast.success('In-point set', {
      description: `Start: ${formatDuration(currentTime)}`,
      duration: 2000,
    })
  }, [onSetInPoint, currentTime])

  const handleSetOutPoint = useCallback(() => {
    onSetOutPoint?.()
    toast.success('Out-point set', {
      description: `End: ${formatDuration(currentTime)}`,
      duration: 2000,
    })
  }, [onSetOutPoint, currentTime])

  // Keyboard shortcuts for video editing
  useKeyboardShortcuts({
    playerRef,
    currentTime,
    duration,
    onSetInPoint: handleSetInPoint,
    onSetOutPoint: handleSetOutPoint,
    onClearSelection: clearClipCreation,
    enabled: !!playbackUrl,
  })

  // Handle click to play/pause with visual feedback
  const handleClick = useCallback(() => {
    const player = playerRef.current
    if (!player || !playbackUrl) return

    // Check if player is ready (Vidstack requires can-play before interaction)
    try {
      // Access state safely - player might not be fully initialized
      const canPlay = player.state?.canPlay
      if (!canPlay) return
    } catch {
      // Player not ready yet
      return
    }

    // Clear any existing timeout
    if (iconTimeoutRef.current) {
      clearTimeout(iconTimeoutRef.current)
    }

    try {
      const willPlay = player.paused

      if (willPlay) {
        player.play()
        setShowPlayPauseIcon('play')
      } else {
        player.pause()
        setShowPlayPauseIcon('pause')
      }

      // Hide icon after animation
      iconTimeoutRef.current = setTimeout(() => {
        setShowPlayPauseIcon(null)
      }, 500)
    } catch {
      // Ignore errors if player is in an invalid state
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      {/* Video Player - constrained to fit within container */}
      {playbackUrl && (
        <div className="absolute inset-0 pointer-events-none">
          <DualRecordingPlayer
            primaryUrl={playbackUrl}
            webcamUrl={webcamPlaybackUrl}
            captureMode={captureMode}
            duration={duration}
            taskEvents={taskEvents}
            onTimeUpdate={onTimeUpdate}
            seekTo={seekTo}
            onSeekComplete={onSeekComplete}
            externalControls={true}
            playerRef={playerRef}
            onPlayStateChange={handlePlayerStateChange}
            contained={true}
            onDurationDetected={onDurationDetected}
            layout={layout}
            onLayoutChange={onLayoutChange}
            hideLayoutControls
          />
        </div>
      )}

      {/* No video placeholder */}
      {!playbackUrl && (
        <div className="text-muted-foreground text-sm">No video available</div>
      )}

      {/* Play/Pause visual feedback overlay */}
      {showPlayPauseIcon && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center pointer-events-none',
            'animate-in fade-in-0 zoom-in-50 duration-150'
          )}
        >
          <div className="rounded-full bg-black/60 p-6 animate-out fade-out-0 zoom-out-75 duration-300 delay-200">
            {showPlayPauseIcon === 'play' ? (
              <Play className="h-12 w-12 text-white fill-white" />
            ) : (
              <Pause className="h-12 w-12 text-white fill-white" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
