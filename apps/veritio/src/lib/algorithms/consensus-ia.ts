/**
 * Consensus Information Architecture for a PCA strategy.
 *
 * A strategy is one real participant's sort, chosen because more participants
 * agree with it than with any other. Useful, but it inherits that person's
 * idiosyncrasies: a group they alone named oddly, a card they alone misplaced.
 *
 * This module synthesizes an IA from everyone who supported the strategy:
 *   - group membership from cutting a dendrogram over the card co-occurrence
 *     matrix restricted to the supporters,
 *   - group count from the supporters' own median, not an elbow heuristic, so
 *     the result has a granularity they would recognize,
 *   - per-card confidence read straight off that same matrix,
 *   - group names voted on by the supporters.
 *
 * The synthesized IA is kept only when it agrees with the supporters at least as
 * well as the representative's own sort does. If a heuristic cut cannot beat a
 * real participant, showing it would be worse than showing the participant.
 */

import {
  buildDendrogram,
  cutDendrogramToK,
  type LinkageMethod,
} from './hierarchical-clustering'
import { computeSimilarityMatrix, type ParticipantResponse } from './similarity-matrix'
import {
  calculateIASimilarity,
  type IACategory,
  type ParticipantIA,
} from './pca-analysis'
import {
  CONSENSUS_LABEL_MIN_OVERLAP,
  CONSENSUS_LOW_CONFIDENCE,
  CONSENSUS_MIN_MEMBERS,
  WARD_PARTICIPANT_THRESHOLD,
} from '@/lib/constants/analysis-thresholds'

export interface ConsensusCard {
  cardId: string
  label: string
  /** Mean co-occurrence with this card's group-mates among supporters, 0..1. */
  confidence: number
}

export interface ConsensusLabel {
  label: string
  /** Number of supporters whose matching group used this name. */
  support: number
}

export interface ConsensusGroup {
  id: string
  label: string
  /** Supporters whose matching group used the winning name. */
  labelSupport: number
  alternativeLabels: ConsensusLabel[]
  cards: ConsensusCard[]
  /** Mean confidence across the group's cards, 0..1. */
  cohesion: number
}

export interface ConsensusIA {
  strategyId: string
  /**
   * 'synthesized' when the generated IA beat the representative's own sort,
   * 'representative' when it did not and we fell back to the real participant.
   */
  source: 'synthesized' | 'representative'
  groups: ConsensusGroup[]
  groupCount: number
  /** Range of group counts the supporters themselves used. */
  memberGroupCountRange: [number, number]
  memberCount: number
  /** Mean agreement between this IA and its supporters, 0..1. */
  meanAgreement: number
  /** Mean agreement between the representative's own sort and the supporters. */
  representativeAgreement: number
  closestParticipantId: string
  lowConfidenceCardIds: string[]
}

export interface ContestedCard {
  cardId: string
  label: string
  /** 1 minus the best confidence any strategy placed this card with, 0..1. */
  contention: number
  placements: Array<{ strategyId: string; groupLabel: string; confidence: number }>
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * Overlap coefficient |A n B| / min(|A|, |B|).
 *
 * Deliberately not Jaccard for label matching: Jaccard penalizes size mismatch,
 * so a supporter's 3-card group compared against a 7-card consensus group scores
 * low and a less apt name can win the vote.
 */
function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const value of small) {
    if (large.has(value)) shared++
  }
  return shared / small.size
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase()
}

/** Turn IAs into the shape computeSimilarityMatrix expects, keyed by identity. */
function toParticipantResponses(members: ParticipantIA[]): ParticipantResponse[] {
  return members.map((ia, memberIndex) => ({
    participantId: ia.participantId,
    placements: ia.categories.flatMap((category, groupIndex) =>
      category.cardIds.map((cardId) => ({
        cardId,
        // Synthetic per-member group id: never collides across members, and
        // immune to two of a member's groups sharing a display name.
        categoryId: `${memberIndex}:${groupIndex}`,
      }))
    ),
  }))
}

/** Build the IACategory list for a candidate grouping of card ids. */
function toCategories(
  groups: string[][],
  cardLabels: Map<string, string>,
  names: string[]
): IACategory[] {
  return groups.map((cardIds, index) => {
    const sorted = [...cardIds].sort()
    return {
      name: names[index] ?? '',
      cardIds: sorted,
      cardLabels: sorted.map((id) => cardLabels.get(id) ?? id),
      cardIdSet: new Set(sorted),
    }
  })
}

/** Mean agreement between one partition and each member's partition, 0..1. */
function meanAgreementTo(candidate: ParticipantIA, members: ParticipantIA[]): number {
  const others = members.filter((m) => m.participantId !== candidate.participantId)
  if (others.length === 0) return 0
  let total = 0
  for (const member of others) total += calculateIASimilarity(candidate, member)
  return total / others.length
}

