'use client'

import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useAuthFetch } from './use-auth-fetch'
import { ALLOWED_TOOLKIT_META } from '@/lib/composio/allowed-tools'

const TOOLKIT_LOGO_MAP = new Map(ALLOWED_TOOLKIT_META.map((t) => [t.slug, t.logo]))

export interface ConnectionInfo {
  toolkit: string
  name: string
  logo: string | null
  description: string | null
  connected: boolean
  account: string | null
  composioAccountId: string | null
  connectedAt: string | null
}

interface ComposioStatusResponse {
  configured: boolean
  connections: ConnectionInfo[]
}

/**
 * Hook to check and manage Composio integration connection status.
 * Returns connection status for all toolkits, plus methods to connect, disconnect, and execute tools.
 */
export function useComposioStatus() {
  const authFetch = useAuthFetch()

  const fetcher = useCallback(
    async (url: string): Promise<ComposioStatusResponse> => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch Composio status')
      return res.json()
    },
    [authFetch]
  )

  const { data: rawData, error, isLoading, mutate } = useSWR<ComposioStatusResponse>(
    '/api/integrations/composio/status',
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  // Enrich connections with logos from static toolkit metadata.
  // Done here (not in fetcher) so it applies to cached SWR data too.
  const data = useMemo(() => {
    if (!rawData) return rawData
    return {
      ...rawData,
      connections: rawData.connections.map((c) => ({
        ...c,
        logo: c.logo ?? TOOLKIT_LOGO_MAP.get(c.toolkit) ?? null,
      })),
    }
  }, [rawData])

  const isConnected = useCallback(
    (toolkit: string): boolean => {
      const conn = data?.connections.find((c) => c.toolkit === toolkit)
      return conn?.connected ?? false
    },
    [data?.connections]
  )

  const connect = useCallback(
    async (toolkit: string) => {
      const returnUrl = window.location.href
      const res = await authFetch(`/api/integrations/composio/initiate?toolkit=${toolkit}&returnUrl=${encodeURIComponent(returnUrl)}`)

      if (!res.ok) {
        throw new Error(`Failed to initiate ${toolkit} connection`)
      }

      const { authUrl } = await res.json()
      sessionStorage.setItem('composio_oauth_pending', '1')
      window.location.href = authUrl
    },
    [authFetch]
  )

  const disconnect = useCallback(
    async (toolkit: string) => {
      const res = await authFetch(`/api/integrations/composio/${toolkit}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(`Failed to disconnect ${toolkit}`)
      }

      mutate()
    },
    [authFetch, mutate]
  )

  const executeTool = useCallback(
    async (
      toolkit: string,
      toolSlug: string,
      args: Record<string, unknown>
    ): Promise<{ success: boolean; data: unknown; error?: string }> => {
      const res = await authFetch('/api/integrations/composio/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkit, tool: toolSlug, params: args }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Tool execution failed' }))
        return { success: false, data: null, error: err.error }
      }

      return res.json()
    },
    [authFetch]
  )

  return {
    isConfigured: data?.configured ?? false,
    connections: data?.connections ?? [],
    isConnected,
    connect,
    disconnect,
    executeTool,
    isLoading,
    error,
    refresh: mutate,
  }
}
