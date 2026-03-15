'use client'

import useSWR from 'swr'
import { useAuthFetch } from './use-auth-fetch'

interface FigmaUser {
  id: string
  email: string | null
  handle: string | null
  imgUrl: string | null
  connectedAt: string
}

type TokenHealth = 'healthy' | 'warning' | 'expired'

interface FigmaConnectionStatus {
  configured: boolean
  connected: boolean
  figmaUser: FigmaUser | null
  tokenHealth?: TokenHealth
  tokenExpiresAt?: string | null
}

/** Hook to check and manage Figma OAuth connection status. */
export function useFigmaConnection() {
  const authFetch = useAuthFetch()

  // Fetch connection status
  const { data, error, isLoading, mutate } = useSWR<FigmaConnectionStatus>(
    '/api/integrations/figma/status',
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to check Figma status')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  )

  // Initiate OAuth flow - uses same-window redirect for reliability
  // (popups are frequently blocked by browsers)
  const connect = async () => {
    // First, fetch the auth URL
    const res = await authFetch('/api/integrations/figma')
    if (!res.ok) {
      throw new Error('Failed to initiate Figma OAuth')
    }

    const { authUrl } = await res.json()

    // Store return URL so we can redirect back after OAuth completes
    const returnUrl = window.location.href
    sessionStorage.setItem('figma_oauth_return_url', returnUrl)

    // Use same-window redirect (most reliable - popups are often blocked)
    window.location.href = authUrl
  }

  // Disconnect Figma account
  const disconnect = async () => {
    try {
      const res = await authFetch('/api/integrations/figma', {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to disconnect Figma')

      // Refresh status
      mutate()
    } catch {
      throw new Error('Failed to disconnect Figma')
    }
  }

  return {
    isConfigured: data?.configured ?? false,
    isConnected: data?.connected ?? false,
    figmaUser: data?.figmaUser ?? null,
    tokenHealth: data?.tokenHealth ?? null,
    tokenExpiresAt: data?.tokenExpiresAt ?? null,
    connect,
    disconnect,
    isLoading,
    error,
    refresh: mutate,
  }
}
