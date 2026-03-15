'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import {
  matchesKeyCombo,
  matchesKeySequence,
  isInputElement,
  isOverlayOpen,
  getBufferKey,
} from '@/lib/keyboard-shortcuts/utils'
import type { UseKeyboardHandlerOptions } from '@/lib/keyboard-shortcuts/types'

/** Global keyboard event handler that matches keypresses to registered shortcuts. */
export function useKeyboardHandler(options: UseKeyboardHandlerOptions = {}) {
  const { enabled = true, ignoreInputs = true } = options

  // Get store state and actions
  const sequenceBuffer = useKeyboardShortcutsStore((state) => state.sequenceBuffer)
  const addToSequence = useKeyboardShortcutsStore((state) => state.addToSequence)
  const clearSequence = useKeyboardShortcutsStore((state) => state.clearSequence)
  const getActiveShortcuts = useKeyboardShortcutsStore((state) => state.getActiveShortcuts)

  // Track if we're in a sequence
  const isInSequenceRef = useRef(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if disabled
      if (!enabled) return

      // Skip if focused on input element (unless overridden)
      if (ignoreInputs && isInputElement(e)) return

      // Skip if overlay is open (let it handle its own shortcuts)
      if (isOverlayOpen()) return

      // Get all currently active shortcuts
      const activeShortcuts = getActiveShortcuts()
      if (activeShortcuts.length === 0) return

      // Sort by priority (higher = checked first)
      const sortedShortcuts = [...activeShortcuts].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      )

      // Check for sequence shortcuts first
      const sequenceShortcuts = sortedShortcuts.filter(
        (s) => s.keys.length > 1
      )

      // Check for single-key shortcuts
      const singleShortcuts = sortedShortcuts.filter(
        (s) => s.keys.length === 1
      )

      // If we're in a sequence, check sequence completions first
      if (sequenceBuffer.length > 0) {
        for (const shortcut of sequenceShortcuts) {
          const { matches, isComplete } = matchesKeySequence(
            e,
            shortcut.keys,
            sequenceBuffer
          )

          if (matches) {
            if (isComplete) {
              // Sequence complete - execute handler
              e.preventDefault()
              clearSequence()
              isInSequenceRef.current = false
              shortcut.handler?.(e)
              return
            } else {
              // Partial match - add to buffer and continue
              e.preventDefault()
              addToSequence(getBufferKey(shortcut.keys[sequenceBuffer.length]))
              return
            }
          }
        }

        // No sequence match - clear buffer and check single shortcuts
        clearSequence()
        isInSequenceRef.current = false
      }

      // Check if this could start a sequence
      for (const shortcut of sequenceShortcuts) {
        const firstCombo = shortcut.keys[0]
        if (matchesKeyCombo(e, firstCombo)) {
          e.preventDefault()
          addToSequence(getBufferKey(firstCombo))
          isInSequenceRef.current = true
          return
        }
      }

      // Check single-key shortcuts
      for (const shortcut of singleShortcuts) {
        const combo = shortcut.keys[0]

        // Special case: ? key
        // The ? character requires Shift+/ on most keyboards
        // We check for the actual '?' character in e.key
        if (combo.length === 1 && combo[0] === '?') {
          if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault()
            shortcut.handler?.(e)
            return
          }
          continue
        }

        if (matchesKeyCombo(e, combo)) {
          // Only handle if there's actually a handler
          // Otherwise, let the event propagate to other listeners (e.g., sidebar.tsx)
          if (shortcut.handler) {
            e.preventDefault()
            shortcut.handler(e)
            return
          }
        }
      }
    },
    [
      enabled,
      ignoreInputs,
      sequenceBuffer,
      addToSequence,
      clearSequence,
      getActiveShortcuts,
    ]
  )

  // Set up global listener
  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Clear sequence on blur (user switched away)
  useEffect(() => {
    const handleBlur = () => {
      if (isInSequenceRef.current) {
        clearSequence()
        isInSequenceRef.current = false
      }
    }

    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('blur', handleBlur)
    }
  }, [clearSequence])
}
