/**
 * Newest `created_at` in a row set, or null when there isn't one.
 *
 * Used to fingerprint a cached analytics payload alongside its row count:
 * count alone cannot distinguish "unchanged" from "one row deleted and one
 * added", which would serve stale metrics indefinitely.
 */
export function latestCreatedAt(
  rows: ReadonlyArray<{ created_at?: string | null } | Record<string, unknown>>
): string | null {
  let latest: string | null = null
  for (const row of rows) {
    const value = (row as { created_at?: unknown }).created_at
    if (typeof value !== 'string') continue
    if (latest === null || value > latest) latest = value
  }
  return latest
}
