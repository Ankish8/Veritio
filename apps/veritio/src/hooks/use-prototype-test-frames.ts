import useSWR from 'swr'
import type { PrototypeTestFrame } from '@veritio/study-types'

/** Lazy loads prototype test frames for the Analysis tab. */
export function usePrototypeTestFrames(studyId: string | null) {
  const { data, error, isLoading } = useSWR<PrototypeTestFrame[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-frames` : null,
    {
      revalidateOnFocus: false,
      // 60s: frames are static data synced from Figma, rarely changes during analysis
      dedupingInterval: 60000,
    }
  )

  return {
    frames: data ?? [],
    error: error?.message ?? null,
    isLoading,
  }
}
