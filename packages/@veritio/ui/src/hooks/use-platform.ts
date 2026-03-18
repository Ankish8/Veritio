'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect the user's platform for showing appropriate keyboard shortcuts.
 * Returns platform info for displaying correct modifier key symbols (⌘ vs Ctrl).
 */
export function usePlatform() {
  const [isMac, setIsMac] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Check if running on macOS
    setIsMac(
      typeof navigator !== 'undefined' &&
        navigator.platform.toLowerCase().includes('mac')
    )

    // Check if touch device
    setIsTouchDevice(
      typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    )
  }, [])

  const modifierSymbol = isMac ? '⌘' : 'Ctrl'

  return {
    isMac,
    isTouchDevice,
    modifierKey: modifierSymbol,
    modifierSymbol,
  }
}
