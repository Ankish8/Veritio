'use client'

import { useState, useMemo, useCallback } from 'react'

export interface UseTableSearchOptions<T> {
  /** Fields to search in. If not provided, searches all string fields. */
  searchFields?: (keyof T)[]
  /** Custom search function for complex matching */
  customMatch?: (item: T, query: string) => boolean
  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean
  /** Debounce delay in ms (default: 0 - no debounce, handle externally if needed) */
  initialQuery?: string
}

/** Filters data by search query across specified or all string fields. */
export function useTableSearch<T>(
  data: T[],
  options: UseTableSearchOptions<T> = {}
) {
  const {
    searchFields,
    customMatch,
    caseSensitive = false,
    initialQuery = '',
  } = options

  const [query, setQuery] = useState(initialQuery)

  const clearQuery = useCallback(() => setQuery(''), [])

  const filteredData = useMemo(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return data

    const searchQuery = caseSensitive
      ? trimmedQuery
      : trimmedQuery.toLowerCase()

    return data.filter((item) => {
      // Use custom matcher if provided
      if (customMatch) {
        return customMatch(item, searchQuery)
      }

      // Search in specified fields or all string fields
      const fieldsToSearch = searchFields ?? (Object.keys(item as object) as (keyof T)[])

      return fieldsToSearch.some((field) => {
        const value = item[field]
        if (value == null) return false

        const stringValue = String(value)
        const compareValue = caseSensitive
          ? stringValue
          : stringValue.toLowerCase()

        return compareValue.includes(searchQuery)
      })
    })
  }, [data, query, searchFields, customMatch, caseSensitive])

  const hasResults = filteredData.length > 0
  const isFiltered = query.trim().length > 0

  return {
    filteredData,
    query,
    setQuery,
    clearQuery,
    hasResults,
    isFiltered,
    resultCount: filteredData.length,
    totalCount: data.length,
  }
}
