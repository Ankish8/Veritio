import useSWR from 'swr'
import type { PrototypeTestOverviewData } from '@/services/results/prototype-test-overview'

export function usePrototypeTestOverview(studyId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PrototypeTestOverviewData>(
    studyId ? `/api/studies/${studyId}/prototype-test-results/overview` : null,
    {
      // 5s: overview data changes as new participants complete tasks
      dedupingInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    data,
    error: error?.message ?? null,
    isLoading,
    mutate,
  }
}
