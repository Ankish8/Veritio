/**
 * Similarity Matrix Algorithm for Card Sorting Analysis
 *
 * Calculates how often pairs of cards were placed in the same category
 * across all participant responses.
 */

export interface CardPlacement {
  cardId: string
  /**
   * In practice the category's display *label*, because that is what
   * `card_placements` stores. Consumers that show category names to the user
   * (e.g. computeCategoryAgreement) read this.
   */
  categoryId: string
  /**
   * Stable identity of the group this card was placed in, scoped to one
   * participant's sort. Supplied from `card_sort_responses.category_assignments`
   * where available; falls back to `categoryId`.
   *
   * Co-occurrence must group on identity, not on the label: two groups a
   * participant named the same thing are different groups, and treating them as
   * one invents card pairs that participant never made.
   */
  groupKey?: string
}

export interface ParticipantResponse {
  participantId: string
  placements: CardPlacement[]
}

export interface SimilarityResult {
  matrix: number[][]        // Percentages (0-100)
  countMatrix: number[][]   // Raw co-occurrence counts
  cardIds: string[]
  cardLabels: string[]
}

/**
 * Build the analysis shape from a stored `card_sort_responses` row.
 *
 * Every card-sort analysis path needs this identically, so it lives here rather
 * than being open-coded per caller. `card_placements` is keyed by category
 * label; `category_assignments` carries the real group identity and is null on
 * rows written before migration 20260729000000.
 */
export function toParticipantResponse(row: {
  participant_id: string
  card_placements: unknown
  category_assignments?: unknown
}): ParticipantResponse {
  const placements: CardPlacement[] = []
  const cardPlacements = (row.card_placements || {}) as Record<string, string>
  const assignments = (row.category_assignments || null) as Record<string, string> | null

  for (const [cardId, categoryLabel] of Object.entries(cardPlacements)) {
    placements.push({
      cardId,
      categoryId: categoryLabel,
      groupKey: assignments?.[cardId] ?? categoryLabel,
    })
  }

  return { participantId: row.participant_id, placements }
}

/**
 * Compute similarity matrix showing how often card pairs were grouped together
 * @param responses - Array of participant responses
 * @param cards - Array of cards with id and label
 * @returns Similarity matrix with values from 0-100 (percentage)
 */
export function computeSimilarityMatrix(
  responses: ParticipantResponse[],
  cards: { id: string; label: string }[]
): SimilarityResult {
  const cardIds = cards.map((c) => c.id)
  const cardLabels = cards.map((c) => c.label)
  const n = cardIds.length
  const totalResponses = responses.length

  if (totalResponses === 0) {
    const emptyMatrix = Array(n).fill(null).map(() => Array(n).fill(0))
    return {
      matrix: emptyMatrix,
      countMatrix: emptyMatrix,
      cardIds,
      cardLabels,
    }
  }

  // Build card ID to index lookup for O(1) access
  const cardIndexMap = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    cardIndexMap.set(cardIds[i], i)
  }

  // Initialize co-occurrence count matrix
  const coOccurrence: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0))

  // Count co-occurrences for each participant
  for (const response of responses) {
    // Group cards by category for this participant
    const categoryGroups = new Map<string, Set<string>>()

    for (const placement of response.placements) {
      // Identity, not label: see CardPlacement.groupKey.
      const groupKey = placement.groupKey ?? placement.categoryId
      if (!categoryGroups.has(groupKey)) {
        categoryGroups.set(groupKey, new Set())
      }
      categoryGroups.get(groupKey)!.add(placement.cardId)
    }

    // For each category, increment co-occurrence for all pairs in that category
    for (const cardSet of categoryGroups.values()) {
      const cardsInCategory = Array.from<string>(cardSet)

      for (let i = 0; i < cardsInCategory.length; i++) {
        const idxA = cardIndexMap.get(cardsInCategory[i])
        if (idxA === undefined) continue

        for (let j = i; j < cardsInCategory.length; j++) {
          const idxB = cardIndexMap.get(cardsInCategory[j])
          if (idxB === undefined) continue

          coOccurrence[idxA][idxB]++
          if (idxA !== idxB) {
            coOccurrence[idxB][idxA]++
          }
        }
      }
    }
  }

  // Convert to percentage (0-100)
  const matrix = coOccurrence.map((row) =>
    row.map((count) => Math.round((count / totalResponses) * 100))
  )

  return {
    matrix,
    countMatrix: coOccurrence,
    cardIds,
    cardLabels,
  }
}

/**
 * Get the top N most similar card pairs
 */
export function getTopSimilarPairs(
  result: SimilarityResult,
  topN: number = 10
): { cardA: string; cardB: string; similarity: number }[] {
  const pairs: { cardA: string; cardB: string; similarity: number }[] = []

  for (let i = 0; i < result.cardLabels.length; i++) {
    for (let j = i + 1; j < result.cardLabels.length; j++) {
      pairs.push({
        cardA: result.cardLabels[i],
        cardB: result.cardLabels[j],
        similarity: result.matrix[i][j],
      })
    }
  }

  return pairs
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
}

/**
 * Get cards that are frequently grouped together (clusters)
 */
export function findNaturalClusters(
  result: SimilarityResult,
  threshold: number = 70
): string[][] {
  const n = result.cardLabels.length
  const visited = new Set<number>()
  const clusters: string[][] = []

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue

    const cluster: number[] = [i]
    visited.add(i)

    for (let j = i + 1; j < n; j++) {
      if (visited.has(j)) continue

      // Check if this card is similar to all cards in the current cluster
      const isSimilarToAll = cluster.every(
        (idx) => result.matrix[idx][j] >= threshold
      )

      if (isSimilarToAll) {
        cluster.push(j)
        visited.add(j)
      }
    }

    if (cluster.length > 1) {
      clusters.push(cluster.map((idx) => result.cardLabels[idx]))
    }
  }

  return clusters
}
