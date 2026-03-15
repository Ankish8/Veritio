'use client'

import { useState, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createElement } from 'react'

type SortDirection = 'asc' | 'desc'

interface UseTableSortOptions<TField extends string> {
  defaultField?: TField | null
  defaultDirection?: SortDirection
}

interface UseTableSortReturn<TField extends string> {
  sortField: TField | null
  sortDirection: SortDirection
  handleSort: (field: TField) => void
  getSortIcon: (field: TField) => React.ReactElement
  sortItems: <T>(items: T[], comparator: (a: T, b: T, field: TField) => number) => T[]
}

/**
 * Shared hook for sortable table columns.
 * Extracts the duplicated sort state + handleSort + getSortIcon pattern
 * used across 10+ visualization components.
 *
 * Sort cycle: null -> asc -> desc -> null
 */
export function useTableSort<TField extends string>(
  options: UseTableSortOptions<TField> = {}
): UseTableSortReturn<TField> {
  const { defaultField = null, defaultDirection = 'asc' } = options

  const [sortField, setSortField] = useState<TField | null>(defaultField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  const handleSort = useCallback((field: TField) => {
    setSortField(prev => {
      if (prev === field) {
        if (sortDirection === 'asc') {
          setSortDirection('desc')
          return field
        } else {
          setSortDirection('asc')
          return null
        }
      } else {
        setSortDirection('asc')
        return field
      }
    })
  }, [sortDirection])

  const getSortIcon = useCallback((field: TField): React.ReactElement => {
    if (sortField !== field) {
      return createElement(ArrowUpDown, { className: 'h-3 w-3 text-muted-foreground/50' })
    }
    return sortDirection === 'asc'
      ? createElement(ArrowUp, { className: 'h-3 w-3' })
      : createElement(ArrowDown, { className: 'h-3 w-3' })
  }, [sortField, sortDirection])

  const sortItems = useCallback(<T,>(
    items: T[],
    comparator: (a: T, b: T, field: TField) => number
  ): T[] => {
    if (!sortField) return items

    return [...items].sort((a, b) => {
      const comparison = comparator(a, b, sortField)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [sortField, sortDirection])

  return { sortField, sortDirection, handleSort, getSortIcon, sortItems }
}
