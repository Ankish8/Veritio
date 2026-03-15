/**
 * Segment Matching Functions
 *
 * Pure functions for determining if participants match segment conditions.
 * Extracted from segment-store.ts to enable reuse across frontend and backend.
 *
 * Condition Logic:
 * - V1: Flat array of conditions with AND logic
 * - V2: Groups of conditions with OR between groups, AND within groups
 *
 * Supported condition types:
 * - status: Participant completion status
 * - url_tag: Dynamic URL parameter tags
 * - categories_created: Number range (card sorts)
 * - question_response: Study flow question answers
 * - time_taken: Duration in seconds
 * - participant_id: Identifier search
 *
 * Study-specific condition types:
 * - First Impression: device_type, design_assignment, response_rate, response_tag
 * - Tree Test: task_success_rate, direct_success_rate, tasks_completed
 * - Prototype Test: task_success_rate, misclick_count
 * - First Click: correct_clicks_rate, tasks_completed
 * - Survey: questions_answered
 */

import type {
  Participant,
  StudyFlowResponseRow,
  StudyFlowQuestionRow,
  SegmentCondition,
  SegmentConditionsV2,
  SegmentConditionGroup,
} from '@veritio/study-types'

/**
 * Response data needed for time_taken and study-specific filtering
 */
export interface ResponseData {
  participant_id: string
  total_time_ms?: number | null

  // First Impression specific
  deviceType?: 'desktop' | 'tablet' | 'mobile' | null
  assignedDesignIds?: string[] // Design(s) shown to participant
  assignedTagIds?: string[] // Tags assigned to participant's responses
  responsesAnswered?: number
  totalQuestions?: number

  // Tree Test specific
  totalTasks?: number
  correctTaskCount?: number
  directTaskCount?: number
  completedTaskCount?: number // non-skipped

  // Prototype Test specific
  successfulTaskCount?: number
  totalMisclicks?: number

  // First Click specific
  correctClickCount?: number
  // Also uses completedTaskCount and totalTasks

  // Survey specific
  questionsAnsweredCount?: number
  // Also uses totalQuestions
}

/**
 * Check if a participant matches a single condition
 */
