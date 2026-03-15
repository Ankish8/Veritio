import useSWR from 'swr'

/** Lazy loads card sort analysis with SWR caching. */
export function useCardSortAnalysis(studyId: string | null) {
  const { data, error, isLoading } = useSWR<any>(
    studyId ? `/api/studies/${studyId}/card-sort-analysis` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    analysis: data || null,
    error: error?.message || null,
    isLoading,
  }
}
