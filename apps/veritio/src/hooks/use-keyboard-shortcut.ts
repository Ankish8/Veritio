'use client'

import { useEffect, useCallback } from 'react'

interface UseKeyboardShortcutOptions {
  /** Whether the keyboard listener should be active (typically modal open state) */
  enabled: boolean
  /** Callback for Cmd/Ctrl + Enter keypress */
  onCmdEnter?: () => void
  /** Callback for Escape keypress (optional - Radix dialogs handle this by default) */
  onEscape?: () => void
  /** Callback for plain Enter keypress */
  onEnter?: () => void
  /** Dependencies to include in the effect (for proper cleanup) */
  deps?: React.DependencyList
}

/** Handles keyboard shortcuts in modals and dialogs. */
export function useKeyboardShortcut({
  enabled,
  onCmdEnter,
  onEscape,
  onEnter,
  deps = [],
}: UseKeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onCmdEnter?.()
        return
      }

      // Plain Enter (only if no modifier keys)
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        // Only call if onEnter is provided and we're not in a textarea
        const target = e.target as HTMLElement
        if (onEnter && target.tagName !== 'TEXTAREA') {
          // Don't prevent default - let the event bubble for form submission
          onEnter()
          return
        }
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        onEscape?.()
        return
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCmdEnter, onEscape, onEnter, ...deps]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
