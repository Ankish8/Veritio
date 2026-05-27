import { useMemo } from 'react'
import useSWR from 'swr'
import type { StudyFlowResponseRow } from '@veritio/study-types'

interface UseSurveyFlowResponsesOptions {
  participantIds?: Set<string> | string[] | null
}

export function filterFlowResponsesByParticipantScope(
  responses: StudyFlowResponseRow[],
  participantIds: Set<string> | null
) {
  if (!participantIds) return responses
  return responses.filter(response => participantIds.has(response.participant_id))
}

/**
 * Hook to lazy load survey flow responses (can be 10,000+ rows).
 * Uses SWR for automatic caching - second visit is instant!
 */
export function useSurveyFlowResponses(
  studyId: string | null,
  options: UseSurveyFlowResponsesOptions = {}
) {
  const participantIdSet = useMemo(() => {
    if (!options.participantIds) return null
    return options.participantIds instanceof Set
      ? options.participantIds
      : new Set(options.participantIds)
  }, [options.participantIds])

  const shouldFetch = Boolean(studyId && (!participantIdSet || participantIdSet.size > 0))

  const { data, error, isLoading } = useSWR<StudyFlowResponseRow[]>(
    shouldFetch && studyId ? `/api/studies/${studyId}/survey-flow-responses` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  const flowResponses = useMemo(() => {
    const responses = data || []
    return filterFlowResponsesByParticipantScope(responses, participantIdSet)
  }, [data, participantIdSet])

  return {
    flowResponses,
    error: error?.message || null,
    isLoading,
  }
}
