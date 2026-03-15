/**
 * Tests for pagination helpers
 */
import { describe, it, expect } from 'vitest'
import {
  createPaginatedResponse,
  encodeCursor,
  decodeCursor,
  isValidCursor,
  getNextPageParams,
} from '../helpers'

describe('Pagination Helpers', () => {
  const mockItems = [
    { id: '1', created_at: '2024-01-03T10:00:00Z', title: 'Item 3' },
    { id: '2', created_at: '2024-01-02T10:00:00Z', title: 'Item 2' },
    { id: '3', created_at: '2024-01-01T10:00:00Z', title: 'Item 1' },
  ]

  describe('createPaginatedResponse', () => {
    it('should return all items when count is less than limit', () => {
      const response = createPaginatedResponse(mockItems.slice(0, 2), 50)

      expect(response.data).toHaveLength(2)
      expect(response.pagination.hasMore).toBe(false)
      expect(response.pagination.nextCursor).toBeNull()
    })

    it('should mark hasMore when items exceed limit', () => {
      // Pass limit+1 items to simulate "checking for more"
      const allItems = [...mockItems, { id: '4', created_at: '2023-12-31T10:00:00Z', title: 'Item 4' }]
      const response = createPaginatedResponse(allItems, 3)

      expect(response.data).toHaveLength(3)
      expect(response.pagination.hasMore).toBe(true)
      expect(response.pagination.nextCursor).toBe('2024-01-01T10:00:00Z')
    })

    it('should include total count when provided', () => {
      const response = createPaginatedResponse(mockItems, 50, 100)

      expect(response.pagination.total).toBe(100)
    })
  })

  describe('Cursor Encoding', () => {
    const testCursor = '2024-01-01T10:00:00Z'

    it('should encode and decode cursor', () => {
      const encoded = encodeCursor(testCursor)
      const decoded = decodeCursor(encoded)

      expect(decoded).toBe(testCursor)
    })

    it('should handle invalid cursor decode gracefully', () => {
      // Buffer.from doesn't throw for most strings, so test with truly invalid input
      const decoded = decodeCursor('')
      expect(decoded).toBe('')
    })
  })

  describe('Cursor Validation', () => {
    it('should validate valid ISO date cursor', () => {
      const cursor = '2024-01-01T10:00:00.000Z'
      expect(isValidCursor(cursor)).toBe(true)
    })

    it('should reject non-string cursor', () => {
      expect(isValidCursor(123)).toBe(false)
      expect(isValidCursor(null)).toBe(false)
      expect(isValidCursor(undefined)).toBe(false)
    })

    it('should reject invalid date string', () => {
      expect(isValidCursor('not-a-date')).toBe(false)
      expect(isValidCursor('2024-13-45T10:00:00Z')).toBe(false)
    })
  })

  describe('getNextPageParams', () => {
    it('should return null when no more pages', () => {
      const response = createPaginatedResponse(mockItems.slice(0, 2), 50)
      const params = getNextPageParams(response, 50)

      expect(params).toBeNull()
    })

    it('should return next page params when hasMore', () => {
      const allItems = [...mockItems, { id: '4', created_at: '2023-12-31T10:00:00Z', title: 'Item 4' }]
      const response = createPaginatedResponse(allItems, 3)
      const params = getNextPageParams(response, 3)

      expect(params).not.toBeNull()
      expect(params?.cursor).toBe('2024-01-01T10:00:00Z')
      expect(params?.limit).toBe(3)
    })
  })
})