/**
 * Vote on a name for each consensus group.
 *
 * For every supporter, the group of theirs that overlaps this consensus group
 * most is taken as "the same group", and its name gets a vote. Independent
 * argmax per group can map two consensus groups onto one supporter group; for a
 * name hint that is acceptable, and it avoids an assignment solver.
 */
function voteOnLabels(
  groupCardIds: Set<string>,
  members: ParticipantIA[]
): { label: string; labelSupport: number; alternativeLabels: ConsensusLabel[] } {
  const tally = new Map<string, { label: string; support: number }>()

  for (const member of members) {
    let bestOverlap = 0
    let bestName = ''
    for (const category of member.categories) {
      const overlap = overlapCoefficient(groupCardIds, category.cardIdSet)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestName = category.name
      }
    }
    if (bestOverlap < CONSENSUS_LABEL_MIN_OVERLAP || !bestName.trim()) continue

    const key = normalizeLabel(bestName)
    const existing = tally.get(key)
    if (existing) {
      existing.support++
    } else {
      tally.set(key, { label: bestName.trim(), support: 1 })
    }
  }

  const ranked = [...tally.values()].sort((a, b) => {
    if (b.support !== a.support) return b.support - a.support
    return a.label < b.label ? -1 : 1
  })

  if (ranked.length === 0) {
    return { label: '', labelSupport: 0, alternativeLabels: [] }
  }

  return {
    label: ranked[0].label,
    labelSupport: ranked[0].support,
    alternativeLabels: ranked.slice(1, 3),
  }
}

export interface SynthesizeConsensusOptions {
  linkage?: LinkageMethod
  /** Override the group count instead of using the supporters' median. */
  groupCount?: number
}

/**
 * Synthesize a consensus IA from the supporters of one strategy.
 *
 * Returns null when there are too few supporters to average anything
 * meaningful: consensus from two people is theatre.
 */
