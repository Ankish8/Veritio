'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
  useMediaState,
  useMediaRemote,
} from '@vidstack/react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { VideoTimeSlider, type ClipMarker, type ClipSelectionRange } from './video-time-slider'
import { AudioWaveform } from './audio-waveform'
import { QuickClipButton } from './quick-clip-button'
import type { TaskEvent } from '../task-timeline/task-timeline'

export interface VidstackRecordingPlayerProps {
  /** Playback URL for the recording */
  playbackUrl: string
  /** Capture mode to determine if video or audio only */
  captureMode: 'audio' | 'screen_audio' | 'screen_audio_webcam' | 'webcam'
  /** Total recording duration in milliseconds (for marker positioning) */
  duration?: number
  /** Task events to display as markers on the progress bar */
  taskEvents?: TaskEvent[]
  /** Callback when playback position changes (time in milliseconds) */
  onTimeUpdate?: (currentTimeMs: number) => void
  /** Callback when playback ends */
  onEnded?: () => void
  /** External seek control (for clicking transcript segments) - in milliseconds */
  seekTo?: number
  /** Callback when external seek is completed (so parent can clear seekTo) */
  onSeekComplete?: () => void
  /** Hide controls (for PiP overlay or synchronized playback) */
  hideControls?: boolean
  /** Ref to the MediaPlayerInstance for synchronized playback */
  playerRef?: React.RefObject<MediaPlayerInstance | null>
  /** Existing clips to show on timeline */
  clips?: ClipMarker[]
  /** Callback when a clip marker is clicked */
  onClipMarkerClick?: (clip: ClipMarker) => void
  /** Callback for quick clip creation (if provided, shows quick clip button) */
  onQuickClip?: (startMs: number, endMs: number) => Promise<void>
  /** Clip selection mode with range */
  clipSelectionMode?: boolean
  /** Current clip selection range */
  clipSelectionRange?: ClipSelectionRange
  /** Callback when clip selection changes */
  onClipSelectionChange?: (range: ClipSelectionRange) => void
  /** Callback when play/pause state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** When true, video fits within parent container instead of using fixed aspect ratio */
  contained?: boolean
  /** Callback when actual video duration is detected (may differ from database value) */
  onDurationDetected?: (durationMs: number) => void
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const

/**
 * YouTube-style video/audio player for session recordings.
 */
export function VidstackRecordingPlayer({
  playbackUrl,
  captureMode,
  duration: durationMs,
  taskEvents = [],
  onTimeUpdate,
  onEnded,
  seekTo,
  onSeekComplete,
  hideControls = false,
  playerRef: externalPlayerRef,
  clips = [],
  onClipMarkerClick,
  onQuickClip,
  clipSelectionMode,
  clipSelectionRange,
  onClipSelectionChange,
  onPlayStateChange,
  contained = false,
  onDurationDetected,
}: VidstackRecordingPlayerProps) {
  const internalPlayerRef = useRef<MediaPlayerInstance>(null)
  const playerRef = externalPlayerRef || internalPlayerRef
  const [isReady, setIsReady] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Track the actual detected duration from video (more accurate than database value)
  const [detectedDurationMs, setDetectedDurationMs] = useState<number | null>(null)

  // Use ref to store latest callback (prevents stale closure issues)
  const onSeekCompleteRef = useRef(onSeekComplete)
  useEffect(() => {
    onSeekCompleteRef.current = onSeekComplete
  }, [onSeekComplete])

  // Track maximum time reached during playback - this helps detect actual content end
  const maxTimeReached = useRef(0)

  // Track maximum time during playback via timeupdate
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const handleTimeUpdate = () => {
      const current = player.currentTime
      if (Number.isFinite(current) && current > maxTimeReached.current) {
        maxTimeReached.current = current
      }
    }

    player.addEventListener('time-update', handleTimeUpdate)

    return () => {
      player.removeEventListener('time-update', handleTimeUpdate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current])


  // Notify parent when detected duration changes (outside of render cycle)
  useEffect(() => {
    if (detectedDurationMs !== null) {
      onDurationDetected?.(detectedDurationMs)
    }
  }, [detectedDurationMs, onDurationDetected])

  // Use detected duration if available, otherwise fall back to prop
  const effectiveDurationMs = detectedDurationMs ?? durationMs

  const isAudioOnly = captureMode === 'audio'
  const shouldShowControls = !hideControls && showControls

  // Handle external seek (from transcript/timeline clicks)
  useEffect(() => {
    if (seekTo !== undefined && playerRef.current && isReady) {
      const seekTimeSeconds = seekTo / 1000
      playerRef.current.currentTime = seekTimeSeconds
      onSeekCompleteRef.current?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo, isReady])

  // Auto-hide controls after inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  const handleMouseMove = useCallback(() => {
    resetHideTimer()
  }, [resetHideTimer])

