'use client'

import { useState, useMemo, useCallback } from 'react'

export interface PaginationOptions {
  defaultPageSize?: number
  initialPage?: number
}

export interface PaginationState<T> {
  // Paginated items for current page
  items: T[]

  // Current page (1-indexed)
  page: number

  // Items per page
  pageSize: number

  // Total number of pages
  totalPages: number

  // Total items count
  totalItems: number

  // Human-readable range string: "Showing 1 to 10 of 100"
  showingRange: {
    from: number
    to: number
    total: number
  }

  // Whether there are more pages
  hasNextPage: boolean
  hasPreviousPage: boolean

  // Actions
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
}
export function usePagination<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationState<T> {
  const { defaultPageSize = 50, initialPage = 1 } = options

  const [page, setPageState] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure page is within bounds
  const currentPage = Math.min(Math.max(1, page), totalPages)

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, pageSize])

  // Calculate showing range
  const showingRange = useMemo(() => {
    if (totalItems === 0) {
      return { from: 0, to: 0, total: 0 }
    }
    const from = (currentPage - 1) * pageSize + 1
    const to = Math.min(currentPage * pageSize, totalItems)
    return { from, to, total: totalItems }
  }, [currentPage, pageSize, totalItems])

  // Navigation flags
  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  // Actions
  const setPage = useCallback((newPage: number) => {
    const clampedPage = Math.min(Math.max(1, newPage), totalPages)
    setPageState(clampedPage)
  }, [totalPages])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    // Reset to page 1 when changing page size to avoid being on an invalid page
    setPageState(1)
  }, [])

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPageState(prev => prev + 1)
    }
  }, [hasNextPage])

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPageState(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const firstPage = useCallback(() => {
    setPageState(1)
  }, [])

  const lastPage = useCallback(() => {
    setPageState(totalPages)
  }, [totalPages])

  return {
    items: paginatedItems,
    page: currentPage,
    pageSize,
    totalPages,
    totalItems,
    showingRange,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
  }
}
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]
