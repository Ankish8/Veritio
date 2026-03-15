'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_SELECTION_SETTINGS, type SelectionSettings } from '../types/analytics'

const STORAGE_KEY = 'selection-settings'
export function useSelectionSettings() {
  const [settings, setSettingsState] = useState<SelectionSettings>(DEFAULT_SELECTION_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SelectionSettings>
        // Merge with defaults to handle new settings added in future versions
        setSettingsState({ ...DEFAULT_SELECTION_SETTINGS, ...parsed })
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, etc.)
    }
    setIsHydrated(true)
  }, [])

  // Save preferences to localStorage on change (after hydration)
  const setSettings = useCallback((updates: Partial<SelectionSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates }

      // Enforce mutual exclusivity of hit/miss filters
      if (updates.showHitsOnly && next.showMissesOnly) {
        next.showMissesOnly = false
      } else if (updates.showMissesOnly && next.showHitsOnly) {
        next.showHitsOnly = false
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore localStorage errors
      }

      return next
    })
  }, [])

  // Reset to defaults and clear localStorage
  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SELECTION_SETTINGS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors
    }
  }, [])

  // Return defaults during SSR to avoid hydration mismatch
  return {
    settings: isHydrated ? settings : DEFAULT_SELECTION_SETTINGS,
    setSettings,
    resetSettings,
    isHydrated,
  }
}
export function clearSelectionSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}