  const handleMouseLeave = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    setShowControls(false)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Emit play/pause state changes to parent
  useEffect(() => {
    const player = playerRef.current
    if (!player || !onPlayStateChange) return

    const handlePlay = () => onPlayStateChange(true)
    const handlePause = () => onPlayStateChange(false)

    player.addEventListener('play', handlePlay)
    player.addEventListener('pause', handlePause)

    return () => {
      player.removeEventListener('play', handlePlay)
      player.removeEventListener('pause', handlePause)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current, onPlayStateChange])

  const handleTimeUpdate = useCallback(
    (detail: { currentTime: number }) => {
      const timeMs = detail.currentTime * 1000
      // Guard against invalid time values from WebM metadata
      if (Number.isFinite(timeMs) && timeMs >= 0) {
        onTimeUpdate?.(timeMs)
      }
    },
    [onTimeUpdate]
  )

   
  const handleEnded = useCallback(() => {
    // Capture actual duration when video ends (fixes incorrect database duration)
    // Use maxTimeReached which tracks the highest time seen during playback
    const maxTime = maxTimeReached.current
    const currentTime = playerRef.current?.currentTime || 0

    // Guard against invalid values (Infinity, NaN)
    const validMaxTime = Number.isFinite(maxTime) ? maxTime : 0
    const validCurrentTime = Number.isFinite(currentTime) ? currentTime : 0
    const actualEndTime = Math.max(validMaxTime, validCurrentTime)

    if (actualEndTime > 0 && actualEndTime < 86400) { // Max 24 hours in seconds
      const actualDurationMs = actualEndTime * 1000
      // Only update if actual duration is less than what we have (video ended early)
      // The useEffect above will notify the parent when detectedDurationMs changes
      setDetectedDurationMs(prev => {
        if (!prev || actualDurationMs < prev) {
          return actualDurationMs
        }
        return prev
      })
    }
    onEnded?.()
  }, [onEnded, playerRef])

  const handleCanPlay = useCallback(() => {
    setIsReady(true)
  }, [])

  const handleError = useCallback(() => {
    // Error handling through UI
  }, [])

  return (
    <MediaPlayer
      ref={playerRef}
      src={playbackUrl}
      crossOrigin="anonymous"
      playsInline
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      onCanPlay={handleCanPlay}
      onError={handleError}
      className={cn(
        "relative w-full bg-black rounded-lg overflow-hidden group",
        contained && "h-full"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={resetHideTimer}
    >
      {/* Video Area */}
      <div className={cn(
        'relative w-full',
        isAudioOnly ? 'h-32' : contained ? 'h-full' : 'aspect-video'
      )}>
        <MediaProvider className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-contain" />

        {/* Audio waveform for audio-only mode */}
        {isAudioOnly && <AudioWaveform />}

        {/* Buffering overlay */}
        <BufferingIndicator />

        {/* Click to play/pause overlay (hidden when hideControls is true) */}
        {!hideControls && <ClickOverlay />}
      </div>

      {/* YouTube-style bottom controls */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 transition-opacity duration-300',
          'bg-gradient-to-t from-black/95 via-black/70 to-black/20',
          shouldShowControls ? 'opacity-100' : 'opacity-0',
          hideControls && 'pointer-events-none'
        )}
      >
        {/* Progress bar */}
        <div className="px-3 pt-8">
          <VideoTimeSlider
            taskEvents={taskEvents}
            durationMs={effectiveDurationMs}
            clips={clips}
            onClipMarkerClick={onClipMarkerClick}
            clipSelectionMode={clipSelectionMode}
            clipSelectionRange={clipSelectionRange}
            onClipSelectionChange={onClipSelectionChange}
            playerRef={playerRef}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <PlayPauseButton />
            <VolumeControl />
            <TimeDisplay fallbackDurationMs={effectiveDurationMs} />
            {/* Quick clip button */}
            {onQuickClip && effectiveDurationMs && (
              <QuickClipButton
                durationMs={effectiveDurationMs}
                onQuickClip={onQuickClip}
              />
            )}
          </div>

          <div className="flex items-center gap-1">
            <SpeedControl />
            {!isAudioOnly && <FullscreenButton />}
          </div>
        </div>
      </div>
    </MediaPlayer>
  )
}

// Sub-components that use Vidstack hooks (must be inside MediaPlayer)

function BufferingIndicator() {
  const waiting = useMediaState('waiting')
  const canPlay = useMediaState('canPlay')

  if (!waiting && canPlay) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
      <Loader2 className="h-12 w-12 text-white animate-spin" />
    </div>
  )
}

function ClickOverlay() {
  const remote = useMediaRemote()
  const paused = useMediaState('paused')

  const handleClick = () => {
    remote.togglePaused()
  }

  return (
    <div
      className="absolute inset-0 cursor-pointer z-[5] pointer-events-none"
      onClick={handleClick}
    >
      {/* Clickable area (excludes bottom controls) */}
      <div
        className="absolute inset-x-0 top-0 bottom-20 pointer-events-auto"
        onClick={handleClick}
      />

      {/* Large play button in center when paused */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  )
}

function PlayPauseButton() {
  const remote = useMediaRemote()
  const paused = useMediaState('paused')

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => remote.togglePaused()}
      className="h-9 w-9 text-white hover:bg-white/20"
    >
      {paused ? (
        <Play className="h-5 w-5" />
      ) : (
        <Pause className="h-5 w-5" />
      )}
    </Button>
  )
}

