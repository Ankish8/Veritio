'use client'

import { useState, useRef, useEffect } from 'react'
import type { MediaPlayerInstance } from '@vidstack/react'
import { VidstackRecordingPlayer } from './vidstack-recording-player'
import { RecordingLayoutControls, type RecordingLayout } from './recording-layout-controls'
import { cn } from '@/lib/utils'

// Re-export for external use
export type { RecordingLayout }
import type { TaskEvent } from '../task-timeline/task-timeline'

export interface DualRecordingPlayerProps {
  /** Primary recording (screen + audio) playback URL */
  primaryUrl: string
  /** Webcam recording playback URL (optional) */
  webcamUrl?: string | null
  /** Capture mode */
  captureMode: string | null
  /** Total recording duration in milliseconds */
  duration?: number
  /** Task events to display as markers */
  taskEvents?: TaskEvent[]
  /** Callback when playback position changes (time in milliseconds) */
  onTimeUpdate?: (currentTimeMs: number) => void
  /** Callback when playback ends */
  onEnded?: () => void
  /** External seek control (for clicking transcript segments) - in milliseconds */
  seekTo?: number
  /** Callback when external seek is completed */
  onSeekComplete?: () => void
  /** Hide all built-in controls (for external control via floating controls) */
  externalControls?: boolean
  /** Ref to expose the primary player instance */
  playerRef?: React.MutableRefObject<MediaPlayerInstance | null>
  /** Callback when play/pause state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** When true, video fits within parent container instead of using fixed aspect ratio */
  contained?: boolean
  /** Callback when actual video duration is detected (may differ from database value) */
  onDurationDetected?: (durationMs: number) => void
  /** Externally controlled layout (when provided, internal layout state is not used) */
  layout?: RecordingLayout
  /** Callback when layout changes (only called when layout is externally controlled) */
  onLayoutChange?: (layout: RecordingLayout) => void
  /** Hide the built-in layout controls (use when controlling layout externally) */
  hideLayoutControls?: boolean
}

/**
 * Dual-video player for screen + webcam recordings with synchronized playback.
 * Primary player controls both videos - one play button plays both in sync.
 */
