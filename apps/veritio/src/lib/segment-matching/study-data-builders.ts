/**
 * Study Data Builders
 *
 * Helper functions to build ResponseData for segment condition matching
 * from raw study-specific data. Each study type has its own builder function.
 */

import type { ResponseData } from './matchers'

// =============================================================================
// FIRST IMPRESSION
// =============================================================================

export interface FirstImpressionSessionData {
  participant_id: string
  device_type?: 'desktop' | 'tablet' | 'mobile' | null
  assigned_design_id?: string | null
  design_sequence?: string[] | null
  total_time_ms?: number | null
}

export interface FirstImpressionResponseData {
  participant_id: string
  response_id?: string // Response ID for tag assignment lookups
  design_id: string
  question_id: string
}

/**
 * Tag assignment data for response tag filtering
 */
export interface ResponseTagAssignmentData {
  response_id: string
  tag_id: string
}

/**
 * Build ResponseData for a First Impression participant
 */
export function buildFirstImpressionResponseData(
  participantId: string,
  session: FirstImpressionSessionData | undefined,
  responses: FirstImpressionResponseData[],
  totalQuestionsPerDesign: number,
  tagAssignments?: ResponseTagAssignmentData[]
): ResponseData {
  const participantResponses = responses.filter((r) => r.participant_id === participantId)

  // Collect all design IDs shown to this participant
  const assignedDesignIds: string[] = []
  if (session?.assigned_design_id) {
    assignedDesignIds.push(session.assigned_design_id)
  }
  if (session?.design_sequence) {
    for (const id of session.design_sequence) {
      if (!assignedDesignIds.includes(id)) {
        assignedDesignIds.push(id)
      }
    }
  }

  // Collect all tag IDs from participant's responses
  const assignedTagIds: string[] = []
  if (tagAssignments) {
    const responseIds = new Set(participantResponses.map((r) => r.response_id).filter(Boolean))
    for (const assignment of tagAssignments) {
      if (responseIds.has(assignment.response_id) && !assignedTagIds.includes(assignment.tag_id)) {
        assignedTagIds.push(assignment.tag_id)
      }
    }
  }

  // Calculate response rate across all designs
  const designCount = assignedDesignIds.length || 1
  const totalQuestions = totalQuestionsPerDesign * designCount

  return {
    participant_id: participantId,
    total_time_ms: session?.total_time_ms,
    deviceType: session?.device_type,
    assignedDesignIds,
    assignedTagIds,
    responsesAnswered: participantResponses.length,
    totalQuestions,
  }
}

// =============================================================================
// TREE TEST
// =============================================================================

export interface TreeTestResponseData {
  participant_id: string
  is_correct?: boolean | null
  is_direct?: boolean | null
  is_skipped?: boolean | null
}

/**
 * Build ResponseData for a Tree Test participant
 */
export function buildTreeTestResponseData(
  participantId: string,
  responses: TreeTestResponseData[],
  totalTasks: number,
  totalTimeMs?: number | null
): ResponseData {
  const participantResponses = responses.filter((r) => r.participant_id === participantId)

  let correctCount = 0
  let directCount = 0
  let completedCount = 0

  for (const r of participantResponses) {
    if (r.is_correct) correctCount++
    if (r.is_direct) directCount++
    if (!r.is_skipped) completedCount++
  }

  return {
    participant_id: participantId,
    total_time_ms: totalTimeMs,
    totalTasks,
    correctTaskCount: correctCount,
    directTaskCount: directCount,
    completedTaskCount: completedCount,
  }
}

// =============================================================================
// PROTOTYPE TEST
// =============================================================================

export interface PrototypeTestTaskAttemptData {
  participant_id: string
  outcome?: string | null
  misclick_count?: number | null
}

/**
 * Build ResponseData for a Prototype Test participant
 */
export function buildPrototypeTestResponseData(
  participantId: string,
  taskAttempts: PrototypeTestTaskAttemptData[],
  totalTasks: number,
  totalTimeMs?: number | null
): ResponseData {
  const participantAttempts = taskAttempts.filter((a) => a.participant_id === participantId)

  let successCount = 0
  let totalMisclicks = 0
  let completedCount = 0

  for (const a of participantAttempts) {
    if (a.outcome === 'success') successCount++
    if (a.outcome !== 'abandoned') completedCount++
    totalMisclicks += a.misclick_count || 0
  }

  return {
    participant_id: participantId,
    total_time_ms: totalTimeMs,
    totalTasks,
    successfulTaskCount: successCount,
    completedTaskCount: completedCount,
    totalMisclicks,
  }
}

// =============================================================================
// FIRST CLICK
// =============================================================================

export interface FirstClickResponseData {
  participant_id: string
  is_correct?: boolean | null
  is_skipped?: boolean | null
}

/**
 * Build ResponseData for a First Click participant
 */
export function buildFirstClickResponseData(
  participantId: string,
  responses: FirstClickResponseData[],
  totalTasks: number,
  totalTimeMs?: number | null
): ResponseData {
  const participantResponses = responses.filter((r) => r.participant_id === participantId)

  let correctCount = 0
  let completedCount = 0

  for (const r of participantResponses) {
    if (r.is_correct) correctCount++
    if (!r.is_skipped) completedCount++
  }

  return {
    participant_id: participantId,
    total_time_ms: totalTimeMs,
    totalTasks,
    correctClickCount: correctCount,
    completedTaskCount: completedCount,
  }
}

// =============================================================================
// SURVEY
// =============================================================================

export interface SurveyResponseData {
  participant_id: string
  question_id: string
}

/**
 * Build ResponseData for a Survey participant
 */
export function buildSurveyResponseData(
  participantId: string,
  responses: SurveyResponseData[],
  totalQuestions: number,
  totalTimeMs?: number | null
): ResponseData {
  const participantResponses = responses.filter((r) => r.participant_id === participantId)

  return {
    participant_id: participantId,
    total_time_ms: totalTimeMs,
    questionsAnsweredCount: participantResponses.length,
    totalQuestions,
  }
}

// =============================================================================
// CARD SORT (already supported, but adding for completeness)
// =============================================================================

/**
 * Build ResponseData for a Card Sort participant
 * Note: Card Sort uses categories_created from the Participant directly,
 * so this only handles time_taken.
 */
export function buildCardSortResponseData(
  participantId: string,
  totalTimeMs?: number | null
): ResponseData {
  return {
    participant_id: participantId,
    total_time_ms: totalTimeMs,
  }
}

// =============================================================================
// GENERIC BUILDER
// =============================================================================

export type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'

/**
 * Build a map of participant IDs to ResponseData for efficient lookup
 */
export function buildResponseDataMap<T extends { participant_id: string }>(
  items: T[],
  builder: (item: T) => ResponseData
): Map<string, ResponseData> {
  const map = new Map<string, ResponseData>()
  for (const item of items) {
    map.set(item.participant_id, builder(item))
  }
  return map
}
