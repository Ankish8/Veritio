import useSWR from 'swr'
import type { PrototypeTestOverviewData } from '../services/prototype-test-overview'
export function usePrototypeTestOverview(studyId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PrototypeTestOverviewData>(
    studyId ? `/api/studies/${studyId}/prototype-test-results/overview` : null,
    {
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: true, // Refetch when connection restores
    }
  )

  return {
    data,
    error: error?.message || null,
    isLoading,
    mutate, // For manual revalidation if needed
  }
}
