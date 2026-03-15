'use client'

import { useContext, useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  useYjsDocument,
  useYjsAwareness,
  YjsContext,
  type YjsContextValue,
} from '@veritio/yjs'
import { useSession } from '@veritio/auth/client'
import { useUserPreferences } from '@/hooks/use-user-preferences'

const YJS_TOKEN_CACHE_KEY = 'yjs_token'
const YJS_TOKEN_EXPIRY_KEY = 'yjs_token_expiry'
// Use cached token if it has at least 10 minutes remaining
const MIN_TOKEN_REMAINING_MS = 10 * 60 * 1000

function getCachedToken(): string | null {
  try {
    const expiry = sessionStorage.getItem(YJS_TOKEN_EXPIRY_KEY)
    if (!expiry) return null
    const remaining = Number(expiry) - Date.now()
    if (remaining < MIN_TOKEN_REMAINING_MS) return null
    return sessionStorage.getItem(YJS_TOKEN_CACHE_KEY)
  } catch {
    return null
  }
}

function cacheToken(token: string) {
  try {
    // Token expires in 1 hour from server; store that timestamp
    sessionStorage.setItem(YJS_TOKEN_CACHE_KEY, token)
    sessionStorage.setItem(YJS_TOKEN_EXPIRY_KEY, String(Date.now() + 60 * 60 * 1000))
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

function clearCachedToken() {
  try {
    sessionStorage.removeItem(YJS_TOKEN_CACHE_KEY)
    sessionStorage.removeItem(YJS_TOKEN_EXPIRY_KEY)
  } catch {
    // ignore
  }
}

function useYjsToken(enabled: boolean) {
  // Initialize with cached token for instant WebSocket connection
  const [token, setToken] = useState<string | null>(() => (enabled ? getCachedToken() : null))
  const [isLoading, setIsLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  const fetchToken = useCallback(async () => {
    if (!enabled) {
      setToken(null)
      return
    }

    setIsLoading(true)
    try {
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      const headers: HeadersInit = {}
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch('/api/yjs/token', { headers })
      if (response.ok) {
        const data = await response.json()
        cacheToken(data.token)
        setToken(data.token)
      } else {
        clearCachedToken()
        setToken(null)
      }
    } catch {
      clearCachedToken()
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  // Fetch fresh token on mount — if we already have a cached token the
  // WebSocket connects immediately while this runs in background
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchToken()
  }, [fetchToken])

  // Refresh token every 45 minutes (token expires in 1 hour)
  useEffect(() => {
    if (!enabled || !token) return

    const refreshInterval = setInterval(fetchToken, 45 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [enabled, token, fetchToken])

  return { token, isLoading, refetchToken: fetchToken }
}

// Uses YjsContext from @veritio/yjs so package hooks (useTabPresence,
// useCollaborativePresence, etc.) read from the same context as app hooks.

interface YjsProviderProps {
  studyId: string
  children: ReactNode
  enabled?: boolean
}

export function YjsProvider({ studyId, children, enabled = true }: YjsProviderProps) {
  const { data: session } = useSession()
  const user = session?.user
  const { preferences } = useUserPreferences()

  // Check if user is authenticated via Better Auth OR has auth_token in localStorage
  // Initialize synchronously to avoid wasting a render cycle
  const [hasLocalAuthToken] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem('auth_token')
  )

  const isAuthenticated = !!user || hasLocalAuthToken

  // Prewarm the Yjs document immediately on mount — fires before the WebSocket
  // connection attempt so the document is loaded in memory by the time sync starts.
  // Fire-and-forget: we don't block on this, it just gives the Yjs server a head start.
  useEffect(() => {
    if (!enabled || !isAuthenticated) return
    fetch(`/api/yjs/prewarm?studyId=${studyId}`, { method: 'POST' }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on mount
  }, [])

  // Get auth token for WebSocket connection
  const { token } = useYjsToken(enabled && isAuthenticated)

  // Memoize currentUser to prevent infinite re-renders
  // (useYjsAwareness effect depends on this object reference)
  // Prefer custom avatar from user preferences, fall back to OAuth provider image
  const currentUser = useMemo(() => {
    if (!user) return null
    return {
      id: user.id,
      name: user.name || user.email || 'Anonymous',
      email: user.email || '',
      avatarUrl: preferences?.profile?.avatarUrl || user.image || undefined,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.email, user?.image, preferences?.profile?.avatarUrl])

  const {
    doc,
    provider,
    awareness,
    status,
    isConnected,
    isSynced,
    error,
    isUnhealthy,
    reconnectAttempts,
    reconnect,
    clearError,
  } = useYjsDocument({
    studyId,
    enabled: enabled && isAuthenticated,
    token,
  })

  const { users, setLocation, setTyping, setTab, updateCursor } = useYjsAwareness({
    awareness,
    currentUser,
  })

  const value = useMemo(
    () => ({
      doc,
      provider,
      awareness,
      status,
      isConnected,
      isSynced,
      error,
      isUnhealthy,
      reconnectAttempts,
      users,
      setLocation,
      setTyping,
      setTab,
      updateCursor,
      reconnect,
      clearError,
    }),
    [doc, provider, awareness, status, isConnected, isSynced, error, isUnhealthy, reconnectAttempts, users, setLocation, setTyping, setTab, updateCursor, reconnect, clearError]
  )

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>
}

export function useYjs(): YjsContextValue {
  const context = useContext(YjsContext)
  if (!context) {
    throw new Error('useYjs must be used within a YjsProvider')
  }
  return context as YjsContextValue
}

export function useYjsOptional(): YjsContextValue | null {
  return useContext(YjsContext) as YjsContextValue | null
}
