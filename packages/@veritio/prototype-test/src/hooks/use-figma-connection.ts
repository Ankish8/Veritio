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

  // Initiate OAuth flow
  const connect = async () => {
    // First, fetch the auth URL
    const res = await authFetch('/api/integrations/figma')
    if (!res.ok) {
      throw new Error('Failed to initiate Figma OAuth')
    }

    const { authUrl } = await res.json()

    // Clear any existing return URL (for popup mode, we don't want redirect)
    sessionStorage.removeItem('figma_oauth_return_url')

    // Try to open popup
    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      authUrl,
      'figma-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    )

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Popup was blocked - store return URL for same-window redirect
      const returnUrl = window.location.href
      sessionStorage.setItem('figma_oauth_return_url', returnUrl)

      // Try opening in new tab as fallback
      const newTab = window.open(authUrl, '_blank', 'noopener,noreferrer')
      if (!newTab) {
        // If that also fails, do a direct same-window redirect
        window.location.assign(authUrl)
      }
      return
    }

    // Poll for popup close and refresh status
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        // Refresh connection status
        mutate()
      }
    }, 500)
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
