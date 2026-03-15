/**
 * Heatmap export utilities for downloading click maps as PNG images.
 */

/**
 * Export an HTML element (containing heatmap) to PNG and trigger download.
 * Uses html-to-image which handles modern CSS color functions (oklch, lab) better.
 *
 * @param element - The DOM element to capture (should contain the heatmap overlay)
 * @param filename - Name for the downloaded file (without extension)
 */
export async function exportElementToPNG(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // Dynamically import html-to-image to avoid bundle bloat
  const { toPng } = await import('html-to-image')

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2, // Higher resolution for better quality
      skipFonts: true, // Skip font loading issues
      filter: (node) => {
        // Skip elements that might cause issues
        if (node instanceof Element) {
          return !node.classList?.contains('animate-spin')
        }
        return true
      },
    })

    // Trigger download
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${filename}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('[exportElementToPNG] Error:', error)
    throw error
  }
}

/**
 * Generate a filename for the heatmap export.
 *
 * @param frameName - Name of the frame/screen
 * @param taskTitle - Optional task title
 * @returns Formatted filename
 */
export function generateHeatmapFilename(
  frameName: string,
  taskTitle?: string
): string {
  const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const sanitizedFrame = frameName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const sanitizedTask = taskTitle
    ? taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    : null

  if (sanitizedTask) {
    return `clickmap-${sanitizedTask}-${sanitizedFrame}-${timestamp}`
  }
  return `clickmap-${sanitizedFrame}-${timestamp}`
}

/**
 * Escape a value for safe CSV output.
 * Prevents formula injection and handles special characters.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // Prefix formula characters to prevent injection attacks in spreadsheet apps
  const formulaChars = ['=', '+', '-', '@', '\t', '\r']
  const needsFormulaPrefix = formulaChars.some(char => str.startsWith(char))

  // Check if value needs quoting (contains comma, quote, newline, or formula prefix)
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || needsFormulaPrefix

  if (needsQuoting) {
    // Escape double quotes by doubling them, wrap in quotes
    const escaped = str.replace(/"/g, '""')
    // Add single quote prefix for formula characters (Excel-safe)
    return needsFormulaPrefix ? `"'${escaped}"` : `"${escaped}"`
  }

  return str
}

/**
 * Export heatmap data as CSV for external analysis.
 *
 * @param clicks - Array of click events
 * @param filename - Name for the downloaded file
 */
export function exportClicksToCSV(
  clicks: Array<{
    x: number
    y: number
    normalizedX: number
    normalizedY: number
    timestamp: string
    wasHotspot: boolean
    participantId?: string
  }>,
  filename: string
): void {
  const headers = ['x', 'y', 'normalized_x', 'normalized_y', 'timestamp', 'was_hotspot', 'participant_id']
  const rows = clicks.map(click => [
    escapeCsvValue(click.x),
    escapeCsvValue(click.y),
    escapeCsvValue(click.normalizedX),
    escapeCsvValue(click.normalizedY),
    escapeCsvValue(click.timestamp),
    escapeCsvValue(click.wasHotspot),
    escapeCsvValue(click.participantId),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
