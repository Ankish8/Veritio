/**
 * Simple in-memory TTL cache for Composio API responses.
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() > entry.expiresAt
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined

  if (isExpired(entry)) {
    store.delete(key)
    return undefined
  }

  return entry.data as T
}

export function set<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function clear(): void {
  store.clear()
}