function VolumeControl() {
  const remote = useMediaRemote()
  const volume = useMediaState('volume')
  const muted = useMediaState('muted')
  const [showSlider, setShowSlider] = useState(false)

  return (
    <div
      className="flex items-center gap-1"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => remote.toggleMuted()}
        className="h-9 w-9 text-white hover:bg-white/20"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </Button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          showSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
        )}
      >
        <Slider
          value={[muted ? 0 : volume]}
          max={1}
          step={0.05}
          onValueChange={(val) => {
            remote.changeVolume(val[0])
            if (val[0] > 0 && muted) remote.unmute()
          }}
          className="w-20"
        />
      </div>
    </div>
  )
}

function TimeDisplay({ fallbackDurationMs }: { fallbackDurationMs?: number }) {
  const currentTime = useMediaState('currentTime')
  const mediaDuration = useMediaState('duration')

  // Use Vidstack duration if finite and positive, otherwise fall back to prop
  const duration = Number.isFinite(mediaDuration) && mediaDuration > 0
    ? mediaDuration
    : (fallbackDurationMs && fallbackDurationMs > 0 ? fallbackDurationMs / 1000 : 0)

  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <span className="text-white text-sm ml-2 font-mono">
      {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
    </span>
  )
}

function SpeedControl() {
  const remote = useMediaRemote()
  const playbackRate = useMediaState('playbackRate')

  return (
    <div className="flex items-center gap-0.5">
      {PLAYBACK_RATES.map((rate) => (
        <Button
          key={rate}
          variant="ghost"
          size="sm"
          onClick={() => remote.changePlaybackRate(rate)}
          className={cn(
            'h-7 px-2 text-xs text-white hover:bg-white/20',
            playbackRate === rate && 'bg-white/20'
          )}
        >
          {rate}x
        </Button>
      ))}
    </div>
  )
}

function FullscreenButton() {
  const remote = useMediaRemote()
  const fullscreen = useMediaState('fullscreen')

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => remote.toggleFullscreen()}
      className="h-9 w-9 text-white hover:bg-white/20"
    >
      {fullscreen ? (
        <Minimize className="h-5 w-5" />
      ) : (
        <Maximize className="h-5 w-5" />
      )}
    </Button>
  )
}
