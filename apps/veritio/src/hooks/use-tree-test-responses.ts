import useSWR from 'swr'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'

/**
 * Hook to lazy load tree test responses (can be 1000+ rows with path data).
 * Uses SWR for automatic caching - second visit is instant!
 */
export function useTreeTestResponses(studyId: string | null) {
  const { data, error, isLoading } = useSWR<TreeTestResponse[]>(
    studyId ? `/api/studies/${studyId}/tree-test-responses` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    responses: data || [],
    error: error?.message || null,
    isLoading,
  }
}
