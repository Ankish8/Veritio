/**
 * Category Standardization Algorithm for Open/Hybrid Card Sorting
 *
 * In open and hybrid card sorts, participants create their own category labels.
 * This leads to many similar categories with slightly different names:
 * - "Settings", "Preferences", "Config", "Options"
 *
 * Standardization helps by:
 * 1. Identifying similar categories based on naming and card overlap
 * 2. Allowing researchers to merge them into standardized names
 * 3. Calculating agreement scores to validate merges
 *
 * Based on Optimal Workshop's standardization patterns.
 */

/**
 * A category created by a participant
 */
export interface ParticipantCategory {
  name: string
  participantId: string
  cardIds: string[]
}

/**
 * Aggregated data about a category name across all participants
 */
export interface CategoryAnalysis {
  name: string
  normalizedName: string
  frequency: number  // How many participants used this category
  cardIds: Set<string>  // All cards ever placed in this category
  participantIds: string[]  // Which participants used this category
}

/**
 * A standardization mapping (persisted in database)
 */
export interface StandardizationMapping {
  standardizedName: string
  originalNames: string[]
  agreementScore: number
}

/**
 * Normalize a category name for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove common suffixes/prefixes
 */
export function normalizeCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(the|my|a|an)\s+/i, '')
    .replace(/\s+(stuff|things|items|misc|other)$/i, '')
}

/**
 * Calculate string similarity using Levenshtein distance ratio
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  const maxLen = Math.max(a.length, b.length)
  return 1 - matrix[b.length][a.length] / maxLen
}

/**
 * Calculate Jaccard similarity between two sets of cards
 */
export function cardOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0

  const intersection = new Set([...setA].filter((x) => setB.has(x)))
  const union = new Set([...setA, ...setB])

  return intersection.size / union.size
}

/**
 * Calculate agreement score between merged categories
 * This measures how consistently participants grouped the same cards
 * Score > 60% indicates a meaningful merge
 */
export function calculateAgreementScore(
  categories: CategoryAnalysis[]
): number {
  if (categories.length < 2) return 100

  // Get all unique cards across all categories
  const allCards = new Set<string>()
  for (const cat of categories) {
    for (const cardId of cat.cardIds) {
      allCards.add(cardId)
    }
  }

  if (allCards.size === 0) return 0

  // Calculate how often each card appears across the categories
  let totalOverlap = 0
  for (const cardId of allCards) {
    const containingCategories = categories.filter((cat) =>
      cat.cardIds.has(cardId)
    )
    // Card contributes to agreement if it appears in multiple categories
    totalOverlap += containingCategories.length / categories.length
  }

  return Math.round((totalOverlap / allCards.size) * 100)
}

/**
 * Extract all participant-created categories from responses
 */
export function extractCategories(
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string>
    custom_categories?: Array<{ id: string; label: string }> | null
  }>
): ParticipantCategory[] {
  const categories: ParticipantCategory[] = []

  for (const response of responses) {
    const placements = response.card_placements || {}

    // Group cards by category
    const categoryCards = new Map<string, string[]>()

    for (const [cardId, categoryName] of Object.entries(placements)) {
      if (!categoryCards.has(categoryName)) {
        categoryCards.set(categoryName, [])
      }
      categoryCards.get(categoryName)!.push(cardId)
    }

    // Create category objects
    for (const [name, cardIds] of categoryCards) {
      categories.push({
        name,
        participantId: response.participant_id,
        cardIds,
      })
    }
  }

  return categories
}

/**
 * Analyze all categories and aggregate by name
 */
export function analyzeCategories(
  participantCategories: ParticipantCategory[]
): CategoryAnalysis[] {
  const categoryMap = new Map<string, CategoryAnalysis>()

  for (const cat of participantCategories) {
    const normalized = normalizeCategory(cat.name)
    const key = cat.name // Use original name as key

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: cat.name,
        normalizedName: normalized,
        frequency: 0,
        cardIds: new Set(),
        participantIds: [],
      })
    }

    const analysis = categoryMap.get(key)!
    analysis.frequency++
    analysis.participantIds.push(cat.participantId)
    for (const cardId of cat.cardIds) {
      analysis.cardIds.add(cardId)
    }
  }

  return Array.from(categoryMap.values()).sort(
    (a, b) => b.frequency - a.frequency
  )
}

/**
 * Apply standardization mappings to responses
 * Returns new placements with standardized category names
 */
export function applyStandardization(
  response: {
    card_placements: Record<string, string>
  },
  mappings: StandardizationMapping[]
): Record<string, string> {
  const result: Record<string, string> = {}

  // Build reverse lookup: original name -> standardized name
  const lookup = new Map<string, string>()
  for (const mapping of mappings) {
    for (const original of mapping.originalNames) {
      lookup.set(original, mapping.standardizedName)
    }
  }

  // Apply mappings
  for (const [cardId, categoryName] of Object.entries(response.card_placements)) {
    result[cardId] = lookup.get(categoryName) || categoryName
  }

  return result
}

/**
 * Get all unique category names from responses (after optional standardization)
 */
export function getUniqueCategoryNames(
  responses: Array<{ card_placements: Record<string, string> }>,
  mappings?: StandardizationMapping[]
): string[] {
  const names = new Set<string>()

  for (const response of responses) {
    const placements = mappings
      ? applyStandardization(response, mappings)
      : response.card_placements

    for (const categoryName of Object.values(placements)) {
      names.add(categoryName)
    }
  }

  return Array.from(names).sort()
}
