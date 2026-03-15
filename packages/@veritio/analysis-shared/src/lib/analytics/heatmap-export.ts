export async function exportElementToPNG(
  element: HTMLElement,
  filename: string
): Promise<void> {
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

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)

  // Prefix formula characters to prevent CSV injection
  const formulaChars = ['=', '+', '-', '@', '\t', '\r']
  const needsFormulaPrefix = formulaChars.some(char => str.startsWith(char))

  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || needsFormulaPrefix

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""')
    return needsFormulaPrefix ? `"'${escaped}"` : `"${escaped}"`
  }

  return str
}

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
