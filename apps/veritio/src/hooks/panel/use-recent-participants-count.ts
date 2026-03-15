import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthFetchInstance } from '@/lib/swr'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'

interface RecentCountResponse {
  count: number
}

/** Base SWR key prefix for recent participants count */
export const RECENT_PARTICIPANTS_COUNT_KEY = '/api/panel/participants/recent-count'

const fetcher = async (url: string): Promise<RecentCountResponse> => {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch recent participants count')
  }
  return response.json()
}

/** Fetches count of participants who signed up in the last 7 days. Pass enabled=false to skip fetching. */
export function useRecentParticipantsCount(enabled: boolean = true) {
  const organizationId = useCurrentOrganizationId()
  const swrKey = enabled && organizationId
    ? `${RECENT_PARTICIPANTS_COUNT_KEY}?organizationId=${organizationId}`
    : null

  const { data, error, isLoading, mutate } = useSWR<RecentCountResponse>(
    swrKey,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 1,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    }
  )

  return {
    count: data?.count ?? 0,
    isLoading,
    error,
    mutate,
  }
}

/** Mark panel participants as viewed and revalidate the badge count */
export async function markParticipantsViewed(organizationId?: string): Promise<void> {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch('/api/panel/participants/mark-viewed', { method: 'POST' })
  if (!response.ok) return
  // Optimistically set count to 0 for this org's key, then revalidate in background
  const key = organizationId
    ? `${RECENT_PARTICIPANTS_COUNT_KEY}?organizationId=${organizationId}`
    : RECENT_PARTICIPANTS_COUNT_KEY
  globalMutate(key, { count: 0 }, { revalidate: true })
}
