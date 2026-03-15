'use client'

import { useCallback, useRef } from 'react'

/** Shuttle speeds for J/K/L control */
const SHUTTLE_SPEEDS = [0, 0.5, 1, 1.5, 2, 4, 8]

export interface UseShuttleControlOptions {
  onTogglePlay: () => void
  onSetPlaybackRate: (rate: number) => void
  isPlaying: boolean
  playbackRate: number
}

export function useShuttleControl({
  onTogglePlay,
  onSetPlaybackRate,
  isPlaying,
  playbackRate,
}: UseShuttleControlOptions) {
  const shuttleIndexRef = useRef(3) // Start at 1x speed

  const handleShuttle = useCallback(
    (direction: 'backward' | 'stop' | 'forward') => {
      if (direction === 'stop') {
        shuttleIndexRef.current = 3
        onSetPlaybackRate(1)
        if (isPlaying) {
          onTogglePlay()
        }
      } else if (direction === 'forward') {
        if (playbackRate < 0) {
          shuttleIndexRef.current = 3
          onSetPlaybackRate(1)
        } else {
          shuttleIndexRef.current = Math.min(
            shuttleIndexRef.current + 1,
            SHUTTLE_SPEEDS.length - 1
          )
          onSetPlaybackRate(SHUTTLE_SPEEDS[shuttleIndexRef.current])
        }
        if (!isPlaying) onTogglePlay()
      } else {
        if (playbackRate > 0) {
          shuttleIndexRef.current = 3
          onSetPlaybackRate(-1)
        } else {
          shuttleIndexRef.current = Math.min(
            shuttleIndexRef.current + 1,
            SHUTTLE_SPEEDS.length - 1
          )
          onSetPlaybackRate(-SHUTTLE_SPEEDS[shuttleIndexRef.current])
        }
        if (!isPlaying) onTogglePlay()
      }
    },
    [isPlaying, playbackRate, onTogglePlay, onSetPlaybackRate]
  )

  return { handleShuttle }
}
