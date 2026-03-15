/**
 * Participant Flagging Algorithm for Card Sorting Analysis
 *
 * Automatically detects quality issues in participant responses:
 * - All cards in one group (no differentiation)
 * - Each card in its own group (no grouping)
 * - No card movement (0% activity)
 * - Too fast (completed much faster than median)
 * - Too slow (completed much slower than median)
 *
 * Based on Optimal Workshop's flagging patterns.
 */

import type { ParticipantFlagType } from '@veritio/study-types'

/**
 * A detected flag for a participant
 */
export interface ParticipantFlag {
  type: ParticipantFlagType
  reason: string
}

/**
 * Result of flagging analysis for a single participant
 */
export interface FlagResult {
  participantId: string
  responseId: string
  flags: ParticipantFlag[]
}

/**
 * Statistics about all participants for threshold calculation
 */
export interface ParticipantStats {
  medianTimeMs: number
  totalCards: number
}

/**
 * Detect if all cards were placed in a single category
 * This indicates no differentiation - participant didn't engage meaningfully
 */
export function detectAllCardsInOneGroup(
  cardPlacements: Record<string, string>
): boolean {
  const categories = new Set(Object.values(cardPlacements))
  return categories.size === 1 && Object.keys(cardPlacements).length > 1
}

/**
 * Detect if each card was placed in its own unique category
 * This indicates no grouping - participant didn't try to find relationships
 */
export function detectEachCardOwnGroup(
  cardPlacements: Record<string, string>,
  totalCards: number
): boolean {
  const uniqueCategories = new Set(Object.values(cardPlacements))
  const placedCards = Object.keys(cardPlacements).length
  // Each card in own category = number of categories equals number of placed cards
  return uniqueCategories.size === placedCards && placedCards === totalCards
}

/**
 * Detect if no cards were moved/sorted
 * cardMovementPercentage should be calculated during submission
 */
export function detectNoCardMovement(
  cardPlacements: Record<string, string>
): boolean {
  return Object.keys(cardPlacements).length === 0
}

/**
 * Detect time anomalies compared to median
 * - Too fast: less than 10% of median time
 * - Too slow: more than 500% of median time (5x)
 */
export function detectTimeAnomaly(
  timeMs: number | null,
  medianTimeMs: number
): 'too_fast' | 'too_slow' | null {
  if (!timeMs || !medianTimeMs || medianTimeMs === 0) {
    return null
  }

  const ratio = timeMs / medianTimeMs

  // Less than 10% of median = suspiciously fast
  if (ratio < 0.1) {
    return 'too_fast'
  }

  // More than 500% of median = suspiciously slow
  if (ratio > 5) {
    return 'too_slow'
  }

  return null
}

/**
 * Calculate median time from an array of completion times
 */
export function calculateMedianTime(times: (number | null)[]): number {
  const validTimes = times.filter((t): t is number => t !== null && t > 0)

  if (validTimes.length === 0) {
    return 0
  }

  validTimes.sort((a, b) => a - b)
  const mid = Math.floor(validTimes.length / 2)

  if (validTimes.length % 2 === 0) {
    return (validTimes[mid - 1] + validTimes[mid]) / 2
  }

  return validTimes[mid]
}

/**
 * Generate a human-readable reason for each flag type
 */
function getFlagReason(
  type: ParticipantFlagType,
  details?: { timeMs?: number; medianTimeMs?: number; categoryCount?: number; cardCount?: number }
): string {
  switch (type) {
    case 'all_one_group':
      return `All ${details?.cardCount || 'cards'} cards were placed in a single category`
    case 'each_own_group':
      return `Each card was placed in its own category (${details?.categoryCount || 'multiple'} categories for ${details?.cardCount || 'same'} cards)`
    case 'no_movement':
      return 'No cards were sorted or moved during the session'
    case 'too_fast':
      if (details?.timeMs && details?.medianTimeMs) {
        const ratio = Math.round((details.timeMs / details.medianTimeMs) * 100)
        return `Completed in ${formatTime(details.timeMs)} (${ratio}% of median time ${formatTime(details.medianTimeMs)})`
      }
      return 'Completed significantly faster than other participants'
    case 'too_slow':
      if (details?.timeMs && details?.medianTimeMs) {
        const ratio = Math.round((details.timeMs / details.medianTimeMs) * 100)
        return `Completed in ${formatTime(details.timeMs)} (${ratio}% of median time ${formatTime(details.medianTimeMs)})`
      }
      return 'Completed significantly slower than other participants'
    default:
      return `Flagged as ${type}`
  }
}

