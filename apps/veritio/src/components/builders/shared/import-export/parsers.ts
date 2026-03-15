import type { ImportableItem, ImportFormat, ParseResult } from './types'

export function parseCSV(text: string): ImportableItem[] {
  const lines = text.split('\n').filter((line) => line.trim())
  const items: ImportableItem[] = []

  for (const line of lines) {
    // Parse CSV supporting: label,description,imageUrl
    // Handle commas within quoted fields
    const parts = parseCSVLine(line)

    if (parts.length === 0 || !parts[0]) continue

    const label = parts[0].trim()
    const description = parts[1]?.trim() || null
    const imageUrl = parts[2]?.trim() || null

    items.push({
      label,
      description,
      imageUrl,
    })
  }

  return items.filter((item) => item.label) // Remove empty labels
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        // Escaped quote
        current += char
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

export function parseJSON(text: string): ImportableItem[] {
  // Let JSON.parse throw on invalid syntax for proper error handling
  const data = JSON.parse(text)

  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array')
  }

  const items = data.map((item) => {
    if (typeof item === 'string') {
      return { label: item }
    }
    if (typeof item === 'object' && item !== null) {
      return {
        label: item.label || item.name || item.title || '',
        description: item.description || null,
        imageUrl: item.imageUrl || item.image_url || item.image || null,
      }
    }
    return { label: '' }
  }).filter((item) => item.label)

  if (items.length === 0) {
    throw new Error('No valid items found. Each object needs a "label" field.')
  }

  return items
}

export function parsePlainText(text: string): ImportableItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)
    .map((label) => ({ label }))
}

export function findDuplicateLabels(items: ImportableItem[]): string[] {
  const labelCounts = new Map<string, number>()

  for (const item of items) {
    const lower = item.label.toLowerCase()
    labelCounts.set(lower, (labelCounts.get(lower) || 0) + 1)
  }

  return Array.from(labelCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([label]) => label)
}

export function parseByFormat(text: string, format: ImportFormat): ImportableItem[] {
  switch (format) {
    case 'csv':
      return parseCSV(text)
    case 'json':
      return parseJSON(text)
    case 'text':
      return parsePlainText(text)
    default:
      return []
  }
}

export function parseImportText(text: string, format: ImportFormat): ParseResult {
  if (!text.trim()) {
    return { items: [], error: null, duplicates: [] }
  }

  try {
    const items = parseByFormat(text, format)
    const duplicates = findDuplicateLabels(items)
    return { items, error: null, duplicates }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to parse input'
    return { items: [], error: message, duplicates: [] }
  }
}
