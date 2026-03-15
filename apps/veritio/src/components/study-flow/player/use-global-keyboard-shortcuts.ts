'use client'

import { useEffect, useCallback } from 'react'

interface UseGlobalKeyboardShortcutsOptions {
  onEnter?: () => void
  onEscape?: () => void
  enabled?: boolean
}

function isInteractiveElementFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  const role = activeElement.getAttribute('role')

  // Textarea - multi-line, Enter creates new line
  if (tagName === 'textarea') return true

  // Native select elements handle their own keyboard navigation
  if (tagName === 'select') return true

  // Buttons handle Enter themselves
  if (tagName === 'button') return true

  // Check for Radix UI Select/Combobox triggers when open
  if (
    activeElement.hasAttribute('data-state') &&
    activeElement.getAttribute('data-state') === 'open'
  ) {
    return true
  }

  // Check for elements with combobox/listbox roles (custom dropdowns)
  if (role === 'combobox' || role === 'listbox' || role === 'option') {
    return true
  }

  // Check if there's an open popover/dropdown in the DOM
  // This catches Radix Select dropdowns that are open
  const openPopover = document.querySelector('[data-state="open"][role="listbox"]')
  const openSelect = document.querySelector('[data-radix-select-viewport]')
  const openCombobox = document.querySelector('[data-radix-combobox-content]')
  if (openPopover || openSelect || openCombobox) {
    return true
  }

  return false
}

export function useGlobalKeyboardShortcuts({
  onEnter,
  onEscape,
  enabled = true,
}: UseGlobalKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Skip if modifier keys are pressed (allows cmd+enter, ctrl+enter for other actions)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Skip if an interactive element is handling its own keyboard events
      if (isInteractiveElementFocused()) return

      // Enter key - proceed to next
      if (e.key === 'Enter' && !e.shiftKey && onEnter) {
        e.preventDefault()
        onEnter()
        return
      }

      // Escape key - go back
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }
    },
    [enabled, onEnter, onEscape]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
