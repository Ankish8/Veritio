'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

export interface RecordingPlayerProps {
  /** Playback URL for the recording */
  playbackUrl: string
  /** Capture mode to determine if video or audio only */
  captureMode: 'audio' | 'screen_audio' | 'screen_audio_webcam'
  /** Callback when playback position changes */
  onTimeUpdate?: (currentTime: number) => void
  /** Callback when playback ends */
  onEnded?: () => void
  /** External seek control (for clicking transcript segments) - in milliseconds */
  seekTo?: number
  /** Callback when external seek is completed (so parent can clear seekTo) */
  onSeekComplete?: () => void
}

/**
 * Video/audio player for session recordings.
 *
 * Features:
 * - Play/pause, scrubbing, volume control
 * - Playback speed (0.5x, 1x, 1.5x, 2x)
 * - Fullscreen support
 * - Audio waveform for audio-only recordings
 * - Keyboard shortcuts (Space, Arrow keys)
 *
 * @example
 * ```tsx
 * <RecordingPlayer
 *   playbackUrl="https://r2.example.com/recording.webm"
 *   captureMode="screen_audio"
 *   onTimeUpdate={(time) => highlightTranscriptSegment(time)}
 * />
 * ```
 */
export function RecordingPlayer({
  playbackUrl,
  captureMode,
  onTimeUpdate,
  onEnded,
  seekTo,
  onSeekComplete,
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeking, setIsSeeking] = useState(false)

  const isAudioOnly = captureMode === 'audio'

  // Robust seek function that handles WebM quirks
  const performSeek = useCallback((timeInSeconds: number) => {
    const video = videoRef.current
    if (!video) return

    // Guard against invalid values
    if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return

    // Clamp to valid range
    const clampedTime = Math.min(Math.max(0, timeInSeconds), video.duration || Infinity)

    setIsSeeking(true)
    setCurrentTime(clampedTime)

    // Use fastSeek if available (better for WebM), otherwise regular currentTime
    if ('fastSeek' in video && typeof video.fastSeek === 'function') {
      video.fastSeek(clampedTime)
    } else {
      video.currentTime = clampedTime
    }
  }, [])

  // Handle external seek (from transcript/timeline clicks only)
  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      const seekTimeSeconds = seekTo / 1000 // Convert ms to seconds
      performSeek(seekTimeSeconds)
      // Notify parent that seek is complete so they can clear the seekTo prop
      onSeekComplete?.()
    }
  }, [seekTo, onSeekComplete, performSeek])

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
    }
  }

  const handleCanPlay = () => {
    setIsLoading(false)
  }

  const handleTimeUpdate = () => {
    // Don't update during seeking to prevent conflicts
    if (isSeeking) return

    if (videoRef.current) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time * 1000) // Convert to ms
    }
  }

  const handleSeeking = () => {
    setIsSeeking(true)
  }

  const handleSeeked = () => {
    setIsSeeking(false)
    // Update currentTime from the actual video position after seek completes
    if (videoRef.current) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time * 1000)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    onEnded?.()
  }

  const handlePlay = () => {
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  // Playback controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, ignore error
      })
    }
  }, [isPlaying])

  const handleSeek = useCallback((value: number[]) => {
    const time = value[0]
    if (!Number.isFinite(time)) return
    performSeek(time)
  }, [performSeek])

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return
    const vol = value[0]
    videoRef.current.volume = vol
    setVolume(vol)
    setIsMuted(vol === 0)
  }, [])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    const newMuted = !isMuted
    videoRef.current.muted = newMuted
    setIsMuted(newMuted)
  }, [isMuted])

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return
    videoRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (videoRef.current) {
            performSeek(videoRef.current.currentTime - 5)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (videoRef.current) {
            performSeek(videoRef.current.currentTime + 5)
          }
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [togglePlay, toggleFullscreen, toggleMute, performSeek])

  // Format time as MM:SS (handle NaN/Infinity gracefully)
  const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col bg-black rounded-lg overflow-hidden">
      {/* Video/Audio Element */}
      <div className={cn(
        'relative bg-black flex-shrink-0',
        isAudioOnly ? 'h-32' : 'aspect-video max-h-[50vh]'
      )}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        <video
          ref={videoRef}
          src={playbackUrl}
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={() => setIsLoading(false)}
          className={cn(
            'w-full',
            isAudioOnly ? 'h-0' : 'h-full',
          )}
          playsInline
          crossOrigin="anonymous"
        />

        {/* Audio waveform placeholder for audio-only */}
        {isAudioOnly && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 bg-primary rounded-full transition-all',
                    isPlaying ? 'animate-pulse' : ''
                  )}
                  style={{
                    // eslint-disable-next-line react-hooks/purity
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 p-4 bg-card flex-shrink-0">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono min-w-[45px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[Number.isFinite(currentTime) ? currentTime : 0]}
            max={Number.isFinite(duration) && duration > 0 ? duration : 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground font-mono min-w-[45px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              disabled={isLoading}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-1">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <Button
                  key={rate}
                  variant={playbackRate === rate ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => changePlaybackRate(rate)}
                  className="h-8 px-2 text-xs"
                >
                  {rate}x
                </Button>
              ))}
            </div>
          </div>

          {/* Fullscreen (video only) */}
          {!isAudioOnly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Space: Play/Pause • ←→: Skip 5s • F: Fullscreen • M: Mute
        </div>
      </div>
    </div>
  )
}
