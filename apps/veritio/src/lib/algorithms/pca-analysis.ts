/**
 * PCA (Participant-Centric Analysis) for Card Sorting
 *
 * Unlike statistical PCA, this is about finding the most popular
 * "Information Architectures" (IAs) - the ways participants organized cards.
 *
 * The algorithm:
 * 1. Extract each participant's complete IA (category structure with cards)
 * 2. Compare IAs using card-pairing similarity
 * 3. Cluster similar IAs together
 * 4. Identify top N most popular IA patterns
 * 5. Calculate support ratios (how many participants align with each IA)
 *
 * Based on Optimal Workshop's Participant-Centric Analysis methodology.
 */

// Uses flexible types to avoid tight coupling to Supabase schema

/**
 * A category in a participant's IA
 */
export interface IACategory {
  name: string
  cardIds: string[]
  cardLabels: string[]
}

/**
 * A complete Information Architecture from one participant
 */
export interface ParticipantIA {
  participantId: string
  categories: IACategory[]
  cardPairs: Set<string> // All card pairs in the same category, format: "cardA:cardB"
}

/**
 * A representative IA structure (cluster of similar IAs)
 */
export interface IAStructure {
  id: string
  categories: IACategory[]
  supportingParticipantIds: string[]
  supportRatio: number // e.g., 0.74 = 37/50 participants
  totalParticipants: number
  representativeParticipantId: string
}

/**
 * PCA analysis results
 */
export interface PCAResult {
  topIAs: IAStructure[]
  totalParticipants: number
  computedAt: Date
}

/**
 * Create a canonical key for a card pair (alphabetically sorted)
 */
function pairKey(cardA: string, cardB: string): string {
  return [cardA, cardB].sort().join(':')
}

/**
 * Extract a participant's IA from their response
 */
export function extractParticipantIA(
  response: {
    participant_id: string
    card_placements: Record<string, string>
  },
  cardMap: Map<string, string> // cardId -> cardLabel
): ParticipantIA {
  // Group cards by category
  const categoryCards = new Map<string, string[]>()

  for (const [cardId, categoryName] of Object.entries(response.card_placements)) {
    if (!categoryCards.has(categoryName)) {
      categoryCards.set(categoryName, [])
    }
    categoryCards.get(categoryName)!.push(cardId)
  }

  // Build categories
  const categories: IACategory[] = []
  const cardPairs = new Set<string>()

  for (const [name, cardIds] of categoryCards) {
    const cardLabels = cardIds.map(id => cardMap.get(id) || id)

    categories.push({
      name,
      cardIds,
      cardLabels,
    })

    // Generate all pairs within this category
    for (let i = 0; i < cardIds.length; i++) {
      for (let j = i + 1; j < cardIds.length; j++) {
        cardPairs.add(pairKey(cardIds[i], cardIds[j]))
      }
    }
  }

  return {
    participantId: response.participant_id,
    categories: categories.sort((a, b) => b.cardIds.length - a.cardIds.length),
    cardPairs,
  }
}

/**
 * Calculate Jaccard similarity between two participants' card pairings
 */
export function calculateIASimilarity(ia1: ParticipantIA, ia2: ParticipantIA): number {
  if (ia1.cardPairs.size === 0 && ia2.cardPairs.size === 0) return 1
  if (ia1.cardPairs.size === 0 || ia2.cardPairs.size === 0) return 0

  // Intersection
  let intersectionCount = 0
  for (const pair of ia1.cardPairs) {
    if (ia2.cardPairs.has(pair)) {
      intersectionCount++
    }
  }

  // Union
  const unionSet = new Set([...ia1.cardPairs, ...ia2.cardPairs])

  return intersectionCount / unionSet.size
}

/**
 * Check if a participant's IA supports a target IA structure
 * 50%+ card pairing match = supports the IA
 */
