'use client'

import { useMemo } from 'react'
import type { StudyFlowResponseRow } from '@veritio/study-types'

interface UseQuestionResponsesParams {
  questionId: string
  responses: StudyFlowResponseRow[]
  filteredParticipantIds: Set<string> | null
  hideEmptyResponses: boolean
}

interface UseQuestionResponsesResult {
  /** Filtered responses for this question */
  filteredResponses: StudyFlowResponseRow[]
  /** Number of responses after filtering */
  responseCount: number
  /** Number of unique participants who answered (after segment filter) */
  answeredCount: number
  /** Total participants in the filtered set */
  totalParticipants: number
}

/**
 * Hook to filter and aggregate responses for a single question.
 * Handles segment filtering and "hide empty responses" toggle.
 */
export function useQuestionResponses({
  questionId,
  responses,
  filteredParticipantIds,
  hideEmptyResponses,
}: UseQuestionResponsesParams): UseQuestionResponsesResult {
  return useMemo(() => {
    // Step 1: Get responses for this specific question
    let questionResponses = responses.filter(r => r.question_id === questionId)

    // Step 2: Apply segment filter
    if (filteredParticipantIds !== null) {
      questionResponses = questionResponses.filter(r =>
        filteredParticipantIds.has(r.participant_id)
      )
    }

    // Step 3: Optionally filter out empty/null responses
    if (hideEmptyResponses) {
      questionResponses = questionResponses.filter(r => {
        const value = r.response_value
        if (value === null || value === undefined) return false
        if (typeof value === 'string' && value.trim() === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        if (typeof value === 'object' && 'optionIds' in value) {
          const v = value as { optionIds?: string[] }
          if (!v.optionIds || v.optionIds.length === 0) return false
        }
        return true
      })
    }

    // Calculate total participants (from filtered set or all responses)
    const totalParticipants = filteredParticipantIds !== null
      ? filteredParticipantIds.size
      : new Set(responses.map(r => r.participant_id)).size

    // Count unique participants who answered this question
    const answeredCount = new Set(questionResponses.map(r => r.participant_id)).size

    return {
      filteredResponses: questionResponses,
      responseCount: questionResponses.length,
      answeredCount,
      totalParticipants,
    }
  }, [questionId, responses, filteredParticipantIds, hideEmptyResponses])
}