export function matchesCondition(
  participant: Participant,
  condition: SegmentCondition,
  flowResponses: StudyFlowResponseRow[],
  flowQuestions: StudyFlowQuestionRow[],
  responseData?: ResponseData
): boolean {
  switch (condition.type) {
    case 'status': {
      if (condition.operator === 'equals') {
        return participant.status === condition.value
      }
      if (condition.operator === 'not_equals') {
        return participant.status !== condition.value
      }
      if (condition.operator === 'in' && Array.isArray(condition.value)) {
        return participant.status ? (condition.value as string[]).includes(participant.status) : false
      }
      return false
    }

    case 'url_tag': {
      const tags = (participant.url_tags || {}) as Record<string, string>
      const tagValue = condition.tagKey ? tags[condition.tagKey] : undefined

      if (!tagValue) return false

      if (condition.operator === 'equals') {
        return tagValue === condition.value
      }
      if (condition.operator === 'not_equals') {
        return tagValue !== condition.value
      }
      if (condition.operator === 'contains' && typeof condition.value === 'string') {
        return tagValue.toLowerCase().includes(condition.value.toLowerCase())
      }
      if (condition.operator === 'in' && Array.isArray(condition.value)) {
        return (condition.value as string[]).includes(tagValue)
      }
      return false
    }

    case 'categories_created': {
      const count = participant.categories_created ?? 0

      if (condition.operator === 'equals') {
        return count === condition.value
      }
      if (condition.operator === 'greater_than' && typeof condition.value === 'number') {
        return count > condition.value
      }
      if (condition.operator === 'less_than' && typeof condition.value === 'number') {
        return count < condition.value
      }
      if (condition.operator === 'between' && Array.isArray(condition.value)) {
        const [min, max] = condition.value as [number, number]
        return count >= min && count <= max
      }
      return false
    }

    case 'question_response': {
      if (!condition.questionId) return false

      const response = flowResponses.find(
        r => r.participant_id === participant.id && r.question_id === condition.questionId
      )

      if (!response) return false

      const responseValue = response.response_value
      const question = flowQuestions.find(q => q.id === condition.questionId)

      // Handle different response types based on question type
      if (question?.question_type === 'checkbox' || question?.question_type === 'multiple_choice') {
        // Checkbox/multi-select responses can be arrays or objects with optionIds
        let selectedOptions: string[] = []

        if (Array.isArray(responseValue)) {
          selectedOptions = responseValue as string[]
        } else if (typeof responseValue === 'object' && responseValue !== null) {
          const val = responseValue as { optionIds?: string[]; optionId?: string }
          if (val.optionIds && Array.isArray(val.optionIds)) {
            selectedOptions = val.optionIds
          } else if (val.optionId) {
            selectedOptions = [val.optionId]
          }
        }

        if (condition.operator === 'contains' && typeof condition.value === 'string') {
          return selectedOptions.includes(condition.value)
        }
        if (condition.operator === 'in' && Array.isArray(condition.value)) {
          return (condition.value as string[]).some(v => selectedOptions.includes(v))
        }
        if (condition.operator === 'equals' && typeof condition.value === 'string') {
          return selectedOptions.includes(condition.value)
        }
        return false
      }

      if (question?.question_type === 'likert' || question?.question_type === 'nps' || question?.question_type === 'opinion_scale' || question?.question_type === 'slider') {
        // Numeric responses - can be direct number or object with value
        let numValue: number | null = null

        if (typeof responseValue === 'number') {
          numValue = responseValue
        } else if (typeof responseValue === 'object' && responseValue !== null) {
          const val = (responseValue as { value?: number }).value
          if (typeof val === 'number') {
            numValue = val
          }
        } else if (typeof responseValue === 'string') {
          numValue = parseInt(responseValue, 10)
        }

        if (numValue === null || isNaN(numValue)) return false

        if (condition.operator === 'equals') {
          return numValue === condition.value
        }
        if (condition.operator === 'greater_than' && typeof condition.value === 'number') {
          return numValue > condition.value
        }
        if (condition.operator === 'less_than' && typeof condition.value === 'number') {
          return numValue < condition.value
        }
        if (condition.operator === 'between' && Array.isArray(condition.value)) {
          const [min, max] = condition.value as [number, number]
          return numValue >= min && numValue <= max
        }
        return false
      }

      // Default: string comparison for radio, dropdown, text, yes_no
      let strValue: string = ''

      if (typeof responseValue === 'string') {
        strValue = responseValue
      } else if (typeof responseValue === 'boolean') {
        strValue = responseValue ? 'yes' : 'no'
      } else if (typeof responseValue === 'object' && responseValue !== null) {
        const val = responseValue as { value?: boolean; optionId?: string }
        if (typeof val.value === 'boolean') {
          strValue = val.value ? 'yes' : 'no'
        } else if (val.optionId) {
          strValue = val.optionId
        }
      } else {
        strValue = String(responseValue)
      }

      if (condition.operator === 'equals') {
        return strValue === condition.value
      }
      if (condition.operator === 'not_equals') {
        return strValue !== condition.value
      }
      if (condition.operator === 'contains' && typeof condition.value === 'string') {
        return strValue.toLowerCase().includes(condition.value.toLowerCase())
      }
      if (condition.operator === 'in' && Array.isArray(condition.value)) {
        return (condition.value as string[]).includes(strValue)
      }
      return false
    }

    case 'time_taken': {
      // Time taken is stored in milliseconds, but filter values are in seconds
      const timeMs = responseData?.total_time_ms
      if (timeMs === null || timeMs === undefined) return false

      const timeSeconds = timeMs / 1000

      if (condition.operator === 'equals' && typeof condition.value === 'number') {
        return Math.round(timeSeconds) === condition.value
      }
      if (condition.operator === 'greater_than' && typeof condition.value === 'number') {
        return timeSeconds > condition.value
      }
      if (condition.operator === 'less_than' && typeof condition.value === 'number') {
        return timeSeconds < condition.value
      }
      if (condition.operator === 'between' && Array.isArray(condition.value)) {
        const [min, max] = condition.value as [number, number]
        return timeSeconds >= min && timeSeconds <= max
      }
      return false
    }

    case 'participant_id': {
      const identifier = participant.identifier_value || participant.id

      if (condition.operator === 'equals') {
        return identifier === condition.value
      }
      if (condition.operator === 'not_equals') {
        return identifier !== condition.value
      }
      if (condition.operator === 'contains' && typeof condition.value === 'string') {
        return identifier.toLowerCase().includes(condition.value.toLowerCase())
      }
      return false
    }

    // =========================================================================
    // FIRST IMPRESSION CONDITIONS
    // =========================================================================

    case 'device_type': {
      const deviceType = responseData?.deviceType
      if (!deviceType) return false

      if (condition.operator === 'equals') {
        return deviceType === condition.value
      }
      if (condition.operator === 'not_equals') {
        return deviceType !== condition.value
      }
      return false
    }

    case 'design_assignment': {
      const assignedDesignIds = responseData?.assignedDesignIds || []
      if (assignedDesignIds.length === 0) return false

      // Check designId first (from condition), then fall back to value
      const targetDesignId = condition.designId || (condition.value as string)

      if (condition.operator === 'equals') {
        return assignedDesignIds.includes(targetDesignId)
      }
      if (condition.operator === 'not_equals') {
        return !assignedDesignIds.includes(targetDesignId)
      }
      return false
    }

    case 'response_rate': {
      const answered = responseData?.responsesAnswered ?? 0
      const total = responseData?.totalQuestions ?? 0
      if (total === 0) return false

      const rate = Math.round((answered / total) * 100)
      return matchNumericCondition(rate, condition)
    }

    case 'response_tag': {
      const assignedTagIds = responseData?.assignedTagIds || []
      if (assignedTagIds.length === 0 && condition.operator === 'equals') return false

      // Use responseTagId from condition, or fall back to value
      const targetTagId = condition.responseTagId || (condition.value as string)

      if (condition.operator === 'equals') {
        return assignedTagIds.includes(targetTagId)
      }
      if (condition.operator === 'not_equals') {
        return !assignedTagIds.includes(targetTagId)
      }
      return false
    }

    // =========================================================================
    // TREE TEST CONDITIONS
    // =========================================================================

    case 'task_success_rate': {
      const correct = responseData?.correctTaskCount ?? responseData?.successfulTaskCount ?? 0
      const total = responseData?.totalTasks ?? 0
      if (total === 0) return false

      const rate = Math.round((correct / total) * 100)
      return matchNumericCondition(rate, condition)
    }

    case 'direct_success_rate': {
      const direct = responseData?.directTaskCount ?? 0
      const total = responseData?.totalTasks ?? 0
      if (total === 0) return false

      const rate = Math.round((direct / total) * 100)
      return matchNumericCondition(rate, condition)
    }

    case 'tasks_completed': {
      const completed = responseData?.completedTaskCount ?? 0
      return matchNumericCondition(completed, condition)
    }

    // =========================================================================
    // PROTOTYPE TEST CONDITIONS
    // =========================================================================

    case 'misclick_count': {
      const misclicks = responseData?.totalMisclicks ?? 0
      return matchNumericCondition(misclicks, condition)
    }

    // =========================================================================
    // FIRST CLICK CONDITIONS
    // =========================================================================

    case 'correct_clicks_rate': {
      const correct = responseData?.correctClickCount ?? 0
      const total = responseData?.totalTasks ?? 0
      if (total === 0) return false

      const rate = Math.round((correct / total) * 100)
      return matchNumericCondition(rate, condition)
    }

    // =========================================================================
    // SURVEY CONDITIONS
    // =========================================================================

    case 'questions_answered': {
      const answered = responseData?.questionsAnsweredCount ?? 0
      return matchNumericCondition(answered, condition)
    }

    default:
      return true
  }
}

