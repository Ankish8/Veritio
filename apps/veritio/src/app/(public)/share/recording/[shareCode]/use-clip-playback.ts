'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { MediaPlayerInstance } from '@vidstack/react'

interface Clip {
  id: string
  start_ms: number
  end_ms: number
  title: string
  description: string | null
}

interface UseClipPlaybackOptions {
  playerRef: React.RefObject<MediaPlayerInstance | null>
  activeClip: Clip | null
  currentTime: number
}

/**
 * Hook for managing clip playback with auto-stop and boundary enforcement.
 * Handles:
 * - Play/stop clip with auto-stop at end time
 * - Seek confirmation to prevent race conditions
 * - Boundary enforcement to restrict viewing to clip range
 */
export function useClipPlayback({
  playerRef,
  activeClip,
  currentTime,
}: UseClipPlaybackOptions) {
  const [isPlayingClip, setIsPlayingClip] = useState(false)
  const activeClipStartMsRef = useRef<number | null>(null)
  const activeClipEndMsRef = useRef<number | null>(null)
  const clipPlaybackConfirmedRef = useRef(false)

  // Play clip from start with auto-stop at end
  const handlePlayClip = useCallback(() => {
    if (!activeClip || !playerRef.current) return

    // Seek to clip start
    playerRef.current.currentTime = activeClip.start_ms / 1000

    // Set up auto-stop tracking
    activeClipStartMsRef.current = activeClip.start_ms
    activeClipEndMsRef.current = activeClip.end_ms
    clipPlaybackConfirmedRef.current = false
    setIsPlayingClip(true)

    // Start playback
    playerRef.current.play()
  }, [activeClip, playerRef])

  // Stop clip playback
  const handleStopClip = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause()
    }
    setIsPlayingClip(false)
    activeClipStartMsRef.current = null
    activeClipEndMsRef.current = null
    clipPlaybackConfirmedRef.current = false
  }, [playerRef])

  // Auto-start clip playback (for shared clip links)
  const autoStartClip = useCallback(() => {
    if (!activeClip || !playerRef.current) return

    playerRef.current.currentTime = activeClip.start_ms / 1000
    activeClipStartMsRef.current = activeClip.start_ms
    activeClipEndMsRef.current = activeClip.end_ms
    clipPlaybackConfirmedRef.current = false
    setIsPlayingClip(true)
    playerRef.current.play().catch(() => {
      // Browser may block autoplay - that's ok
    })
  }, [activeClip, playerRef])

  // Auto-stop when clip reaches its end
  useEffect(() => {
    const clipStartMs = activeClipStartMsRef.current
    const clipEndMs = activeClipEndMsRef.current
    if (isPlayingClip && clipStartMs !== null && clipEndMs !== null) {
      // Confirm playback when we see currentTime near the clip start
      if (!clipPlaybackConfirmedRef.current) {
        const isNearStart = currentTime >= clipStartMs - 100 && currentTime <= clipStartMs + 1000
        if (isNearStart) {
          clipPlaybackConfirmedRef.current = true
        }
      }
      // Only stop if playback is confirmed
      if (clipPlaybackConfirmedRef.current) {
        const hasReachedEnd = currentTime >= clipEndMs
        const isNotFarPastEnd = currentTime <= clipEndMs + 1000
        if (hasReachedEnd && isNotFarPastEnd) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          handleStopClip()
        }
      }
    }
  }, [currentTime, isPlayingClip, handleStopClip])

  // Enforce clip boundaries - restrict seeking to within the clip range
  useEffect(() => {
    if (!activeClip || !playerRef.current) return

    const clipStartSec = activeClip.start_ms / 1000
    const clipEndSec = activeClip.end_ms / 1000
    const currentSec = currentTime / 1000

    // If user seeks outside clip range, snap back to clip boundaries
    if (currentSec < clipStartSec - 0.5) {
      playerRef.current.currentTime = clipStartSec
    } else if (currentSec > clipEndSec + 0.5 && !isPlayingClip) {
      // Only snap back when not actively playing (to avoid interfering with auto-stop)
      playerRef.current.currentTime = clipStartSec
    }
  }, [currentTime, activeClip, isPlayingClip, playerRef])

  return {
    isPlayingClip,
    handlePlayClip,
    handleStopClip,
    autoStartClip,
  }
}
