/**
 * Participant Flagging Algorithm for First Impression Tests
 *
 * Automatically detects quality issues in participant responses:
 * - Speeder: completed much faster than median
 * - Slow responder: completed much slower than median
 * - No responses: viewed designs but didn't answer questions
 * - Partial responses: answered some but not all questions
 *
 * Adapted from card-sort flagging algorithm.
 */

import { formatTime } from '../utils'

/**
 * Flag types specific to First Impression tests
 */
export type FirstImpressionFlagType =
  | 'speeder'           // Completed too fast (< 10% median time)
  | 'slow_responder'    // Completed too slow (> 500% median time)
  | 'no_responses'      // Viewed designs but answered no questions
  | 'partial_responses' // Answered some but not all questions

/**
 * A detected flag for a participant
 */
export interface FirstImpressionFlag {
  type: FirstImpressionFlagType
  reason: string
  /** Severity level for visual styling */
  severity: 'warning' | 'error'
}

/**
 * Input data for flagging a single participant
 */
export interface FirstImpressionParticipantData {
  participantId: string
  totalTimeMs: number | null
  exposureCount: number
  responsesAnswered: number
  totalQuestions: number
}

/**
 * Result of flagging analysis for a single participant
 */
export interface FirstImpressionFlagResult {
  participantId: string
  flags: FirstImpressionFlag[]
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect time anomalies compared to median
 * - Speeder: less than 10% of median time
 * - Slow: more than 500% of median time (5x)
 */
export function detectTimeAnomaly(
  timeMs: number | null,
  medianTimeMs: number
): 'speeder' | 'slow_responder' | null {
  if (!timeMs || !medianTimeMs || medianTimeMs === 0) {
    return null
  }

  const ratio = timeMs / medianTimeMs

  // Less than 10% of median = suspiciously fast
  if (ratio < 0.1) {
    return 'speeder'
  }

  // More than 500% of median = suspiciously slow
  if (ratio > 5) {
    return 'slow_responder'
  }

  return null
}

/**
 * Detect if participant viewed designs but didn't answer any questions
 */
export function detectNoResponses(
  exposureCount: number,
  responsesAnswered: number
): boolean {
  return exposureCount > 0 && responsesAnswered === 0
}

/**
 * Detect if participant only answered some questions
 */
export function detectPartialResponses(
  responsesAnswered: number,
  totalQuestions: number
): boolean {
  return totalQuestions > 0 &&
    responsesAnswered > 0 &&
    responsesAnswered < totalQuestions
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDIAN CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// FLAG REASONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable reason for each flag type
 */
function getFlagReason(
  type: FirstImpressionFlagType,
  details?: {
    timeMs?: number
    medianTimeMs?: number
    responsesAnswered?: number
    totalQuestions?: number
  }
): string {
  switch (type) {
    case 'speeder':
      if (details?.timeMs && details?.medianTimeMs) {
        const ratio = Math.round((details.timeMs / details.medianTimeMs) * 100)
        return `Completed in ${formatTime(details.timeMs)} (${ratio}% of median ${formatTime(details.medianTimeMs)})`
      }
      return 'Completed significantly faster than other participants'

    case 'slow_responder':
      if (details?.timeMs && details?.medianTimeMs) {
        const ratio = Math.round((details.timeMs / details.medianTimeMs) * 100)
        return `Completed in ${formatTime(details.timeMs)} (${ratio}% of median ${formatTime(details.medianTimeMs)})`
      }
      return 'Completed significantly slower than other participants'

    case 'no_responses':
      return 'Viewed design(s) but did not answer any questions'

    case 'partial_responses':
      if (details?.responsesAnswered !== undefined && details?.totalQuestions) {
        return `Answered ${details.responsesAnswered} of ${details.totalQuestions} questions`
      }
      return 'Only answered some of the questions'

    default:
      return `Flagged as ${type}`
  }
}

/**
 * Get severity level for a flag type
 */
function getFlagSeverity(type: FirstImpressionFlagType): 'warning' | 'error' {
  switch (type) {
    case 'no_responses':
      return 'error'
    case 'speeder':
      return 'warning'
    case 'slow_responder':
      return 'warning'
    case 'partial_responses':
      return 'warning'
    default:
      return 'warning'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FLAGGING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze a single participant for quality flags
 */
export function flagSingleParticipant(
  data: FirstImpressionParticipantData,
  medianTimeMs: number
): FirstImpressionFlagResult {
  const flags: FirstImpressionFlag[] = []

  // Check for time anomalies
  const timeAnomaly = detectTimeAnomaly(data.totalTimeMs, medianTimeMs)
  if (timeAnomaly) {
    flags.push({
      type: timeAnomaly,
      reason: getFlagReason(timeAnomaly, {
        timeMs: data.totalTimeMs || undefined,
        medianTimeMs,
      }),
      severity: getFlagSeverity(timeAnomaly),
    })
  }

  // Check for no responses
  if (detectNoResponses(data.exposureCount, data.responsesAnswered)) {
    flags.push({
      type: 'no_responses',
      reason: getFlagReason('no_responses'),
      severity: getFlagSeverity('no_responses'),
    })
  }

  // Check for partial responses
  if (detectPartialResponses(data.responsesAnswered, data.totalQuestions)) {
    flags.push({
      type: 'partial_responses',
      reason: getFlagReason('partial_responses', {
        responsesAnswered: data.responsesAnswered,
        totalQuestions: data.totalQuestions,
      }),
      severity: getFlagSeverity('partial_responses'),
    })
  }

  return {
    participantId: data.participantId,
    flags,
  }
}

/**
 * Auto-flag all participants in a First Impression study
 * Main entry point for the flagging algorithm
 */
export function autoFlagFirstImpressionParticipants(
  participants: FirstImpressionParticipantData[]
): Map<string, FirstImpressionFlag[]> {
  if (participants.length === 0) {
    return new Map()
  }

  // Calculate median time for comparison
  const medianTimeMs = calculateMedianTime(
    participants.map((p) => p.totalTimeMs)
  )

  // Flag each participant
  const flagMap = new Map<string, FirstImpressionFlag[]>()

  for (const participant of participants) {
    const result = flagSingleParticipant(participant, medianTimeMs)
    if (result.flags.length > 0) {
      flagMap.set(result.participantId, result.flags)
    }
  }

  return flagMap
}

/**
 * Summary statistics about flags in a study
 */
export interface FirstImpressionFlagSummary {
  totalParticipants: number
  flaggedParticipants: number
  flagCounts: Record<FirstImpressionFlagType, number>
}

/**
 * Get summary statistics about flags
 */
export function summarizeFlags(
  flagMap: Map<string, FirstImpressionFlag[]>,
  totalParticipants: number
): FirstImpressionFlagSummary {
  const flagCounts: Record<FirstImpressionFlagType, number> = {
    speeder: 0,
    slow_responder: 0,
    no_responses: 0,
    partial_responses: 0,
  }

  for (const flags of flagMap.values()) {
    for (const flag of flags) {
      flagCounts[flag.type]++
    }
  }

  return {
    totalParticipants,
    flaggedParticipants: flagMap.size,
    flagCounts,
  }
}
