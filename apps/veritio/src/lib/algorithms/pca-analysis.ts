/**
 * PCA (Participant-Centric Analysis) for Card Sorting
 *
 * Not statistical PCA. This finds the most popular "Information Architectures"
 * (IAs), meaning the ways participants actually organized the cards, following
 * Optimal Workshop's Participant-Centric Analysis / UXtweak's Respondent-Centric
 * Analysis methodology.
 *
 * The method:
 *   1. Reduce each participant's sort to the set of card pairs they co-located.
 *      Category names are ignored here; they are only used for display.
 *   2. Two participants "agree" when their pair sets overlap by at least the
 *      threshold, measured as symmetric Jaccard: |A n B| / |A u B|.
 *   3. Every participant's own sort is a candidate IA. Its vote count is the
 *      number of participants that agree with it (including itself).
 *   4. Emit the highest-voted candidate, then the next highest that does not
 *      itself agree with an already-emitted winner, and so on.
 *
 * ONE metric, used for every number this module produces. The previous
 * implementation mixed symmetric Jaccard (for clustering) with asymmetric
 * containment |A n B| / |B| (for the support percentage), which let a
 * participant who dumped every card into a single group "support" every strategy
 * at 100%: their pair set is a superset of everyone's. Symmetric Jaccard scores
 * that same comparison 12/28 = 43% on an 8-card deck.
 *
 * Two phases, because the expensive half does not depend on the threshold:
 *   buildPCAModel(responses, cards)      once per response set
 *   selectPCAStrategies(model, t, topN)  per threshold change, microseconds
 */

import { UNCLEAR_CATEGORY_LABEL } from '@/lib/card-sort/unclear-category'
import {
  PCA_MIN_SUPPORT_COUNT,
  PCA_MAX_PARTICIPANTS,
  PCA_STRATEGY_DEFAULT_THRESHOLD,
  PCA_TOP_STRATEGIES_COUNT,
} from '@/lib/constants/analysis-thresholds'

// Uses flexible types to avoid tight coupling to the Supabase schema.

/**
 * A category in a participant's IA.
 *
 * `name` is for display only. Grouping is done on category *identity*, which is
 * not always the name: see `extractParticipantIA`.
 */
export interface IACategory {
  name: string
  cardIds: string[]
  cardLabels: string[]
  /** Same members as cardIds. Precomputed for card-overlap matching. */
  cardIdSet: Set<string>
}

/** Why a sort cannot be shown as a representative strategy. */
export type IADegeneracy = 'all-one-group' | 'all-singletons' | 'merged-groups' | null

/** A complete Information Architecture from one participant. */
export interface ParticipantIA {
  participantId: string
  categories: IACategory[]
  /** Number of co-located card pairs. The pair set itself lives in the model's bitsets. */
  pairCount: number
  /** Number of cards this participant placed (after any Unclear exclusion). */
  placedCardCount: number
  /** True when grouping used persisted category ids rather than display labels. */
  hasCategoryIdentity: boolean
  /** Cards dropped because they were parked in the synthetic "Unclear" bucket. */
  unclearCardCount: number
  degeneracy: IADegeneracy
}

/** A candidate IA that was selected for display. */
export interface PCAStrategy {
  id: string
  representativeIndex: number
  representativeParticipantId: string
  categories: IACategory[]
  supportingParticipantIds: string[]
  supportRatio: number
  totalParticipants: number
  /** Mean agreement between this IA and the participants supporting it. */
  meanAgreement: number
}

/** Retained name for the shape `performPCAAnalysis` returns. */
export type IAStructure = PCAStrategy

/**
 * Threshold-independent analysis artifact. Building this is the expensive step,
 * so callers should memoize it on the response set and reuse it across
 * threshold changes.
 */
