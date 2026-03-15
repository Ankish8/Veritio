/**
 * Export Utilities
 *
 * Shared utility functions for file downloads and filename generation
 */

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
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
 * Create a filename with sanitized study title and timestamp
 */
export function createExportFilename(
  studyTitle: string,
  exportType: string,
  format: 'csv' | 'pdf'
): string {
  const sanitized = studyTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

  const timestamp = new Date().toISOString().split('T')[0]

  return `${sanitized}_${exportType}_${timestamp}.${format}`
}