export function supportsIA(
  participantIA: ParticipantIA,
  targetIA: IAStructure,
  threshold: number = 0.5
): boolean {
  // Get target IA's card pairs from its categories
  const targetPairs = new Set<string>()
  for (const category of targetIA.categories) {
    for (let i = 0; i < category.cardIds.length; i++) {
      for (let j = i + 1; j < category.cardIds.length; j++) {
        targetPairs.add(pairKey(category.cardIds[i], category.cardIds[j]))
      }
    }
  }

  if (targetPairs.size === 0) return false

  // Count matching pairs
  let matchCount = 0
  for (const pair of targetPairs) {
    if (participantIA.cardPairs.has(pair)) {
      matchCount++
    }
  }

  return (matchCount / targetPairs.size) >= threshold
}

/**
 * Cluster similar IAs together using hierarchical clustering
 */
function clusterIAs(
  participantIAs: ParticipantIA[],
  minSimilarity: number = 0.5
): ParticipantIA[][] {
  if (participantIAs.length === 0) return []
  if (participantIAs.length === 1) return [participantIAs]

  // Simple greedy clustering
  const clusters: ParticipantIA[][] = []
  const used = new Set<string>()

  // Sort by number of categories (more organized = more likely representative)
  const sorted = [...participantIAs].sort(
    (a, b) => b.categories.length - a.categories.length
  )

  for (const ia of sorted) {
    if (used.has(ia.participantId)) continue

    // Start a new cluster with this IA
    const cluster: ParticipantIA[] = [ia]
    used.add(ia.participantId)

    // Find all similar IAs
    for (const other of sorted) {
      if (used.has(other.participantId)) continue

      const similarity = calculateIASimilarity(ia, other)
      if (similarity >= minSimilarity) {
        cluster.push(other)
        used.add(other.participantId)
      }
    }

    clusters.push(cluster)
  }

  return clusters
}

/**
 * Find the most representative IA in a cluster
 * The one with highest average similarity to all others
 */
function findRepresentativeIA(cluster: ParticipantIA[]): ParticipantIA {
  if (cluster.length === 1) return cluster[0]

  let bestIA = cluster[0]
  let bestAvgSimilarity = 0

  for (const candidate of cluster) {
    let totalSimilarity = 0
    for (const other of cluster) {
      if (candidate.participantId !== other.participantId) {
        totalSimilarity += calculateIASimilarity(candidate, other)
      }
    }
    const avgSimilarity = totalSimilarity / (cluster.length - 1)

    if (avgSimilarity > bestAvgSimilarity) {
      bestAvgSimilarity = avgSimilarity
      bestIA = candidate
    }
  }

  return bestIA
}

/**
 * Perform PCA analysis on card sort responses
 */
export function performPCAAnalysis(
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string>
  }>,
  cards: Array<{ id: string; label: string }>,
  topN: number = 3,
  minClusterSimilarity: number = 0.5
): PCAResult {
  if (responses.length === 0) {
    return {
      topIAs: [],
      totalParticipants: 0,
      computedAt: new Date(),
    }
  }

  // Build card map
  const cardMap = new Map<string, string>()
  for (const card of cards) {
    cardMap.set(card.id, card.label)
  }

  // Extract all participant IAs
  const participantIAs = responses.map(r =>
    extractParticipantIA(r, cardMap)
  )

  // Cluster similar IAs
  const clusters = clusterIAs(participantIAs, minClusterSimilarity)

  // Sort clusters by size (most popular first)
  clusters.sort((a, b) => b.length - a.length)

  // Build top IA structures
  const topIAs: IAStructure[] = []

  for (let i = 0; i < Math.min(topN, clusters.length); i++) {
    const cluster = clusters[i]
    const representative = findRepresentativeIA(cluster)

    // Calculate true support ratio across ALL participants
    const supportingIds: string[] = []
    for (const ia of participantIAs) {
      const structure: IAStructure = {
        id: `temp`,
        categories: representative.categories,
        supportingParticipantIds: [],
        supportRatio: 0,
        totalParticipants: responses.length,
        representativeParticipantId: representative.participantId,
      }

      if (supportsIA(ia, structure)) {
        supportingIds.push(ia.participantId)
      }
    }

    topIAs.push({
      id: `ia-${i + 1}`,
      categories: representative.categories,
      supportingParticipantIds: supportingIds,
      supportRatio: supportingIds.length / responses.length,
      totalParticipants: responses.length,
      representativeParticipantId: representative.participantId,
    })
  }

  return {
    topIAs,
    totalParticipants: responses.length,
    computedAt: new Date(),
  }
}

