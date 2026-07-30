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

/** Date-only display for billing (e.g. "Mar 5, 2026"). */
export function formatBillingDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Scroll the nearest scrollable ancestor of `el` back to the top.
 *
 * The dashboard shell scrolls an inner container (`overflow-y-auto` inside a
 * `h-dvh overflow-hidden` wrapper), so `window.scrollTo` is a no-op on those
 * pages. Walk up to the real scroller and fall back to the window.
 */
export function scrollAncestorToTop(el: HTMLElement | null | undefined): void {
  const behavior: ScrollBehavior = 'smooth'

  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
    if (scrolls && node.scrollHeight > node.clientHeight) {
      node.scrollTo({ top: 0, behavior })
      return
    }
  }

  window.scrollTo({ top: 0, behavior })
}

/** Format a minor-unit (cents) amount + ISO currency code, e.g. (2500, "usd") -> "$25.00". */
export function formatCurrency(amountInCents: number | null | undefined, currency = 'usd'): string {
  const value = (amountInCents ?? 0) / 100
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}
