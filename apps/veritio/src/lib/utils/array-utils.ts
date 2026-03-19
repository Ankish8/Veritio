/**
 * Create a Map from an array of items keyed by their `id` property.
 */
export function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return map
}

/**
 * Shallow equality check for two arrays using strict equality on elements.
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Count items grouped by a key derived from each item.
 */
export function countByKey<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, number> {
  const counts = {} as Record<K, number>
  for (const item of items) {
    const key = keyFn(item)
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}