export function DualRecordingPlayer({
  primaryUrl,
  webcamUrl,
  captureMode,
  duration,
  taskEvents = [],
  onTimeUpdate,
  onEnded,
  seekTo,
  onSeekComplete,
  externalControls = false,
  playerRef: externalPlayerRef,
  onPlayStateChange,
  contained = false,
  onDurationDetected,
  layout: externalLayout,
  onLayoutChange: externalOnLayoutChange,
  hideLayoutControls = false,
}: DualRecordingPlayerProps) {
  const [internalLayout, setInternalLayout] = useState<RecordingLayout>('pip')

  // Use external layout if provided, otherwise use internal state
  const layout = externalLayout ?? internalLayout
  const setLayout = externalOnLayoutChange ?? setInternalLayout
  const internalPlayerRef = useRef<MediaPlayerInstance | null>(null)
  const webcamPlayerRef = useRef<MediaPlayerInstance | null>(null)

  // Use external ref if provided, otherwise use internal
  const primaryPlayerRef = externalPlayerRef || internalPlayerRef

  const hasWebcam = Boolean(webcamUrl)

  // Synchronize webcam playback with primary player
  useEffect(() => {
    if (!hasWebcam || !primaryPlayerRef.current || !webcamPlayerRef.current) return

    const primary = primaryPlayerRef.current
    const webcam = webcamPlayerRef.current
    let isMounted = true

    // Sync play/pause with safety checks
    const handlePlay = () => {
      if (isMounted && webcam && !webcam.paused) return
      try {
        webcam?.play().catch(() => {}) // Ignore errors from unmounting
      } catch (_e) {
        // Ignore errors during unmount
      }
    }

    const handlePause = () => {
      if (!isMounted || !webcam) return
      try {
        webcam.pause()
      } catch (_e) {
        // Ignore errors during unmount
      }
    }

    // Sync seeking with safety checks
    const handleSeeking = () => {
      if (!isMounted || !webcam || !primary) return
      try {
        webcam.currentTime = primary.currentTime
      } catch (_e) {
        // Ignore errors during unmount
      }
    }

    // Sync playback rate with safety checks
    const handleRateChange = () => {
      if (!isMounted || !webcam || !primary) return
      try {
        webcam.playbackRate = primary.playbackRate
      } catch (_e) {
        // Ignore errors during unmount
      }
    }

    primary.addEventListener('play', handlePlay)
    primary.addEventListener('pause', handlePause)
    primary.addEventListener('seeking', handleSeeking)
    primary.addEventListener('rate-change', handleRateChange)

    return () => {
      isMounted = false
      // Remove event listeners before unmount
      primary.removeEventListener('play', handlePlay)
      primary.removeEventListener('pause', handlePause)
      primary.removeEventListener('seeking', handleSeeking)
      primary.removeEventListener('rate-change', handleRateChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWebcam, primaryUrl, webcamUrl])

  // Determine the capture mode type for the player
  const playerCaptureMode = (captureMode || 'screen_audio') as 'audio' | 'screen_audio' | 'screen_audio_webcam' | 'webcam'

  // If no webcam, just show primary player
  if (!hasWebcam) {
    return (
      <div className={cn("relative", contained && "h-full")}>
        <VidstackRecordingPlayer
          playbackUrl={primaryUrl}
          captureMode={playerCaptureMode}
          duration={duration}
          taskEvents={taskEvents}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          seekTo={seekTo}
          onSeekComplete={onSeekComplete}
          hideControls={externalControls}
          playerRef={primaryPlayerRef}
          onPlayStateChange={onPlayStateChange}
          contained={contained}
          onDurationDetected={onDurationDetected}
        />
      </div>
    )
  }

  return (
    <div className={cn("relative", contained && "h-full")}>
      {/* Player Container */}
      <div className={cn("relative", contained && "h-full")}>
        {/* Picture-in-Picture Layout */}
        {layout === 'pip' && (
          <div className={cn("relative", contained && "h-full")}>
            {/* Primary (Screen) - Full size with controls */}
            <VidstackRecordingPlayer
              playbackUrl={primaryUrl}
              captureMode="screen_audio"
              duration={duration}
              taskEvents={taskEvents}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              seekTo={seekTo}
              onSeekComplete={onSeekComplete}
              playerRef={primaryPlayerRef}
              hideControls={externalControls}
              onPlayStateChange={onPlayStateChange}
              contained={contained}
              onDurationDetected={onDurationDetected}
            />

            {/* Webcam - Overlay in bottom-right corner (no controls, synced) */}
            <div className="absolute bottom-20 right-4 w-72 rounded-xl overflow-hidden shadow-2xl border-2 border-white/30 z-20 hover:border-white/50 transition-all">
              <VidstackRecordingPlayer
                playbackUrl={webcamUrl!}
                captureMode="webcam"
                seekTo={seekTo}
                onSeekComplete={onSeekComplete}
                hideControls={true}
                playerRef={webcamPlayerRef}
              />
            </div>
          </div>
        )}

        {/* Side-by-Side Layout */}
        {layout === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Screen - with controls (master) */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Screen Recording</p>
              <VidstackRecordingPlayer
                playbackUrl={primaryUrl}
                captureMode="screen_audio"
                duration={duration}
                taskEvents={taskEvents}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                seekTo={seekTo}
                onSeekComplete={onSeekComplete}
                playerRef={primaryPlayerRef}
                hideControls={externalControls}
                onPlayStateChange={onPlayStateChange}
                onDurationDetected={onDurationDetected}
              />
            </div>

            {/* Webcam - no controls (synced) */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Webcam</p>
              <VidstackRecordingPlayer
                playbackUrl={webcamUrl!}
                captureMode="webcam"
                seekTo={seekTo}
                onSeekComplete={onSeekComplete}
                hideControls={true}
                playerRef={webcamPlayerRef}
              />
            </div>
          </div>
        )}

        {/* Screen Only */}
        {layout === 'screen-only' && (
          <VidstackRecordingPlayer
            playbackUrl={primaryUrl}
            captureMode="screen_audio"
            duration={duration}
            taskEvents={taskEvents}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            seekTo={seekTo}
            onSeekComplete={onSeekComplete}
            hideControls={externalControls}
            playerRef={primaryPlayerRef}
            onPlayStateChange={onPlayStateChange}
            onDurationDetected={onDurationDetected}
          />
        )}

        {/* Webcam Only - shows webcam but keeps primary playing (hidden) for audio */}
        {layout === 'webcam-only' && (
          <>
            {/* Hidden primary player for audio */}
            <div className="hidden">
              <VidstackRecordingPlayer
                playbackUrl={primaryUrl}
                captureMode="screen_audio"
                duration={duration}
                taskEvents={taskEvents}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                seekTo={seekTo}
                onSeekComplete={onSeekComplete}
                hideControls={true}
                playerRef={primaryPlayerRef}
                onPlayStateChange={onPlayStateChange}
                onDurationDetected={onDurationDetected}
              />
            </div>
            {/* Visible webcam video (synced, no audio needed) */}
            <VidstackRecordingPlayer
              playbackUrl={webcamUrl!}
              captureMode="webcam"
              seekTo={seekTo}
              onSeekComplete={onSeekComplete}
              hideControls={true}
              playerRef={webcamPlayerRef}
            />
          </>
        )}
      </div>

      {/* Compact Layout Controls (Meet/Zoom style) - hidden when externally controlled */}
      {!hideLayoutControls && (
        <RecordingLayoutControls
          layout={layout}
          onLayoutChange={setLayout}
          hasWebcam={hasWebcam}
          className="absolute top-4 right-4 z-30"
        />
      )}
    </div>
  )
}
