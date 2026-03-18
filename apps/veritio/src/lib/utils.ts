import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export { stripPipingHtml, stripPipingSpansOnly, hasPipingHtml } from '@veritio/ui'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Format milliseconds as human-readable time
 */
export function formatTime(ms: number | null): string {
  if (!ms || ms <= 0) return '-'
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format milliseconds as mm:ss or hh:mm:ss for video timestamps
 */
export function formatDuration(ms: number): string {
  // Guard against NaN, Infinity, negative, or falsy values
  if (!Number.isFinite(ms) || ms < 0) return '0:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