export interface PCAModel {
  /** Index `i` addresses every parallel array below. */
  participantIds: string[]
  ias: ParticipantIA[]
  /** Upper triangular, length n*(n-1)/2, values 0..1. Read it with `simAt`. */
  similarity: Float32Array
  pairCounts: Int32Array
  /** 0 means the sort may vote but may not be shown as a strategy. */
  candidateEligible: Uint8Array
  cardCount: number
  totalParticipants: number
  /** Responses dropped by PCA_MAX_PARTICIPANTS. Surfaced in the UI, never silent. */
  truncated: number
  unclearExcluded: boolean
  /** Total cards parked in "Unclear" across all participants. */
  unclearCardCount: number
  /** Sorts barred from candidacy, by reason. */
  degenerateCounts: Record<'all-one-group' | 'all-singletons' | 'merged-groups', number>
  /** Sorts whose grouping fell back to display labels because no ids were stored. */
  labelKeyedCount: number
}

export interface PCASelection {
  strategies: PCAStrategy[]
  /** votes[i] = 1 + number of other participants agreeing with participant i. */
  votes: Int32Array
  threshold: number
  totalParticipants: number
}

/** Retained for the pre-existing `performPCAAnalysis` contract. */
export interface PCAResult {
  topIAs: IAStructure[]
  totalParticipants: number
  computedAt: Date
}

export interface BuildPCAModelOptions {
  /**
   * Drop cards parked in the synthetic "Unclear" bucket. "Unclear" means "I
   * could not place this", not "these belong together", so counting it as a
   * real group both inflates the group count and makes two merely-confused
   * participants look similar to each other.
   */
  excludeUnclear?: boolean
  /**
   * Labels of the study's predefined categories. Used so a researcher who named
   * one of their own categories "Unclear" is not mistaken for the synthetic bucket.
   */
  predefinedCategoryLabels?: readonly string[]
}

// ============================================================================
// Pair indexing and bitsets
// ============================================================================

/**
 * Canonical index of the pair (a, b) with a < b, over `cardCount` cards.
 * Enumerates the upper triangle row by row, so indices are dense in
 * [0, cardCount*(cardCount-1)/2).
 */
function pairIndex(a: number, b: number, cardCount: number): number {
  return a * cardCount - (a * (a + 1)) / 2 + (b - a - 1)
}

/** Index into an upper-triangular n x n array, for i < j. */
function triIndex(i: number, j: number, n: number): number {
  return i * n - (i * (i + 1)) / 2 + (j - i - 1)
}

function popcount32(v: number): number {
  v = v - ((v >>> 1) & 0x55555555)
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333)
  v = (v + (v >>> 4)) & 0x0f0f0f0f
  return (v * 0x01010101) >>> 24
}

// ============================================================================
// Extraction
// ============================================================================

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase()
}

/**
 * Reads the participant's custom category labels, tolerating both shapes found
 * in the wild: the app writes `string[]` (use-card-sort-session.ts) while the
 * seed script writes `Array<{ id, label }>`.
 */
function readCustomCategoryLabels(customCategories: unknown): string[] {
  if (!Array.isArray(customCategories)) return []
  const labels: string[] = []
  for (const entry of customCategories) {
    if (typeof entry === 'string') {
      labels.push(entry)
    } else if (entry && typeof entry === 'object' && 'label' in entry) {
      const label = (entry as { label?: unknown }).label
      if (typeof label === 'string') labels.push(label)
    }
  }
  return labels
}

/**
 * True when this participant provably created two groups with the same name.
 *
 * Only meaningful for rows stored before category ids were persisted. Which
 * cards went into which of the same-named groups is unrecoverable, so such a
 * sort can still vote (its pair set is a superset of the truth, which Jaccard
 * handles honestly) but must not be displayed as a strategy, because the
 * structure shown would be wrong.
 */
function detectMergedGroups(
  customCategories: unknown,
  predefinedLabels: Set<string>
): boolean {
  const labels = readCustomCategoryLabels(customCategories)
  const seen = new Set<string>()
  for (const raw of labels) {
    const label = normalizeLabel(raw)
    if (!label) continue
    // A custom label colliding with a predefined one merges too, in hybrid mode.
    if (seen.has(label) || predefinedLabels.has(label)) return true
    seen.add(label)
  }
  return false
}

