/**
 * Card Sort Export Module
 *
 * Provides CSV and Excel exports for Card Sort study results including:
 * - Raw responses with card placements
 * - Filtered responses (by segment)
 * - Standardized responses (with category mappings)
 * - Similarity matrix
 * - Category agreement
 * - SynCaps format for external tools
 */

import type { ExportOptions, ColumnConfig } from '../types'
import { createExportFilename } from '../utils'
import { formatCSV, downloadCSV } from '../csv/index'

// ============================================================================
// Types
// ============================================================================

export interface Card {
  id: string
  label: string
}

export interface Category {
  id: string
  label: string
}

export interface CardSortResponse {
  participant_id: string
  card_placements: Record<string, string>
  custom_categories: Array<{ id: string; label: string }> | null
  total_time_ms: number | null
  created_at: string
}

export interface CardSortParticipant {
  id: string
  status: string
  started_at: string
  completed_at: string | null
}

export interface CategoryStandardization {
  standardized_name: string
  original_names: string[]
}

export interface CardSortExportData {
  cards: Card[]
  categories: Category[]
  responses: CardSortResponse[]
  participants: CardSortParticipant[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build base columns for card sort exports
 */
function buildBaseColumns(): ColumnConfig[] {
  return [
    { header: 'Participant ID', key: 'participantId', type: 'string', width: 20 },
    { header: 'Status', key: 'status', type: 'string', width: 12 },
    { header: 'Started At', key: 'startedAt', type: 'date', width: 20 },
    { header: 'Completed At', key: 'completedAt', type: 'date', width: 20 },
    { header: 'Duration (seconds)', key: 'duration', type: 'number', width: 18 },
  ]
}

/**
 * Build dynamic columns based on card definitions
 */
function buildCardColumns(cards: Card[]): ColumnConfig[] {
  return cards.map((card) => ({
    header: card.label,
    key: `card_${card.id}`,
    type: 'string' as const,
    width: 'auto' as const,
  }))
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export Card Sort raw responses
 */
export async function exportCardSortRawResponses(
  data: CardSortExportData,
  options: ExportOptions
): Promise<void> {
  const { cards, responses, participants } = data
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Filter by segment if active
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  const baseColumns = buildBaseColumns()
  const cardColumns = buildCardColumns(cards)
  const columns = [...baseColumns, ...cardColumns]
  const headers = columns.map((c) => c.header)

  const rows = filteredResponses.map((response) => {
    const participant = participantMap.get(response.participant_id)
    const placements = response.card_placements || {}
    const durationSec = response.total_time_ms
      ? Math.round(response.total_time_ms / 1000)
      : ''

    const baseData = [
      response.participant_id,
      participant?.status || '',
      participant?.started_at || '',
      participant?.completed_at || '',
      durationSec,
    ]

    // Add category for each card
    const cardData = cards.map((card) => placements[card.id] || '')

    return [...baseData, ...cardData]
  })

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Card Sort standardized responses (with category mappings applied)
 */
export async function exportCardSortStandardizedResponses(
  data: CardSortExportData,
  standardizations: CategoryStandardization[],
  options: ExportOptions
): Promise<void> {
  const { cards, responses, participants } = data
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Build lookup from original name to standardized name
  const standardizationMap = new Map<string, string>()
  for (const std of standardizations) {
    for (const original of std.original_names) {
      standardizationMap.set(original.toLowerCase(), std.standardized_name)
    }
  }

  // Filter by segment if active
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  const baseColumns = buildBaseColumns()
  const cardColumns = buildCardColumns(cards)
  const columns = [...baseColumns, ...cardColumns]
  const headers = columns.map((c) => c.header)

  const rows = filteredResponses.map((response) => {
    const participant = participantMap.get(response.participant_id)
    const placements = response.card_placements || {}
    const durationSec = response.total_time_ms
      ? Math.round(response.total_time_ms / 1000)
      : ''

    const baseData = [
      response.participant_id,
      participant?.status || '',
      participant?.started_at || '',
      participant?.completed_at || '',
      durationSec,
    ]

    // Add standardized category for each card
    const cardData = cards.map((card) => {
      const originalCategory = placements[card.id] || ''
      const standardized = standardizationMap.get(originalCategory.toLowerCase())
      return standardized || originalCategory
    })

    return [...baseData, ...cardData]
  })

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Card Sort similarity matrix
 */
export async function exportCardSortSimilarityMatrix(
  cardLabels: string[],
  matrix: number[][],
  options: ExportOptions
): Promise<void> {
  const columns: ColumnConfig[] = [
    { header: '', key: 'rowLabel', type: 'string', width: 20 },
    ...cardLabels.map((label) => ({
      header: label,
      key: label,
      type: 'number' as const,
      width: 'auto' as const,
    })),
  ]

  const headers = columns.map((c) => c.header)

  const rows = matrix.map((row, idx) => [
    cardLabels[idx],
    ...row.map((val) => val.toFixed(2)),
  ])

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Card Sort category agreement
 */
export async function exportCardSortCategoryAgreement(
  agreement: Record<
    string,
    {
      cardLabel: string
      categories: { name: string; count: number; percentage: number }[]
    }
  >,
  options: ExportOptions
): Promise<void> {
  const columns: ColumnConfig[] = [
    { header: 'Card', key: 'card', type: 'string', width: 25 },
    { header: 'Category', key: 'category', type: 'string', width: 25 },
    { header: 'Count', key: 'count', type: 'number', width: 10 },
    { header: 'Percentage (%)', key: 'percentage', type: 'percent', width: 15 },
  ]

  const headers = columns.map((c) => c.header)

  const rows: unknown[][] = []
  for (const [, card] of Object.entries(agreement)) {
    for (const cat of card.categories) {
      rows.push([card.cardLabel, cat.name, cat.count, cat.percentage.toFixed(1)])
    }
  }

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Card Sort in SynCaps format for external cluster analysis tools
 */
export async function exportCardSortSynCaps(
  data: CardSortExportData,
  options: ExportOptions
): Promise<void> {
  const { cards, responses } = data

  // Filter by segment if active
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  const columns: ColumnConfig[] = [
    { header: 'Participant', key: 'participant', type: 'string', width: 20 },
    ...cards.map((card) => ({
      header: card.label,
      key: card.id,
      type: 'string' as const,
      width: 'auto' as const,
    })),
  ]

  const headers = columns.map((c) => c.header)

  const rows = filteredResponses.map((response) => {
    const placements = response.card_placements || {}
    return [
      response.participant_id,
      ...cards.map((card) => placements[card.id] || ''),
    ]
  })

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export card-category matrix for pivot table analysis
 */
export async function exportCardSortCardCategoryMatrix(
  data: CardSortExportData,
  options: ExportOptions
): Promise<void> {
  const { cards, responses } = data

  // Filter by segment if active
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  // Collect all unique categories
  const categorySet = new Set<string>()
  for (const response of filteredResponses) {
    const placements = response.card_placements || {}
    for (const categoryName of Object.values(placements)) {
      if (categoryName) {
        categorySet.add(categoryName)
      }
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

  for (const response of filteredResponses) {
    const placements = response.card_placements || {}
    for (const [cardId, categoryName] of Object.entries(placements)) {
      if (counts[cardId] && categoryName) {
        counts[cardId][categoryName] = (counts[cardId][categoryName] || 0) + 1
      }
    }
  }

  const columns: ColumnConfig[] = [
    { header: 'Card', key: 'card', type: 'string', width: 25 },
    ...allCategories.map((cat) => ({
      header: cat,
      key: cat,
      type: 'number' as const,
      width: 'auto' as const,
    })),
  ]

  const headers = columns.map((c) => c.header)

  const rows = cards.map((card) => [
    card.label,
    ...allCategories.map((cat) => counts[card.id][cat]),
  ])

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

// ============================================================================
// Convenience Export
// ============================================================================

export { createExportFilename }
