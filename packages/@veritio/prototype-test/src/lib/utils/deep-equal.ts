/**
 * Deep equality comparison utilities for snapshot-based dirty detection.
 * Used by Zustand stores to compute isDirty by comparing current state to last-saved snapshot.
 */
export function deepEqual<T>(a: T, b: T): boolean {
  // Fast path for identical references
  if (a === b) return true

  // Handle null/undefined
  if (a == null || b == null) return a === b

  // For objects/arrays, use JSON comparison
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  // Primitives that aren't equal
  return false
}
export function createSnapshot<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}
