import useSWR from 'swr'
export function usePrototypeTestSessions(studyId: string | null) {
  const { data, error, isLoading } = useSWR<any[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-sessions` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    sessions: data || [],
    error: error?.message || null,
    isLoading,
  }
}
