import useSWR from 'swr'
export function usePrototypeTestFrames(studyId: string | null) {
  const { data, error, isLoading } = useSWR<any[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-frames` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    frames: data || [],
    error: error?.message || null,
    isLoading,
  }
}
