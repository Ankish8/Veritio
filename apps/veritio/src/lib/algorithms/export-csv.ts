/**
 * CSV Export Utilities for Card Sort Results
 */

interface Card {
  id: string
  label: string
}

interface Category {
  id: string
  label: string
}

interface Response {
  participant_id: string
  card_placements: Record<string, string>
  custom_categories: Array<{ id: string; label: string }> | null
  total_time_ms: number | null
  created_at: string
}

interface Participant {
  id: string
  status: string
  started_at: string
  completed_at: string | null
}

/**
 * Export raw response data to CSV
 */
export function exportRawResponses(
  studyTitle: string,
  cards: Card[],
  categories: Category[],
  responses: Response[],
  participants: Participant[]
): string {
  // Create participant lookup
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Build header row
  const headers = [
    'Participant ID',
    'Status',
    'Started At',
    'Completed At',
    'Duration (seconds)',
    ...cards.map((c) => c.label),
  ]

  // Build data rows
  const rows = responses.map((response) => {
    const participant = participantMap.get(response.participant_id)
    const durationSec = response.total_time_ms
      ? Math.round(response.total_time_ms / 1000)
      : ''

    const cardCategories = cards.map((card) => {
      return response.card_placements[card.id] || ''
    })

    return [
      response.participant_id,
      participant?.status || '',
      participant?.started_at || '',
      participant?.completed_at || '',
      durationSec.toString(),
      ...cardCategories,
    ]
  })

  return formatCSV([headers, ...rows])
}

/**
 * Export similarity matrix to CSV
 */
export function exportSimilarityMatrix(
  studyTitle: string,
  cardLabels: string[],
  matrix: number[][]
): string {
  const headers = ['', ...cardLabels]

  const rows = matrix.map((row, idx) => [
    cardLabels[idx],
    ...row.map((val) => val.toString()),
  ])

  return formatCSV([headers, ...rows])
}

/**
 * Export category agreement to CSV
 */
export function exportCategoryAgreement(
  studyTitle: string,
  agreement: Record<string, {
    cardLabel: string
    categories: { name: string; count: number; percentage: number }[]
  }>
): string {
  const rows: string[][] = [
    ['Card', 'Category', 'Count', 'Percentage'],
  ]

  for (const [, card] of Object.entries(agreement)) {
    for (const cat of card.categories) {
      rows.push([
        card.cardLabel,
        cat.name,
        cat.count.toString(),
        `${cat.percentage}%`,
      ])
    }
  }

  return formatCSV(rows)
}

/**
 * Export cluster assignments to CSV
 */
export function exportClusters(
  studyTitle: string,
  clusters: string[][]
): string {
  const maxSize = Math.max(...clusters.map((c) => c.length))

  const headers = clusters.map((_, idx) => `Cluster ${idx + 1}`)

  const rows: string[][] = [headers]

  for (let i = 0; i < maxSize; i++) {
    const row = clusters.map((cluster) => cluster[i] || '')
    rows.push(row)
  }

  return formatCSV(rows)
}

/**
 * Format array of arrays as CSV string
 */
function formatCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if needed
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        })
        .join(',')
    )
    .join('\n')
}

/**
 * Trigger download of CSV file
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// Enhanced Export Functions (Phase 7)
// ============================================================================

interface CategoryStandardization {
  standardized_name: string
  original_names: string[]
}

/**
 * Export raw responses filtered by participant IDs
 * Used when segmentation filters are active
 */
export function exportFilteredRawResponses(
  studyTitle: string,
  cards: Card[],
  categories: Category[],
  responses: Response[],
  participants: Participant[],
  filteredParticipantIds?: Set<string>
): string {
  // Filter responses if filter set is provided
  const filteredResponses = filteredParticipantIds
    ? responses.filter(r => filteredParticipantIds.has(r.participant_id))
    : responses

  return exportRawResponses(studyTitle, cards, categories, filteredResponses, participants)
}

/**
 * Export responses with standardized category names
 * Applies standardization mappings to raw category names
 */
export function exportStandardizedResponses(
  studyTitle: string,
  cards: Card[],
  responses: Response[],
  participants: Participant[],
  standardizations: CategoryStandardization[]
): string {
  // Build lookup from original name to standardized name
  const standardizationMap = new Map<string, string>()
  for (const std of standardizations) {
    for (const original of std.original_names) {
      standardizationMap.set(original.toLowerCase(), std.standardized_name)
    }
  }

  // Apply standardization to each response
  const standardizedResponses: Response[] = responses.map(response => ({
    ...response,
    card_placements: Object.fromEntries(
      Object.entries(response.card_placements).map(([cardId, categoryName]) => {
        const standardized = standardizationMap.get(categoryName.toLowerCase())
        return [cardId, standardized || categoryName]
      })
    )
  }))

  // Create participant lookup
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Build header row
  const headers = [
    'Participant ID',
    'Status',
    'Started At',
    'Completed At',
    'Duration (seconds)',
    ...cards.map((c) => c.label),
  ]

  // Build data rows
  const rows = standardizedResponses.map((response) => {
    const participant = participantMap.get(response.participant_id)
    const durationSec = response.total_time_ms
      ? Math.round(response.total_time_ms / 1000)
      : ''

    const cardCategories = cards.map((card) => {
      return response.card_placements[card.id] || ''
    })

    return [
      response.participant_id,
      participant?.status || '',
      participant?.started_at || '',
      participant?.completed_at || '',
      durationSec.toString(),
      ...cardCategories,
    ]
  })

  return formatCSV([headers, ...rows])
}

/**
 * Export in SynCaps format for external cluster analysis tools
 *
 * Format: Each row is a participant, each column is a card,
 * cell value is the category name where the card was placed.
 */
export function exportSynCaps(
  studyTitle: string,
  cards: Card[],
  responses: Response[]
): string {
  const headers = ['Participant', ...cards.map(c => c.label)]

  const rows = responses.map(response => {
    const participantRow = [response.participant_id]

    cards.forEach(card => {
      participantRow.push(response.card_placements[card.id] || '')
    })

    return participantRow
  })

  return formatCSV([headers, ...rows])
}

/**
 * Export card-category matrix for pivot table analysis
 * Shows counts of how many times each card was placed in each category
 */
export function exportCardCategoryMatrix(
  studyTitle: string,
  cards: Card[],
  responses: Response[]
): string {
  // Collect all unique categories
  const categorySet = new Set<string>()
  for (const response of responses) {
    for (const categoryName of Object.values(response.card_placements)) {
      categorySet.add(categoryName)
    }
  }
  const allCategories = Array.from(categorySet).sort()

  // Count placements
  const counts: Record<string, Record<string, number>> = {}
  for (const card of cards) {
    counts[card.id] = {}
    for (const category of allCategories) {
      counts[card.id][category] = 0
    }
  }

  for (const response of responses) {
    for (const [cardId, categoryName] of Object.entries(response.card_placements)) {
      if (counts[cardId]) {
        counts[cardId][categoryName] = (counts[cardId][categoryName] || 0) + 1
      }
    }
  }

  // Build CSV
  const headers = ['Card', ...allCategories]
  const rows = cards.map(card => [
    card.label,
    ...allCategories.map(cat => counts[card.id][cat].toString())
  ])

  return formatCSV([headers, ...rows])
}
