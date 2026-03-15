/**
 * CSV Formatting Utilities
 *
 * Extracted and enhanced CSV formatting functions for consistent
 * export behavior across all study types.
 */

/**
 * Format a 2D array as a CSV string with proper escaping
 */
export function formatCSV(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const cellStr = cell !== null && cell !== undefined ? String(cell) : ''

          // Escape quotes and wrap in quotes if contains special characters
          if (
            cellStr.includes(',') ||
            cellStr.includes('"') ||
            cellStr.includes('\n') ||
            cellStr.includes('\r')
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(',')
    )
    .join('\n')
}

/**
 * Trigger download of a CSV file in the browser
 */
export function downloadCSV(filename: string, content: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format a date value for CSV export
 */
export function formatDateForCSV(date: string | Date | null | undefined): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return ''

  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * Format a duration in milliseconds for CSV export
 */
export function formatDurationForCSV(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return ''

  const seconds = Math.round(ms / 1000)
  return seconds.toString()
}

/**
 * Format a percentage value for CSV export
 */
export function formatPercentForCSV(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a boolean value for CSV export
 */
export function formatBooleanForCSV(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value ? 'Yes' : 'No'
}

/**
 * Format an array value for CSV export (joins with semicolons)
 */
export function formatArrayForCSV(arr: unknown[] | null | undefined): string {
  if (!arr || !Array.isArray(arr)) return ''
  return arr.map(String).join('; ')
}

/**
 * Sanitize a string for use in filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

/**
 * Create a timestamped filename for exports
 */
export function createCSVFilename(
  studyTitle: string,
  exportType: string
): string {
  const sanitized = sanitizeFilename(studyTitle)
  const timestamp = new Date().toISOString().split('T')[0]
  return `${sanitized}_${exportType}_${timestamp}.csv`
}
