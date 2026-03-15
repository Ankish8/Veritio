'use client'

import { useEffect, useCallback } from 'react'
import type { MediaPlayerInstance } from '@vidstack/react'

interface UseKeyboardShortcutsProps {
  /** Player ref for playback control */
  playerRef: React.RefObject<MediaPlayerInstance | null>
  /** Current time in milliseconds (for seeking) */
  currentTime: number
  /** Duration in milliseconds */
  duration: number
  /** Callback to set in-point for clip creation (uses store's currentTime) */
  onSetInPoint?: () => void
  /** Callback to set out-point for clip creation (uses store's currentTime) */
  onSetOutPoint?: () => void
  /** Callback to clear clip selection (Escape key) */
  onClearSelection?: () => void
  /** Whether the dialog is open/focused */
  enabled?: boolean
}

/**
 * Keyboard shortcuts for video editor.
 *
 * Shortcuts:
 * - Space: Play/Pause
 * - K: Pause (matches YouTube/NLE convention)
 * - J: Rewind / slow down
 * - L: Fast forward / speed up
 * - I: Set in-point (clip start)
 * - O: Set out-point (clip end)
 * - ← (Left Arrow): Step back 1 second
 * - → (Right Arrow): Step forward 1 second
 * - Shift + ← : Step back 5 seconds
 * - Shift + → : Step forward 5 seconds
 * - Home: Go to beginning
 * - End: Go to end
 * - Escape: Clear clip selection
 */
export function useKeyboardShortcuts({
  playerRef,
  currentTime,
  duration,
  onSetInPoint,
  onSetOutPoint,
  onClearSelection,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  // Playback rates for J/L shuttle
  const SHUTTLE_RATES = [0.5, 1, 1.5, 2]

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      const player = playerRef.current
      if (!player) return

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      switch (e.key) {
        // Play/Pause
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault()
          if (e.key === ' ' || e.key.toLowerCase() === 'k') {
            if (player.paused) {
              player.play()
            } else {
              player.pause()
            }
          }
          break

        // Rewind / Slow down (J)
        case 'j':
        case 'J':
          e.preventDefault()
          if (player.paused) {
            // If paused, step back
            player.currentTime = Math.max(0, player.currentTime - 1)
          } else {
            // Slow down or reverse direction
            const currentRate = player.playbackRate
            const currentIndex = SHUTTLE_RATES.indexOf(currentRate)
            if (currentIndex > 0) {
              player.playbackRate = SHUTTLE_RATES[currentIndex - 1]
            } else {
              player.pause()
            }
          }
          break

        // Fast forward / Speed up (L)
        case 'l':
        case 'L':
          e.preventDefault()
          if (player.paused) {
            // If paused, play at normal speed
            player.play()
          } else {
            // Speed up
            const currentRate = player.playbackRate
            const currentIndex = SHUTTLE_RATES.indexOf(currentRate)
            if (currentIndex < SHUTTLE_RATES.length - 1) {
              player.playbackRate = SHUTTLE_RATES[currentIndex + 1]
            }
          }
          break

        // Set in-point (I)
        case 'i':
        case 'I':
          e.preventDefault()
          onSetInPoint?.()
          break

        // Set out-point (O)
        case 'o':
        case 'O':
          e.preventDefault()
          onSetOutPoint?.()
          break

        // Step backward
        case 'ArrowLeft':
          e.preventDefault()
          const stepBackAmount = e.shiftKey ? 5 : 1
          player.currentTime = Math.max(0, player.currentTime - stepBackAmount)
          break

        // Step forward
        case 'ArrowRight':
          e.preventDefault()
          const stepForwardAmount = e.shiftKey ? 5 : 1
          player.currentTime = Math.min(
            duration / 1000,
            player.currentTime + stepForwardAmount
          )
          break

        // Go to beginning
        case 'Home':
          e.preventDefault()
          player.currentTime = 0
          break

        // Go to end
        case 'End':
          e.preventDefault()
          player.currentTime = duration / 1000
          break

        // Clear clip selection
        case 'Escape':
          e.preventDefault()
          onClearSelection?.()
          break

        default:
          break
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, playerRef, currentTime, duration, onSetInPoint, onSetOutPoint, onClearSelection]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
