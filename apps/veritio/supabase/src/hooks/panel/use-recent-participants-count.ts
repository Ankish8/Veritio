/**
 * useRecentParticipantsCount Hook
 *
 * SWR-based hook for getting the count of recently signed up participants.
 * Used for the sidebar badge.
 */

import useSWR from 'swr'
import { useAuthFetch } from '../use-auth-fetch'

interface RecentCountResponse {
  count: number
}

/**
 * Hook for getting the count of participants who signed up in the last 7 days
 */
export function useRecentParticipantsCount() {
  const authFetch = useAuthFetch()

  const { data, error, isLoading, mutate } = useSWR<RecentCountResponse>(
    '/api/panel/participants/recent-count',
    authFetch,
    {
      // Refresh every 5 minutes when focused
      refreshInterval: 5 * 60 * 1000,
      // Don't retry on error - not critical data
      errorRetryCount: 1,
      // Keep stale data while revalidating
      revalidateOnFocus: true,
    }
  )

  return {
    count: data?.count ?? 0,
    isLoading,
    error,
    mutate,
  }
}