export interface ExtractParticipantIAInput {
  participant_id: string
  card_placements: Record<string, string>
  /**
   * cardId -> categoryId. The group identity of the sort. Present from
   * migration 20260729000000 onward; older rows fall back to label keying.
   */
  category_assignments?: Record<string, string> | null
  custom_categories?: unknown
}

/**
 * Extract a participant's IA from their stored response.
 *
 * Grouping key is `category_assignments[cardId]` when available, falling back to
 * the placement label. The label is always what gets displayed. This matters
 * because `card_placements` is keyed by category *label*: without the ids, two
 * groups a participant both named "Other" collapse into one and invent card
 * pairs that participant never made.
 */
export function extractParticipantIA(
  response: ExtractParticipantIAInput,
  cardMap: Map<string, string>, // cardId -> cardLabel
  options: BuildPCAModelOptions = {}
): ParticipantIA {
  const predefinedLabels = new Set(
    (options.predefinedCategoryLabels ?? []).map(normalizeLabel)
  )
  const unclearIsSynthetic = !predefinedLabels.has(normalizeLabel(UNCLEAR_CATEGORY_LABEL))
  const assignments = response.category_assignments ?? null
  const hasCategoryIdentity = !!assignments && Object.keys(assignments).length > 0

  // groupKey -> { name, cardIds }
  const groups = new Map<string, { name: string; cardIds: string[] }>()
  let unclearCardCount = 0

  for (const [cardId, categoryLabel] of Object.entries(response.card_placements)) {
    // Cards deleted from the study after this response was submitted would
    // otherwise still generate pairs.
    if (!cardMap.has(cardId)) continue

    const isUnclear = unclearIsSynthetic && categoryLabel === UNCLEAR_CATEGORY_LABEL
    if (isUnclear) {
      unclearCardCount++
      if (options.excludeUnclear) continue
    }

    const groupKey = assignments?.[cardId] ?? categoryLabel
    const existing = groups.get(groupKey)
    if (existing) {
      existing.cardIds.push(cardId)
    } else {
      groups.set(groupKey, { name: categoryLabel, cardIds: [cardId] })
    }
  }

  const categories: IACategory[] = []
  let pairCount = 0
  let placedCardCount = 0
  let singletonCount = 0

  for (const { name, cardIds } of groups.values()) {
    cardIds.sort()
    categories.push({
      name,
      cardIds,
      cardLabels: cardIds.map((id) => cardMap.get(id) as string),
      cardIdSet: new Set(cardIds),
    })
    pairCount += (cardIds.length * (cardIds.length - 1)) / 2
    placedCardCount += cardIds.length
    if (cardIds.length === 1) singletonCount++
  }

  // Largest group first for display, with total tie-breaks so the rendered
  // order does not depend on Map insertion order.
  categories.sort((a, b) => {
    if (b.cardIds.length !== a.cardIds.length) return b.cardIds.length - a.cardIds.length
    if (a.name !== b.name) return a.name < b.name ? -1 : 1
    return a.cardIds[0] < b.cardIds[0] ? -1 : 1
  })

  let degeneracy: IADegeneracy = null
  if (!hasCategoryIdentity && detectMergedGroups(response.custom_categories, predefinedLabels)) {
    degeneracy = 'merged-groups'
  } else if (placedCardCount > 1 && categories.length === 1) {
    degeneracy = 'all-one-group'
  } else if (placedCardCount > 1 && singletonCount === categories.length) {
    degeneracy = 'all-singletons'
  }

  return {
    participantId: response.participant_id,
    categories,
    pairCount,
    placedCardCount,
    hasCategoryIdentity,
    unclearCardCount,
    degeneracy,
  }
}

// ============================================================================
// Reference metric (readable, used by tests and by callers holding only IAs)
// ============================================================================

