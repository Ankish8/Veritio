'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/swr'

export interface ToolInfo {
  slug: string
  name: string
  description: string
  inputParameters: Record<string, unknown>
}

interface ToolsResponse {
  tools: ToolInfo[]
}

/**
 * Hook to fetch available tools for a specific connected Composio toolkit.
 * Only fetches when toolkit is provided.
 */
export function useComposioTools(toolkit: string | null) {
  const { data, error, isLoading } = useSWR<ToolsResponse>(
    toolkit ? `/api/integrations/composio/toolkits/${encodeURIComponent(toolkit)}/tools` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return {
    tools: data?.tools ?? [],
    isLoading,
    error,
  }
}
