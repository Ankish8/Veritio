'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_HEATMAP_SETTINGS, type HeatmapSettings } from '@/types/analytics'

const STORAGE_KEY = 'heatmap-settings'

/** Hook to persist heatmap visualization settings to localStorage. SSR-safe with hydration. */
export function useHeatmapSettings() {
  const [settings, setSettingsState] = useState<HeatmapSettings>(DEFAULT_HEATMAP_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<HeatmapSettings>
        // Merge with defaults to handle new settings added in future versions
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettingsState({ ...DEFAULT_HEATMAP_SETTINGS, ...parsed })
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, etc.)
    }
    setIsHydrated(true)
  }, [])

  // Save preferences to localStorage on change (after hydration)
  const setSettings = useCallback((updates: Partial<HeatmapSettings>) => {
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
    setSettingsState(DEFAULT_HEATMAP_SETTINGS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore errors
    }
  }, [])

  // Return defaults during SSR to avoid hydration mismatch
  return {
    settings: isHydrated ? settings : DEFAULT_HEATMAP_SETTINGS,
    setSettings,
    resetSettings,
    isHydrated,
  }
}

export function clearHeatmapSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}