/**
 * Helper function for numeric condition matching
 */
function matchNumericCondition(value: number, condition: SegmentCondition): boolean {
  if (condition.operator === 'equals' && typeof condition.value === 'number') {
    return value === condition.value
  }
  if (condition.operator === 'greater_than' && typeof condition.value === 'number') {
    return value > condition.value
  }
  if (condition.operator === 'less_than' && typeof condition.value === 'number') {
    return value < condition.value
  }
  if (condition.operator === 'between' && Array.isArray(condition.value)) {
    const [min, max] = condition.value as [number, number]
    return value >= min && value <= max
  }
  return false
}

/**
 * Check if a participant matches a group of conditions (AND logic)
 */
export function matchesConditionGroup(
  participant: Participant,
  group: SegmentConditionGroup,
  flowResponses: StudyFlowResponseRow[],
  flowQuestions: StudyFlowQuestionRow[],
  responseData?: ResponseData
): boolean {
  // Empty group matches all
  if (group.conditions.length === 0) return true

  // All conditions in a group must match (AND logic)
  return group.conditions.every((condition) =>
    matchesCondition(participant, condition, flowResponses, flowQuestions, responseData)
  )
}

/**
 * Check if a participant matches V2 conditions (OR logic between groups)
 */
export function matchesConditionsV2(
  participant: Participant,
  conditions: SegmentConditionsV2,
  flowResponses: StudyFlowResponseRow[],
  flowQuestions: StudyFlowQuestionRow[],
  responseData?: ResponseData
): boolean {
  // No groups = no filtering = match all
  if (conditions.groups.length === 0) return true

  // At least one group must match (OR logic between groups)
  return conditions.groups.some((group) =>
    matchesConditionGroup(participant, group, flowResponses, flowQuestions, responseData)
  )
}

/**
 * Calculate which participants match a set of V1 conditions (AND logic).
 * For V2 conditions, use matchesConditionsV2 directly.
 */
export function calculateMatchingParticipants(
  participants: Participant[],
  conditions: SegmentCondition[],
  flowResponses: StudyFlowResponseRow[],
  flowQuestions: StudyFlowQuestionRow[],
  responses?: ResponseData[]
): Set<string> {
  if (conditions.length === 0) {
    return new Set(participants.map(p => p.id))
  }

  const matchingIds = new Set<string>()

  // Create a map for quick response lookup by participant_id
  const responseByParticipant = new Map<string, ResponseData>()
  responses?.forEach(r => responseByParticipant.set(r.participant_id, r))

  for (const participant of participants) {
    const matchesAll = conditions.every(condition =>
      matchesCondition(participant, condition, flowResponses, flowQuestions, responseByParticipant.get(participant.id))
    )

    if (matchesAll) {
      matchingIds.add(participant.id)
    }
  }

  return matchingIds
}
