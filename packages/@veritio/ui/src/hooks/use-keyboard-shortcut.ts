'use client'

import { useEffect, useCallback } from 'react'

interface UseKeyboardShortcutOptions {
  enabled: boolean
  onCmdEnter?: () => void
  onEscape?: () => void
  onEnter?: () => void
  deps?: React.DependencyList
}
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
[onCmdEnter, onEscape, onEnter, ...deps]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