/**
 * Calculate the "distinctiveness" of an IA compared to others
 * Higher = more unique structure
 */
export function calculateDistinctiveness(
  ia: IAStructure,
  allIAs: IAStructure[]
): number {
  if (allIAs.length <= 1) return 1

  // Get this IA's pairs
  const thisPairs = new Set<string>()
  for (const category of ia.categories) {
    for (let i = 0; i < category.cardIds.length; i++) {
      for (let j = i + 1; j < category.cardIds.length; j++) {
        thisPairs.add(pairKey(category.cardIds[i], category.cardIds[j]))
      }
    }
  }

  // Calculate average dissimilarity to other IAs
  let totalDissimilarity = 0
  let count = 0

  for (const other of allIAs) {
    if (other.id === ia.id) continue

    const otherPairs = new Set<string>()
    for (const category of other.categories) {
      for (let i = 0; i < category.cardIds.length; i++) {
        for (let j = i + 1; j < category.cardIds.length; j++) {
          otherPairs.add(pairKey(category.cardIds[i], category.cardIds[j]))
        }
      }
    }

    // Jaccard dissimilarity
    let intersection = 0
    for (const pair of thisPairs) {
      if (otherPairs.has(pair)) intersection++
    }
    const union = new Set([...thisPairs, ...otherPairs])
    const similarity = union.size > 0 ? intersection / union.size : 0

    totalDissimilarity += (1 - similarity)
    count++
  }

  return count > 0 ? totalDissimilarity / count : 1
}

/**
 * Get summary statistics for PCA results
 */
export function getPCASummary(result: PCAResult): {
  coverage: number // What % of participants are represented by top IAs
  topIASupport: number // Highest support ratio
  avgCategories: number // Average categories across top IAs
} {
  if (result.topIAs.length === 0) {
    return { coverage: 0, topIASupport: 0, avgCategories: 0 }
  }

  // Coverage: unique participants supporting any top IA
  const allSupporters = new Set<string>()
  for (const ia of result.topIAs) {
    for (const id of ia.supportingParticipantIds) {
      allSupporters.add(id)
    }
  }

  const coverage = result.totalParticipants > 0
    ? allSupporters.size / result.totalParticipants
    : 0

  const topIASupport = result.topIAs[0]?.supportRatio || 0

  const avgCategories = result.topIAs.reduce(
    (sum, ia) => sum + ia.categories.length, 0
  ) / result.topIAs.length

  return { coverage, topIASupport, avgCategories }
}

/**
 * Wrapper types for web worker compatibility
 */
interface PerformPCAAnalysisData {
  responses: Array<{
    participant_id: string
    card_placements: Record<string, string>
  }>
  cards: Array<{ id: string; label: string }>
  topN?: number
  minClusterSimilarity?: number
}

interface ExtractParticipantIAData {
  response: {
    participant_id: string
    card_placements: Record<string, string>
  }
  cardMap: Map<string, string> | Record<string, string>
}

/**
 * Wrapper function for web worker - performPCAAnalysis
 */
export function performPCAAnalysisWorker(data: PerformPCAAnalysisData): PCAResult {
  return performPCAAnalysis(
    data.responses,
    data.cards,
    data.topN,
    data.minClusterSimilarity
  )
}

/**
 * Wrapper function for web worker - extractParticipantIA
 */
export function extractParticipantIAWorker(data: ExtractParticipantIAData): ParticipantIA {
  const cardMap = data.cardMap instanceof Map
    ? data.cardMap
    : new Map(Object.entries(data.cardMap))
  return extractParticipantIA(data.response, cardMap)
}