export function synthesizeConsensusIA(
  strategyId: string,
  representative: ParticipantIA,
  members: ParticipantIA[],
  cards: Array<{ id: string; label: string }>,
  options: SynthesizeConsensusOptions = {}
): ConsensusIA | null {
  if (members.length < CONSENSUS_MIN_MEMBERS) return null

  const cardLabels = new Map(cards.map((c) => [c.id, c.label]))
  const representativeAgreement = meanAgreementTo(representative, members)

  const memberGroupCounts = members.map((m) => m.categories.length)
  const memberGroupCountRange: [number, number] = [
    Math.min(...memberGroupCounts),
    Math.max(...memberGroupCounts),
  ]

  // Only cards at least one supporter placed. Including untouched cards would
  // manufacture a group of things nobody sorted.
  const placedCardIds = new Set<string>()
  for (const member of members) {
    for (const category of member.categories) {
      for (const cardId of category.cardIds) placedCardIds.add(cardId)
    }
  }
  const cardsInPlay = cards.filter((c) => placedCardIds.has(c.id))

  const fallback = (): ConsensusIA => {
    const groups = representative.categories.map((category, index) => ({
      id: `${strategyId}-g${index + 1}`,
      label: category.name,
      labelSupport: 0,
      alternativeLabels: [] as ConsensusLabel[],
      cards: category.cardIds.map((cardId) => ({
        cardId,
        label: cardLabels.get(cardId) ?? cardId,
        confidence: 1,
      })),
      cohesion: 1,
    }))
    return {
      strategyId,
      source: 'representative',
      groups,
      groupCount: groups.length,
      memberGroupCountRange,
      memberCount: members.length,
      meanAgreement: representativeAgreement,
      representativeAgreement,
      closestParticipantId: representative.participantId,
      lowConfidenceCardIds: [],
    }
  }

  const groupCount = options.groupCount ?? median(memberGroupCounts)
  if (cardsInPlay.length < 2 || groupCount < 1) return fallback()

  const similarity = computeSimilarityMatrix(toParticipantResponses(members), cardsInPlay)

  // Card *ids* as dendrogram labels, not display labels: buildDendrogram keys
  // leaves by label, so two cards sharing a label would collapse into one leaf.
  const linkage: LinkageMethod =
    options.linkage ?? (members.length < WARD_PARTICIPANT_THRESHOLD ? 'ward' : 'average')
  const dendrogram = buildDendrogram(similarity.matrix, similarity.cardIds, linkage)
  const parts = cutDendrogramToK(dendrogram, Math.min(groupCount, cardsInPlay.length))
  const groupings = parts.map((part) => part.cards).filter((group) => group.length > 0)

  if (groupings.length === 0) return fallback()

  const indexOfCard = new Map(similarity.cardIds.map((id, i) => [id, i]))

  // Per-card confidence: how often this card sat with its group-mates among the
  // supporters. Singletons: how often supporters also left it alone.
  const singletonShare = new Map<string, number>()
  for (const cardId of placedCardIds) {
    let alone = 0
    for (const member of members) {
      const owning = member.categories.find((c) => c.cardIdSet.has(cardId))
      if (owning && owning.cardIds.length === 1) alone++
    }
    singletonShare.set(cardId, alone / members.length)
  }

  const confidenceOf = (cardId: string, group: string[]): number => {
    if (group.length === 1) return singletonShare.get(cardId) ?? 0
    const i = indexOfCard.get(cardId)
    if (i === undefined) return 0
    let total = 0
    let count = 0
    for (const other of group) {
      if (other === cardId) continue
      const j = indexOfCard.get(other)
      if (j === undefined) continue
      total += similarity.matrix[i][j] / 100
      count++
    }
    return count > 0 ? total / count : 0
  }

  const names = groupings.map((group) => voteOnLabels(new Set(group), members))
  const candidateCategories = toCategories(
    groupings,
    cardLabels,
    names.map((n) => n.label)
  )

  // Score the synthesized partition the same way everything else is scored.
  const candidateIA: ParticipantIA = {
    participantId: `${strategyId}-consensus`,
    categories: candidateCategories,
    pairCount: candidateCategories.reduce(
      (sum, c) => sum + (c.cardIds.length * (c.cardIds.length - 1)) / 2,
      0
    ),
    placedCardCount: candidateCategories.reduce((sum, c) => sum + c.cardIds.length, 0),
    hasCategoryIdentity: true,
    unclearCardCount: 0,
    degeneracy: null,
  }
  const candidateAgreement = meanAgreementTo(candidateIA, members)

  // The whole justification for synthesizing is that it represents the group
  // better than any single member. If it does not, say so by not doing it.
  if (candidateAgreement < representativeAgreement) return fallback()

  const groups: ConsensusGroup[] = groupings.map((group, index) => {
    const cardsWithConfidence = [...group]
      .sort()
      .map((cardId) => ({
        cardId,
        label: cardLabels.get(cardId) ?? cardId,
        confidence: confidenceOf(cardId, group),
      }))
      .sort((a, b) => b.confidence - a.confidence || (a.label < b.label ? -1 : 1))

    const cohesion =
      cardsWithConfidence.reduce((sum, c) => sum + c.confidence, 0) /
      cardsWithConfidence.length

    return {
      id: `${strategyId}-g${index + 1}`,
      label: names[index].label,
      labelSupport: names[index].labelSupport,
      alternativeLabels: names[index].alternativeLabels,
      cards: cardsWithConfidence,
      cohesion,
    }
  })

  let closest = members[0]
  let closestScore = -1
  for (const member of members) {
    const score = calculateIASimilarity(candidateIA, member)
    if (score > closestScore) {
      closestScore = score
      closest = member
    }
  }

  return {
    strategyId,
    source: 'synthesized',
    groups,
    groupCount: groups.length,
    memberGroupCountRange,
    memberCount: members.length,
    meanAgreement: candidateAgreement,
    representativeAgreement,
    closestParticipantId: closest.participantId,
    lowConfidenceCardIds: groups
      .flatMap((g) => g.cards)
      .filter((c) => c.confidence < CONSENSUS_LOW_CONFIDENCE)
      .map((c) => c.cardId),
  }
}

/**
 * Cards that no strategy placed confidently.
 *
 * These are the cards worth a follow-up: a name change, a split, or a moderated
 * session asking why they were hard to place.
 */
export function contestedCards(
  consensuses: ConsensusIA[],
  limit = 10
): ContestedCard[] {
  const best = new Map<
    string,
    { label: string; placements: ContestedCard['placements']; bestConfidence: number }
  >()

  for (const consensus of consensuses) {
    for (const group of consensus.groups) {
      for (const card of group.cards) {
        const entry = best.get(card.cardId) ?? {
          label: card.label,
          placements: [],
          bestConfidence: 0,
        }
        entry.placements.push({
          strategyId: consensus.strategyId,
          groupLabel: group.label,
          confidence: card.confidence,
        })
        entry.bestConfidence = Math.max(entry.bestConfidence, card.confidence)
        best.set(card.cardId, entry)
      }
    }
  }

  return [...best.entries()]
    .map(([cardId, entry]) => ({
      cardId,
      label: entry.label,
      contention: 1 - entry.bestConfidence,
      placements: entry.placements.sort((a, b) => b.confidence - a.confidence),
    }))
    .filter((card) => card.contention > 0)
    .sort((a, b) => b.contention - a.contention || (a.label < b.label ? -1 : 1))
    .slice(0, limit)
}
