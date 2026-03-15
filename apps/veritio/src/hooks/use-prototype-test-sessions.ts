import useSWR from 'swr'
import type { PrototypeTestSession } from '@veritio/study-types'

/** Lazy loads prototype test sessions for detailed analysis. */
export function usePrototypeTestSessions(studyId: string | null) {
  const { data, error, isLoading } = useSWR<PrototypeTestSession[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-sessions` : null,
    {
      revalidateOnFocus: false,
      // 60s: session structure is static once created, rarely changes during analysis
      dedupingInterval: 60000,
    }
  )

  return {
    sessions: data ?? [],
    error: error?.message ?? null,
    isLoading,
  }
}
