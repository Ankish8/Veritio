'use client'

import { useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn, formatDuration } from '@/lib/utils'

export interface FloatingControlsProps {
  visible: boolean
  duration: number
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  hasWebcam: boolean
  /** Callback to toggle play/pause - controls actual player */
  onTogglePlayback: () => void
  /** Callback to seek to a specific time in ms */
  onSeek: (timeMs: number) => void
  /** Callback to change playback rate */
  onPlaybackRateChange: (rate: number) => void
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2]

/**
 * Floating video controls that auto-hide when video is playing.
 *
 * Features:
 * - Play/Pause toggle
 * - Volume control with mute toggle
 * - Playback speed selector
 * - Skip forward/backward buttons
 * - Current time / duration display
 * - Fullscreen toggle
 */
export function FloatingControls({
  visible,
  duration,
  currentTime,
  isPlaying,
  playbackRate,
  hasWebcam: _hasWebcam,
  onTogglePlayback,
  onSeek,
  onPlaybackRateChange,
}: FloatingControlsProps) {
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  // Step forward/backward in ms
  const stepForward = (ms: number) => {
    const newTime = Math.min(currentTime + ms, duration)
    onSeek(newTime)
  }

  const stepBackward = (ms: number) => {
    const newTime = Math.max(currentTime - ms, 0)
    onSeek(newTime)
  }

  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0]
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const cyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate)
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length
    onPlaybackRateChange(PLAYBACK_RATES[nextIndex])
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      {/* Gradient overlay for better visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Controls container */}
      <div className="relative px-4 pb-4 pt-12">
        {/* Progress bar - mini version, full timeline is below */}
        <div className="mb-3 px-1">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          {/* Left: Play controls */}
          <div className="flex items-center gap-1">
            {/* Skip backward */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepBackward(5000)}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-full"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePlayback}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </Button>

            {/* Skip forward */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepForward(5000)}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-full"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-full"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              {/* Volume slider (appears on hover) */}
              <div
                className={cn(
                  'absolute left-full ml-1 flex items-center transition-all duration-200',
                  showVolumeSlider ? 'opacity-100 w-20' : 'opacity-0 w-0 overflow-hidden'
                )}
              >
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Time display */}
            <div className="text-xs text-white/80 font-medium tabular-nums ml-2">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>

          {/* Right: Speed and fullscreen */}
          <div className="flex items-center gap-1">
            {/* Playback speed */}
            <Button
              variant="ghost"
              size="sm"
              onClick={cyclePlaybackRate}
              className="h-8 px-2 text-white hover:bg-white/20 rounded-md text-xs font-medium"
            >
              {playbackRate}x
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Request fullscreen on the dialog content
                const dialog = document.querySelector('[role="dialog"]')
                if (dialog) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen()
                  } else {
                    dialog.requestFullscreen()
                  }
                }
              }}
              className="h-9 w-9 p-0 text-white hover:bg-white/20 rounded-full"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
