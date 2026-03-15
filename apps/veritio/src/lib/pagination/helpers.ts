/**
 * Pagination helper utilities
 * Functions for working with cursor-based pagination
 */

import type { PaginatedResponse } from './types'

/**
 * Create a paginated response from data array
 * Assumes data is sorted by created_at descending (most recent first)
 */
export function createPaginatedResponse<T extends { created_at: string }>(
  data: T[],
  limit: number,
  includeTotal?: number
): PaginatedResponse<T> {
  // Check if we have more items than requested
  // We fetch limit+1 to know if hasMore
  const hasMore = data.length > limit
  const items = hasMore ? data.slice(0, limit) : data

  // Use the last item's created_at as the cursor for next page
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.created_at : null

  return {
    data: items,
    pagination: {
      nextCursor,
      hasMore,
      ...(includeTotal !== undefined && { total: includeTotal }),
    },
  }
}

/**
 * Encode cursor for URL safety
 */
export function encodeCursor(cursor: string): string {
  return Buffer.from(cursor).toString('base64')
}

/**
 * Decode cursor from URL
 */
export function decodeCursor(encodedCursor: string): string {
  try {
    return Buffer.from(encodedCursor, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

/**
 * Check if cursor is valid (ISO date string)
 */
export function isValidCursor(cursor: unknown): cursor is string {
  if (typeof cursor !== 'string') return false
  // Check if it's a valid ISO date string
  const date = new Date(cursor)
  return !isNaN(date.getTime()) && cursor === date.toISOString()
}

/**
 * Get query parameters for next page
 */
export function getNextPageParams<T extends { created_at: string }>(
  response: PaginatedResponse<T>,
  currentLimit: number
) {
  if (!response.pagination.hasMore) {
    return null
  }

  return {
    cursor: response.pagination.nextCursor,
    limit: currentLimit,
  }
}