/** All co-located card pairs in this IA, as canonical "cardA:cardB" keys. */
export function buildPairKeySet(ia: ParticipantIA): Set<string> {
  const pairs = new Set<string>()
  for (const category of ia.categories) {
    const ids = category.cardIds
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        pairs.add(ids[i] < ids[j] ? `${ids[i]}:${ids[j]}` : `${ids[j]}:${ids[i]}`)
      }
    }
  }
  return pairs
}

/**
 * Symmetric Jaccard agreement between two participants' card pairings, 0..1.
 *
 * The straightforward reference implementation. `buildPCAModel` computes the
 * same values with bitsets; the test suite asserts the two agree.
 *
 * Two sorts with no pairs at all (everything in its own group) agree on
 * nothing, so this returns 0 rather than 1. Returning 1 previously let two such
 * participants form a strategy whose representative had no structure and
 * therefore 0% support.
 */
export function calculateIASimilarity(ia1: ParticipantIA, ia2: ParticipantIA): number {
  if (ia1.pairCount === 0 || ia2.pairCount === 0) return 0

  const a = buildPairKeySet(ia1)
  const b = buildPairKeySet(ia2)
  let intersection = 0
  for (const pair of a) {
    if (b.has(pair)) intersection++
  }
  const union = a.size + b.size - intersection
  return union > 0 ? intersection / union : 0
}

// ============================================================================
// Phase 1: the model
// ============================================================================

export type PCAResponseInput = ExtractParticipantIAInput

/**
 * Build the threshold-independent analysis artifact: one IA per participant and
 * the full pairwise agreement matrix.
 *
 * Cost is O(n^2 * cards^2 / 32) word operations, which is roughly 2-4 ms for 200
 * participants over 60 cards. Memoize on the response set.
 */
