/**
 * Segment Statistics
 *
 * Utilities for calculating statistics for participant segments.
 */

import type {
  SegmentStatistics,
  Participant,
  StudyFlowResponseRow,
} from '@veritio/study-types'

// =============================================================================
// Statistics Calculation
// =============================================================================

/**
 * Calculate statistics for a set of participants
 */
export function calculateSegmentStatistics(params: {
  participants: Participant[]
  flowResponses?: StudyFlowResponseRow[]
  npsQuestionId?: string
  /** Response data with time information */
  responses?: Array<{ participant_id: string; total_time_ms?: number | null }>
}): SegmentStatistics {
  const { participants, flowResponses, npsQuestionId, responses } = params

  if (participants.length === 0) {
    return {
      participantCount: 0,
      completionRate: 0,
      averageTimeSeconds: 0,
      medianTimeSeconds: 0,
    }
  }

  // Basic counts
  const total = participants.length
  const completed = participants.filter((p) => p.status === 'completed').length
  const completionRate = (completed / total) * 100

  // Create time lookup from responses
  const timeByParticipant = new Map<string, number>()
  responses?.forEach((r) => {
    if (r.total_time_ms) {
      timeByParticipant.set(r.participant_id, r.total_time_ms)
    }
  })

  // Time statistics (only for completed participants with time data)
  const times = participants
    .filter((p) => p.status === 'completed' && timeByParticipant.has(p.id))
    .map((p) => Math.round((timeByParticipant.get(p.id) || 0) / 1000))

  const averageTimeSeconds =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0

  const medianTimeSeconds =
    times.length > 0
      ? [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)]
      : 0

  // NPS calculation if applicable
  let npsScore: number | undefined
  let npsBreakdown: SegmentStatistics['npsBreakdown'] | undefined

  if (npsQuestionId && flowResponses) {
    const npsData = calculateNpsForParticipants(
      participants.map((p) => p.id),
      flowResponses,
      npsQuestionId
    )
    npsScore = npsData.score
    npsBreakdown = npsData.breakdown
  }

  return {
    participantCount: total,
    completionRate,
    averageTimeSeconds,
    medianTimeSeconds,
    npsScore,
    npsBreakdown,
  }
}

/**
 * Calculate NPS score and breakdown for a set of participants
 */
function calculateNpsForParticipants(
  participantIds: string[],
  flowResponses: StudyFlowResponseRow[],
  npsQuestionId: string
): { score: number | undefined; breakdown: SegmentStatistics['npsBreakdown'] } {
  const participantSet = new Set(participantIds)

  // Get NPS responses for these participants
  const npsResponses = flowResponses
    .filter(
      (r) =>
        r.question_id === npsQuestionId && participantSet.has(r.participant_id)
    )
    .map((r) => extractNpsValue(r.response_value))
    .filter((v): v is number => v !== null)

  if (npsResponses.length === 0) {
    return { score: undefined, breakdown: undefined }
  }

  // Categorize responses
  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const score of npsResponses) {
    if (score >= 9) {
      promoters++
    } else if (score >= 7) {
      passives++
    } else {
      detractors++
    }
  }

  const total = npsResponses.length
  const npsScore = Math.round(((promoters - detractors) / total) * 100)

  return {
    score: npsScore,
    breakdown: { promoters, passives, detractors },
  }
}

/**
 * Extract numeric NPS value from response
 */
function extractNpsValue(responseValue: unknown): number | null {
  if (typeof responseValue === 'number') {
    return responseValue
  }

  if (typeof responseValue === 'object' && responseValue !== null) {
    const val = (responseValue as { value?: number }).value
    if (typeof val === 'number') {
      return val
    }
  }

  return null
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format time in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

/**
 * Format completion rate as percentage
 */
export function formatCompletionRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}

/**
 * Format NPS score with sign
 */
export function formatNpsScore(score: number): string {
  if (score > 0) return `+${score}`
  return String(score)
}

/**
 * Get NPS score color class
 */
export function getNpsColorClass(score: number): string {
  if (score >= 50) return 'text-emerald-600'
  if (score >= 0) return 'text-amber-600'
  return 'text-red-600'
}