/**
 * Format milliseconds as a human-readable time string
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Analyze a single response for quality flags
 */
export function flagSingleResponse(
  response: {
    id: string
    participant_id: string
    card_placements: Record<string, string>
    total_time_ms: number | null
  },
  totalCards: number,
  medianTimeMs: number
): FlagResult {
  const flags: ParticipantFlag[] = []
  const placements = response.card_placements || {}
  const placedCardCount = Object.keys(placements).length
  const categoryCount = new Set(Object.values(placements)).size

  // Check for all cards in one group
  if (detectAllCardsInOneGroup(placements)) {
    flags.push({
      type: 'all_one_group',
      reason: getFlagReason('all_one_group', { cardCount: placedCardCount }),
    })
  }

  // Check for each card in own group
  if (detectEachCardOwnGroup(placements, totalCards)) {
    flags.push({
      type: 'each_own_group',
      reason: getFlagReason('each_own_group', { categoryCount, cardCount: placedCardCount }),
    })
  }

  // Check for no movement
  if (detectNoCardMovement(placements)) {
    flags.push({
      type: 'no_movement',
      reason: getFlagReason('no_movement'),
    })
  }

  // Check for time anomalies
  const timeAnomaly = detectTimeAnomaly(response.total_time_ms, medianTimeMs)
  if (timeAnomaly) {
    flags.push({
      type: timeAnomaly,
      reason: getFlagReason(timeAnomaly, {
        timeMs: response.total_time_ms || undefined,
        medianTimeMs,
      }),
    })
  }

  return {
    participantId: response.participant_id,
    responseId: response.id,
    flags,
  }
}

/**
 * Auto-flag all responses in a study
 * Main entry point for the flagging algorithm
 */
export function autoFlagParticipants(
  responses: Array<{
    id: string
    participant_id: string
    card_placements: Record<string, string>
    total_time_ms: number | null
  }>,
  cards: Array<{ id: string; label: string }>
): FlagResult[] {
  if (responses.length === 0) {
    return []
  }

  const totalCards = cards.length

  // Calculate median time for comparison
  const medianTimeMs = calculateMedianTime(
    responses.map((r) => r.total_time_ms)
  )

  // Flag each response
  return responses.map((response) =>
    flagSingleResponse(response, totalCards, medianTimeMs)
  )
}

/**
 * Summary statistics about flags in a study
 */
export interface FlagSummary {
  totalParticipants: number
  flaggedParticipants: number
  flagCounts: Record<ParticipantFlagType, number>
}

/**
 * Get summary statistics about flags
 */
export function summarizeFlags(results: FlagResult[]): FlagSummary {
  const flagCounts: Record<ParticipantFlagType, number> = {
    all_one_group: 0,
    each_own_group: 0,
    no_movement: 0,
    too_fast: 0,
    too_slow: 0,
    speeder: 0,
    straightliner: 0,
    incomplete: 0,
    duplicate: 0,
    bot_suspected: 0,
  }

  let flaggedCount = 0

  for (const result of results) {
    if (result.flags.length > 0) {
      flaggedCount++
    }
    for (const flag of result.flags) {
      flagCounts[flag.type]++
    }
  }

  return {
    totalParticipants: results.length,
    flaggedParticipants: flaggedCount,
    flagCounts,
  }
}
