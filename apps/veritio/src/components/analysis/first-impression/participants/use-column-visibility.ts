'use client'

/**
 * useColumnVisibility Hook
 *
 * Manages column visibility state for First Impression participants table.
 * Persists preferences to localStorage per-study with SSR-safe hydration.
 *
 * Follows the same pattern as usePersistedResultsState.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  type FirstImpressionColumnId,
  DEFAULT_VISIBLE_COLUMNS,
  ALL_COLUMNS,
} from './column-definitions'

const STORAGE_KEY_PREFIX = 'fi-columns-'

interface UseColumnVisibilityReturn {
  /** Currently visible column IDs */
  visibleColumns: Set<FirstImpressionColumnId>
  /** Update visible columns */
  setVisibleColumns: (columns: Set<FirstImpressionColumnId>) => void
  /** Toggle a single column's visibility */
  toggleColumn: (columnId: FirstImpressionColumnId) => void
  /** Reset to default visible columns */
  resetToDefaults: () => void
  /** Whether the component has hydrated from localStorage */
  isHydrated: boolean
  /** Count of visible columns */
  visibleCount: number
  /** Whether using default visibility */
  isDefaultVisibility: boolean
}

/**
 * Hook to manage and persist column visibility preferences per-study.
 *
 * @param studyId - Unique study ID for per-study storage
 * @returns Object with visibility state and control methods
 *
 * @example
 * ```tsx
 * const { visibleColumns, toggleColumn, resetToDefaults } = useColumnVisibility(studyId)
 *
 * // Filter columns for rendering
 * const activeColumns = COLUMN_DEFINITIONS.filter(c => visibleColumns.has(c.id))
 *
 * // Toggle column in dropdown
 * <DropdownMenuCheckboxItem
 *   checked={visibleColumns.has('device')}
 *   onCheckedChange={() => toggleColumn('device')}
 * >
 *   Device
 * </DropdownMenuCheckboxItem>
 * ```
 */
export function useColumnVisibility(studyId: string): UseColumnVisibilityReturn {
  const [visibleColumns, setVisibleColumnsState] = useState<Set<FirstImpressionColumnId>>(
    () => new Set(DEFAULT_VISIBLE_COLUMNS)
  )
  const [isHydrated, setIsHydrated] = useState(false)
  const storageKey = `${STORAGE_KEY_PREFIX}${studyId}`

  // Load from localStorage on mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as FirstImpressionColumnId[]
        // Validate that stored IDs are valid column IDs
        const validIds = parsed.filter(id => ALL_COLUMNS.includes(id))
        if (validIds.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setVisibleColumnsState(new Set(validIds))
        }
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, quota exceeded)
    }
    setIsHydrated(true)
  }, [storageKey])

  // Helper to persist to localStorage
  const persist = useCallback((columns: Set<FirstImpressionColumnId>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...columns]))
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey])

  // Set visible columns and persist
  const setVisibleColumns = useCallback((columns: Set<FirstImpressionColumnId>) => {
    // Ensure 'participant' column is always visible
    const withParticipant = new Set(columns)
    withParticipant.add('participant')

    setVisibleColumnsState(withParticipant)
    persist(withParticipant)
  }, [persist])

  // Toggle single column visibility
  const toggleColumn = useCallback((columnId: FirstImpressionColumnId) => {
    // Never allow hiding participant column
    if (columnId === 'participant') return

    setVisibleColumnsState(prev => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      persist(next)
      return next
    })
  }, [persist])

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = new Set(DEFAULT_VISIBLE_COLUMNS)
    setVisibleColumnsState(defaults)
    persist(defaults)
  }, [persist])

  // Check if current visibility matches defaults
  const isDefaultVisibility = (() => {
    if (visibleColumns.size !== DEFAULT_VISIBLE_COLUMNS.length) return false
    return DEFAULT_VISIBLE_COLUMNS.every(id => visibleColumns.has(id))
  })()

  // Return defaults during SSR to prevent hydration mismatch
  return {
    visibleColumns: isHydrated ? visibleColumns : new Set(DEFAULT_VISIBLE_COLUMNS),
    setVisibleColumns,
    toggleColumn,
    resetToDefaults,
    isHydrated,
    visibleCount: isHydrated ? visibleColumns.size : DEFAULT_VISIBLE_COLUMNS.length,
    isDefaultVisibility,
  }
}

/**
 * Clear stored column visibility for a specific study (utility function)
 */
export function clearColumnVisibility(studyId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${studyId}`)
  } catch {
    // Ignore errors
  }
}
