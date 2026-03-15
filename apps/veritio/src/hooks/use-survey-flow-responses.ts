import useSWR from 'swr'

/**
 * Hook to lazy load survey flow responses (can be 10,000+ rows).
 * Uses SWR for automatic caching - second visit is instant!
 */
export function useSurveyFlowResponses(studyId: string | null) {
  const { data, error, isLoading } = useSWR<any[]>(
    studyId ? `/api/studies/${studyId}/survey-flow-responses` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    flowResponses: data || [],
    error: error?.message || null,
    isLoading,
  }
}
