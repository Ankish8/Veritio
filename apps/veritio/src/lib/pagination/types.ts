/**
 * Pagination types and interfaces
 * Supports cursor-based pagination for scalability
 */

export interface PaginationParams {
  /** ISO timestamp cursor from previous response (for pagination) */
  cursor?: string
  /** Number of items to return (1-100, default: 50) */
  limit?: number
}

export interface PaginatedResponse<T> {
  /** Array of items in current page */
  data: T[]
  /** Pagination metadata */
  pagination: {
    /** Cursor to use for next page (null if no more pages) */
    nextCursor: string | null
    /** Whether more items are available */
    hasMore: boolean
    /** Total count (optional, may not be included for performance) */
    total?: number
  }
}

export interface ListOptions extends PaginationParams {
  /** Field to sort by */
  sortBy?: string
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100
export const MIN_PAGE_SIZE = 1

export function validatePageSize(limit?: number): number {
  if (!limit) return DEFAULT_PAGE_SIZE
  if (limit < MIN_PAGE_SIZE) return MIN_PAGE_SIZE
  if (limit > MAX_PAGE_SIZE) return MAX_PAGE_SIZE
  return limit
}
