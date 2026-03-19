
import type { ExportOptions } from './export-types'

export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function sanitizeFilename(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
}

export function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // Prefix formula characters to prevent injection attacks
  const formulaChars = ['=', '+', '-', '@', '\t', '\r']
  const needsFormulaPrefix = formulaChars.some(char => str.startsWith(char))

  // Check if value needs quoting
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || needsFormulaPrefix

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""')
    return needsFormulaPrefix ? `"'${escaped}"` : `"${escaped}"`
  }

  return str
}

/**
 * Returns a PDF color string based on a rate value and thresholds.
 * Thresholds define [good, warning] boundaries.
 * When `lowerIsBetter` is true (e.g. lostness), values below the good threshold are green.
 */
export function getRateColor(
  rate: number,
  thresholds: { good: number; warning: number },
  lowerIsBetter = false,
): string {
  const PDF_COLORS = {
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  }

  if (lowerIsBetter) {
    if (rate <= thresholds.good) return PDF_COLORS.success
    if (rate <= thresholds.warning) return PDF_COLORS.warning
    return PDF_COLORS.danger
  }

  if (rate >= thresholds.good) return PDF_COLORS.success
  if (rate >= thresholds.warning) return PDF_COLORS.warning
  return PDF_COLORS.danger
}

/** Shared html-to-image options for consistent PNG/SVG export */
export function getHtmlToImageOptions(options: Omit<ExportOptions, 'filename'>): {
  backgroundColor: string
  pixelRatio?: number
  skipFonts: boolean
  filter: (node: Node) => boolean
} {
  return {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    pixelRatio: options.pixelRatio ?? 2,
    skipFonts: true,
    filter: (node) => {
      if (node instanceof Element) {
        return !node.classList?.contains('animate-spin')
      }
      return true
    },
  }
}

export function createTimestampedFilename(prefix: string, ...segments: (string | null | undefined)[]): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedSegments = segments
    .filter((s): s is string => s != null)
    .map(sanitizeFilename)

  return [prefix, ...sanitizedSegments, timestamp].join('-')
}