export function buildPCAModel(
  responses: PCAResponseInput[],
  cards: Array<{ id: string; label: string }>,
  options: BuildPCAModelOptions = {}
): PCAModel {
  const cardMap = new Map<string, string>()
  const cardIndex = new Map<string, number>()
  for (const card of cards) {
    cardMap.set(card.id, card.label)
    cardIndex.set(card.id, cardIndex.size)
  }
  const cardCount = cardIndex.size

  // Deterministic order, and a cap so a runaway study cannot allocate an
  // unbounded matrix. The drop count is reported, never silent.
  const ordered = [...responses].sort((a, b) =>
    a.participant_id < b.participant_id ? -1 : a.participant_id > b.participant_id ? 1 : 0
  )
  const truncated = Math.max(0, ordered.length - PCA_MAX_PARTICIPANTS)
  const kept = truncated > 0 ? ordered.slice(0, PCA_MAX_PARTICIPANTS) : ordered

  const ias = kept.map((r) => extractParticipantIA(r, cardMap, options))
  const n = ias.length

  const degenerateCounts = {
    'all-one-group': 0,
    'all-singletons': 0,
    'merged-groups': 0,
  }
  let unclearCardCount = 0
  let labelKeyedCount = 0
  const candidateEligible = new Uint8Array(n)
  const pairCounts = new Int32Array(n)

  for (let i = 0; i < n; i++) {
    const ia = ias[i]
    pairCounts[i] = ia.pairCount
    unclearCardCount += ia.unclearCardCount
    if (!ia.hasCategoryIdentity) labelKeyedCount++
    if (ia.degeneracy) {
      degenerateCounts[ia.degeneracy]++
      candidateEligible[i] = 0
    } else {
      candidateEligible[i] = 1
    }
  }

  const similarity = new Float32Array(n > 1 ? (n * (n - 1)) / 2 : 0)

  if (n > 1 && cardCount > 1) {
    const totalPairs = (cardCount * (cardCount - 1)) / 2
    const words = Math.ceil(totalPairs / 32)
    const bits = new Uint32Array(n * words)

    for (let i = 0; i < n; i++) {
      const base = i * words
      for (const category of ias[i].categories) {
        const idx: number[] = []
        for (const cardId of category.cardIds) {
          const ci = cardIndex.get(cardId)
          if (ci !== undefined) idx.push(ci)
        }
        idx.sort((x, y) => x - y)
        for (let a = 0; a < idx.length; a++) {
          for (let b = a + 1; b < idx.length; b++) {
            const p = pairIndex(idx[a], idx[b], cardCount)
            bits[base + (p >>> 5)] |= 1 << (p & 31)
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const baseI = i * words
      const pa = pairCounts[i]
      for (let j = i + 1; j < n; j++) {
        const k = triIndex(i, j, n)
        const pb = pairCounts[j]
        if (pa === 0 || pb === 0) {
          similarity[k] = 0
          continue
        }
        const baseJ = j * words
        let intersection = 0
        for (let w = 0; w < words; w++) {
          const both = bits[baseI + w] & bits[baseJ + w]
          if (both !== 0) intersection += popcount32(both)
        }
        const union = pa + pb - intersection
        similarity[k] = union > 0 ? intersection / union : 0
      }
    }
  }

  return {
    participantIds: ias.map((ia) => ia.participantId),
    ias,
    similarity,
    pairCounts,
    candidateEligible,
    cardCount,
    totalParticipants: n,
    truncated,
    unclearExcluded: options.excludeUnclear === true,
    unclearCardCount,
    degenerateCounts,
    labelKeyedCount,
  }
}

/** Agreement between participants i and j, 0..1. Symmetric; 1 on the diagonal. */
export function simAt(model: PCAModel, i: number, j: number): number {
  if (i === j) return 1
  const n = model.totalParticipants
  return i < j ? model.similarity[triIndex(i, j, n)] : model.similarity[triIndex(j, i, n)]
}

// ============================================================================
// Phase 2: selection
// ============================================================================

/**
 * Pick the top IAs at a given agreement threshold.
 *
 * Every participant's sort is a candidate; its vote count is the number of
 * participants agreeing with it, itself included. Winners are emitted highest
 * votes first, skipping any candidate that agrees with an already-emitted
 * winner so the strategies shown are genuinely different structures.
 *
 * Supporters are recomputed from the identical relation used to count votes, so
 * `supportingParticipantIds.length === votes[representativeIndex]` holds by
 * construction. The old code counted votes one way and support another, which
 * is how a strategy card could read 67% while the same participant's own card
 * read 1/3.
 */
export function selectPCAStrategies(
  model: PCAModel,
  threshold: number,
  topN: number = PCA_TOP_STRATEGIES_COUNT,
  /**
   * Participant index to leave out entirely. Used by the leave-one-out stability
   * check so the vote arithmetic stays in this one place.
   */
  excludeIndex?: number
): PCASelection {
  const n = model.totalParticipants
  const votes = new Int32Array(n)
  const meanAgreement = new Float64Array(n)
  const skip = (i: number) => i === excludeIndex

  for (let i = 0; i < n; i++) votes[i] = skip(i) ? 0 : 1

  for (let i = 0; i < n; i++) {
    if (skip(i)) continue
    for (let j = i + 1; j < n; j++) {
      if (skip(j)) continue
      const s = model.similarity[triIndex(i, j, n)]
      if (s >= threshold) {
        votes[i]++
        votes[j]++
        meanAgreement[i] += s
        meanAgreement[j] += s
      }
    }
  }
  for (let i = 0; i < n; i++) {
    meanAgreement[i] = votes[i] > 1 ? meanAgreement[i] / (votes[i] - 1) : 0
  }

  // Total comparator, so the outcome does not depend on input order or on the
  // sort being stable. Ranking used to be by category count, which seeded every
  // cluster from whoever made the most groups.
  const candidates: number[] = []
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue
    if (model.candidateEligible[i] && votes[i] >= PCA_MIN_SUPPORT_COUNT) candidates.push(i)
  }
  candidates.sort((a, b) => {
    if (votes[b] !== votes[a]) return votes[b] - votes[a]
    if (meanAgreement[b] !== meanAgreement[a]) return meanAgreement[b] - meanAgreement[a]
    const pa = model.participantIds[a]
    const pb = model.participantIds[b]
    return pa < pb ? -1 : pa > pb ? 1 : 0
  })

  const effectiveTotal = excludeIndex === undefined ? n : Math.max(0, n - 1)
  const strategies: PCAStrategy[] = []
  const emitted: number[] = []

  for (const c of candidates) {
    if (strategies.length >= topN) break
    if (emitted.some((w) => simAt(model, c, w) >= threshold)) continue

    const supportingParticipantIds: string[] = []
    for (let j = 0; j < n; j++) {
      if (skip(j)) continue
      if (j === c || simAt(model, c, j) >= threshold) {
        supportingParticipantIds.push(model.participantIds[j])
      }
    }

    strategies.push({
      id: `ia-${strategies.length + 1}`,
      representativeIndex: c,
      representativeParticipantId: model.participantIds[c],
      categories: model.ias[c].categories,
      supportingParticipantIds,
      supportRatio:
        effectiveTotal > 0 ? supportingParticipantIds.length / effectiveTotal : 0,
      totalParticipants: effectiveTotal,
      meanAgreement: meanAgreement[c],
    })
    emitted.push(c)
  }

  return { strategies, votes, threshold, totalParticipants: effectiveTotal }
}

// ============================================================================
// Back-compatible entry point
// ============================================================================

/**
 * Convenience wrapper over the two phases. Prefer calling `buildPCAModel` and
 * `selectPCAStrategies` separately in interactive contexts so that changing the
 * threshold does not rebuild the matrix.
 */
export function performPCAAnalysis(
  responses: PCAResponseInput[],
  cards: Array<{ id: string; label: string }>,
  topN: number = PCA_TOP_STRATEGIES_COUNT,
  threshold: number = PCA_STRATEGY_DEFAULT_THRESHOLD,
  options: BuildPCAModelOptions = {}
): PCAResult {
  if (responses.length === 0) {
    return { topIAs: [], totalParticipants: 0, computedAt: new Date() }
  }

  const model = buildPCAModel(responses, cards, options)
  const selection = selectPCAStrategies(model, threshold, topN)

  return {
    topIAs: selection.strategies,
    totalParticipants: model.totalParticipants,
    computedAt: new Date(),
  }
}

/** Summary statistics over a selection. */
export function getPCASummary(result: PCAResult): {
  /** Share of participants represented by at least one shown IA. */
  coverage: number
  topIASupport: number
  avgCategories: number
} {
  if (result.topIAs.length === 0) {
    return { coverage: 0, topIASupport: 0, avgCategories: 0 }
  }

  const allSupporters = new Set<string>()
  for (const ia of result.topIAs) {
    for (const id of ia.supportingParticipantIds) allSupporters.add(id)
  }

  return {
    coverage:
      result.totalParticipants > 0 ? allSupporters.size / result.totalParticipants : 0,
    topIASupport: result.topIAs[0]?.supportRatio ?? 0,
    avgCategories:
      result.topIAs.reduce((sum, ia) => sum + ia.categories.length, 0) / result.topIAs.length,
  }
}

// ============================================================================
// Web worker wrappers
// ============================================================================

interface PerformPCAAnalysisData {
  responses: PCAResponseInput[]
  cards: Array<{ id: string; label: string }>
  topN?: number
  minClusterSimilarity?: number
  options?: BuildPCAModelOptions
}

interface ExtractParticipantIAData {
  response: ExtractParticipantIAInput
  cardMap: Map<string, string> | Record<string, string>
  options?: BuildPCAModelOptions
}

export function performPCAAnalysisWorker(data: PerformPCAAnalysisData): PCAResult {
  return performPCAAnalysis(
    data.responses,
    data.cards,
    data.topN,
    data.minClusterSimilarity,
    data.options
  )
}

export function extractParticipantIAWorker(data: ExtractParticipantIAData): ParticipantIA {
  const cardMap =
    data.cardMap instanceof Map ? data.cardMap : new Map(Object.entries(data.cardMap))
  return extractParticipantIA(data.response, cardMap, data.options)
}
