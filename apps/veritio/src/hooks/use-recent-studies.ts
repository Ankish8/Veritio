'use client'

import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr'

export interface RecentStudyLink {
  id: string
  title: string
  project_id: string
  study_type: string
  status: string
  updated_at: string | null
}

const fetcher = async (url: string): Promise<{ recentStudies: RecentStudyLink[] }> => {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch(url)
  if (!response.ok) throw new Error('Failed to fetch recent studies')
  return response.json()
}

export function useRecentStudies(organizationId: string | null, enabled: boolean = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled && organizationId ? `/api/sidebar/recent-studies?organizationId=${organizationId}` : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 1,
    }
  )

  return {
    recentStudies: data?.recentStudies ?? [],
    isLoading,
    isValidating,
    error,
  }
}
