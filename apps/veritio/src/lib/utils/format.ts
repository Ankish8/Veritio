/**
 * Format utilities for displaying data in human-readable formats.
 */

/**
 * Format bytes to human-readable size (KB, MB, GB).
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5 MB")
 *
 * @example
 * ```ts
 * formatBytes(1024) // "1.0 KB"
 * formatBytes(1536000) // "1.5 MB"
 * formatBytes(1073741824, 2) // "1.00 GB"
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human-readable time.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1h 23m 45s" or "5m 30s")
 *
 * @example
 * ```ts
 * formatDuration(5000) // "5s"
 * formatDuration(330000) // "5m 30s"
 * formatDuration(5010000) // "1h 23m 30s"
 * ```
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
  }
  if (minutes % 60 > 0 || hours > 0) {
    parts.push(`${minutes % 60}m`)
  }
  if (seconds % 60 > 0 || parts.length === 0) {
    parts.push(`${seconds % 60}s`)
  }

  return parts.join(' ')
}

/**
 * Format a number as a percentage.
 *
 * @param value - Number between 0 and 1 (or 0-100 if isPercent is true)
 * @param decimals - Number of decimal places (default: 0)
 * @param isPercent - Whether input is already a percentage (default: false)
 * @returns Formatted percentage string
 *
 * @example
 * ```ts
 * formatPercent(0.856) // "86%"
 * formatPercent(0.856, 1) // "85.6%"
 * formatPercent(85.6, 1, true) // "85.6%"
 * ```
 */
export function formatPercent(value: number, decimals: number = 0, isPercent: boolean = false): string {
  const percent = isPercent ? value : value * 100
  return `${percent.toFixed(decimals)}%`
}
