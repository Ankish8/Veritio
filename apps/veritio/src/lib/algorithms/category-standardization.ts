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
 * How consistently a set of card groupings contain the same cards, 0-100.
 *
 * Mean pairwise Jaccard: average, over every pair of groupings, of the share of
 * their combined cards that both contain. 100 means every grouping held exactly
 * the same cards.
 *
 * Deliberately not "for each card, what share of groupings contain it", which is
 * what this used to be. That measure collapses as the number of groupings grows,
 * because every stray card anyone ever filed here enters the denominator: for a
 * fixed level of real agreement it reads 83% across 2 groupings and 5% across
 * 100, so the categories the most people agreed on scored the worst. It also
 * scores two groupings that share no cards at all as 50% rather than 0%.
 *
 * Returns null when there is nothing to compare: one grouping cannot disagree
 * with itself, and reporting 100% in that case reads as strong consensus when no
 * consensus was measured.
 */
export function calculateGroupingConsistency(
  groupings: Array<Set<string>>
): number | null {
  if (groupings.length < 2) return null
  if (groupings.every((cards) => cards.size === 0)) return null

  let total = 0
  let pairs = 0
  for (let i = 0; i < groupings.length; i++) {
    for (let j = i + 1; j < groupings.length; j++) {
      total += cardOverlap(groupings[i], groupings[j])
      pairs++
    }
  }

  return pairs > 0 ? Math.round((total / pairs) * 100) : null
}

/**
 * Calculate agreement score between merged categories
 * This measures how consistently participants grouped the same cards.
 *
 * A high score means the names being merged really do hold the same cards. A
 * score near zero means they share almost nothing and merging them would
 * invent a category no participant made.
 */
export function calculateAgreementScore(
  categories: CategoryAnalysis[]
): number {
  // A single-category merge group is trivially self-consistent.
  if (categories.length < 2) return 100
  return calculateGroupingConsistency(categories.map((cat) => cat.cardIds)) ?? 0
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
