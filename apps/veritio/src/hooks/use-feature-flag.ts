'use client'

import useSWR from 'swr'

interface FeatureFlagResponse {
  key: string
  enabled: boolean
}

/**
 * SWR hook to check if a feature flag is enabled.
 * Polls every 5 minutes since flags rarely change.
 */
export function useFeatureFlag(key: string) {
  const { data, isLoading } = useSWR<FeatureFlagResponse>(
    `/api/feature-flags/${key}`,
    async (url: string) => {
      const res = await fetch(url)
      // If endpoint doesn't exist (no migration yet), treat as disabled
      if (res.status === 404) return { key, enabled: false }
      if (!res.ok) return { key, enabled: false }
      return res.json()
    },
    {
      refreshInterval: 300_000, // 5 minutes
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  return {
    enabled: data?.enabled ?? false,
    isLoading,
  }
}
