'use client'

import { useCallback } from 'react'
import { SWRConfig } from 'swr'
import { swrConfig, swrFetcher, FetchError } from '@/lib/swr'
import { handleSessionExpired } from '@veritio/auth/client'
import type { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
  fallback?: Record<string, unknown>
}

/**
 * Global SWR configuration provider.
 *
 * This provider wraps the application to provide:
 * - Centralized fetcher with authentication and timeout
 * - Default configuration (30s deduplication, no focus revalidation, etc.)
 * - Automatic error retry with exponential backoff
 * - Global auth error handling (401 redirects to sign-in)
 * - Optional SSR fallback data for instant hydration
 *
 * Place this in the root layout to enable global SWR features.
 */
export function SWRProvider({ children, fallback }: SWRProviderProps) {
  // Global error handler for auth errors
  const onError = useCallback((error: Error) => {
    // Check if this is an auth error (401 / session expired)
    if (error instanceof FetchError && error.isAuthError()) {
      handleSessionExpired()
    }
  }, [])

  return (
    <SWRConfig
      value={{
        ...swrConfig,
        fetcher: swrFetcher,
        onError,
        ...(fallback && { fallback }),
      }}
    >
      {children}
    </SWRConfig>
  )
}
