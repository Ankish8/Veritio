'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/swr'

export interface AvailableTrigger {
  slug: string
  name: string
  description: string
  configSchema: Record<string, unknown>
}

interface AvailableTriggersResponse {
  triggers: AvailableTrigger[]
}

/**
 * Hook to fetch available trigger types for a connected toolkit.
 * Only fetches when toolkit is provided.
 */
export function useComposioAvailableTriggers(toolkit: string | null | undefined) {
  const swrKey = toolkit
    ? `/api/integrations/composio/triggers/available?toolkit=${encodeURIComponent(toolkit)}`
    : null

  const { data, error, isLoading } = useSWR<AvailableTriggersResponse>(
    swrKey,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    availableTriggers: data?.triggers ?? [],
    isLoading,
    error,
  }
}
