'use client'

import { useEffect } from 'react'

/**
 * Forces light mode for participant pages by removing the `.dark` class
 * from <html>. Restores it on unmount if it was previously set.
 *
 * Participant-facing pages must always render in light mode regardless
 * of the user's system/app theme preference.
 */
export function ForceLight() {
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => {
      if (wasDark) html.classList.add('dark')
    }
  }, [])
  return null
}
