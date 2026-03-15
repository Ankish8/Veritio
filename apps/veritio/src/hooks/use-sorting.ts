'use client'

import { useState, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig<K extends string = string> {
  key: K
  direction: SortDirection
}

export interface UseSortingOptions<T, K extends string = string> {
  /** Initial sort configuration */
  initialSort?: SortConfig<K>
  /** Custom comparator functions for specific keys */
  comparators?: Partial<Record<K, (a: T, b: T) => number>>
  /** Key accessor for nested object paths (e.g., 'user.name') */
  getKeyValue?: (item: T, key: K) => unknown
}

/** Manages sortable table/list state with sort config, toggle, and sorted data. */
export function useSorting<T, K extends string = string>(
  data: T[],
  options: UseSortingOptions<T, K> = {}
) {
  const { initialSort, comparators, getKeyValue } = options

  const [sortConfig, setSortConfig] = useState<SortConfig<K> | null>(
    initialSort ?? null
  )

  const toggleSort = useCallback(
    (key: K) => {
      setSortConfig((current) => {
        if (current?.key === key) {
          // Toggle direction or clear if already desc
          if (current.direction === 'asc') {
            return { key, direction: 'desc' }
          }
          return null // Clear sort on third click
        }
        return { key, direction: 'asc' }
      })
    },
    []
  )

  const setSort = useCallback((key: K, direction: SortDirection) => {
    setSortConfig({ key, direction })
  }, [])

  const clearSort = useCallback(() => {
    setSortConfig(null)
  }, [])

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    const { key, direction } = sortConfig

    return [...data].sort((a, b) => {
      // Use custom comparator if provided
      const comparator = comparators?.[key]
      if (comparator) {
        const result = comparator(a, b)
        return direction === 'asc' ? result : -result
      }

      // Get values (supports nested paths via getKeyValue)
      const aValue = getKeyValue
        ? getKeyValue(a, key)
        : (a as Record<string, unknown>)[key]
      const bValue = getKeyValue
        ? getKeyValue(b, key)
        : (b as Record<string, unknown>)[key]

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return direction === 'asc' ? 1 : -1
      if (bValue == null) return direction === 'asc' ? -1 : 1

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue)
        return direction === 'asc' ? result : -result
      }

      // Number/Date comparison
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig, comparators, getKeyValue])

  const getSortDirection = useCallback(
    (key: K): SortDirection | null => {
      if (sortConfig?.key === key) {
        return sortConfig.direction
      }
      return null
    },
    [sortConfig]
  )

  const isSorted = useCallback(
    (key: K): boolean => {
      return sortConfig?.key === key
    },
    [sortConfig]
  )

  return {
    sortedData,
    sortConfig,
    toggleSort,
    setSort,
    clearSort,
    getSortDirection,
    isSorted,
  }
}
