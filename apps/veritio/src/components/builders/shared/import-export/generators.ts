import type { ImportableItem, ExportFormat } from './types'

export function generateCSV(items: ImportableItem[]): string {
  // Check if any items have images to decide format
  const hasImages = items.some((item) => item.imageUrl)

  return items
    .map((item) => {
      const label = item.label.includes(',') ? `"${item.label}"` : item.label
      const desc = item.description
        ? item.description.includes(',') ? `"${item.description}"` : item.description
        : ''

      if (hasImages) {
        // Include image URL column
        const imgUrl = item.imageUrl || ''
        return `${label},${desc},${imgUrl}`
      }

      // Legacy format without images
      if (item.description) {
        return `${label},${desc}`
      }
      return label
    })
    .join('\n')
}

export function generateJSON(items: ImportableItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      label: item.label,
      ...(item.description ? { description: item.description } : {}),
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    })),
    null,
    2
  )
}

export function generatePlainText(items: ImportableItem[]): string {
  return items.map((item) => item.label).join('\n')
}

export function generateByFormat(items: ImportableItem[], format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return generateCSV(items)
    case 'json':
      return generateJSON(items)
    case 'text':
      return generatePlainText(items)
    default:
      return ''
  }
}

export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'json'
    case 'csv':
      return 'csv'
    case 'text':
    default:
      return 'txt'
  }
}

export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json'
    default:
      return 'text/plain'
  }
}
