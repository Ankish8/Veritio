'use client'

import { useContext, useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  useYjsDocument,
  useYjsAwareness,
  YjsContext,
  type YjsContextValue,
} from '@veritio/yjs'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { useCurrentUser } from '@/hooks/use-current-user'
import { formatDisplayName } from '@/lib/user/display-name'

const YJS_TOKEN_CACHE_KEY = 'yjs_token'
const YJS_TOKEN_EXPIRY_KEY = 'yjs_token_expiry'
// Use cached token if it has at least 10 minutes remaining
const MIN_TOKEN_REMAINING_MS = 10 * 60 * 1000

interface YjsTokenError {
  message: string
  status?: number
  retryable: boolean
}

function cacheKey(studyId: string, key: string) {
  return `${key}:${studyId}`
}

function getCachedToken(studyId: string): string | null {
  try {
    const expiry = sessionStorage.getItem(cacheKey(studyId, YJS_TOKEN_EXPIRY_KEY))
    if (!expiry) return null
    const remaining = Number(expiry) - Date.now()
    if (remaining < MIN_TOKEN_REMAINING_MS) return null
    return sessionStorage.getItem(cacheKey(studyId, YJS_TOKEN_CACHE_KEY))
  } catch {
    return null
  }
}

function cacheToken(studyId: string, token: string) {
  try {
    // Token expires in 1 hour from server; store that timestamp
    sessionStorage.setItem(cacheKey(studyId, YJS_TOKEN_CACHE_KEY), token)
    sessionStorage.setItem(cacheKey(studyId, YJS_TOKEN_EXPIRY_KEY), String(Date.now() + 60 * 60 * 1000))
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

function clearCachedToken(studyId: string) {
  try {
    sessionStorage.removeItem(cacheKey(studyId, YJS_TOKEN_CACHE_KEY))
    sessionStorage.removeItem(cacheKey(studyId, YJS_TOKEN_EXPIRY_KEY))
  } catch {
    // ignore
  }
}

async function getTokenError(response: Response): Promise<YjsTokenError> {
  let body: { error?: unknown; requiredPlan?: unknown } | null = null

  try {
    body = await response.json()
  } catch {
    body = null
  }

  const serverMessage = typeof body?.error === 'string' ? body.error : null
  const requiredPlan =
    typeof body?.requiredPlan === 'string' ? body.requiredPlan : null

  if (response.status === 401) {
    return {
      message: 'Real-time collaboration needs a fresh sign-in.',
      status: response.status,
      retryable: true,
    }
  }

  if (response.status === 403) {
    return {
      message: requiredPlan
        ? `Real-time collaboration requires ${requiredPlan}.`
        : serverMessage ||
          'Real-time collaboration is not available for this study.',
      status: response.status,
      retryable: false,
    }
  }

  return {
    message: serverMessage || 'Unable to prepare real-time collaboration.',
    status: response.status,
    retryable: response.status >= 500,
  }
}

function getInitialToken(studyId: string, initialToken?: string | null) {
  return initialToken === undefined ? getCachedToken(studyId) : initialToken
}

function useYjsToken(
  enabled: boolean,
  studyId: string,
  initialToken?: string | null
) {
  // Initialize with cached token for instant WebSocket connection
  const [token, setToken] = useState<string | null>(() =>
    enabled ? getInitialToken(studyId, initialToken) : null
  )
  const [isLoading, setIsLoading] = useState(
    () => enabled && !getInitialToken(studyId, initialToken)
  )
  const [error, setError] = useState<YjsTokenError | null>(null)
  const fetchedStudyRef = useRef<string | null>(null)

  const fetchToken = useCallback(async () => {
    if (!enabled) {
      setToken(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Fetch token using cookie-based auth (credentials: 'include')
      // The /api/yjs/token endpoint authenticates via getServerSession() using HttpOnly cookies
      const response = await fetch(
        `/api/yjs/token?studyId=${encodeURIComponent(studyId)}`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        cacheToken(studyId, data.token)
        setToken(data.token)
        setError(null)
      } else {
        clearCachedToken(studyId)
        setToken(null)
        setError(await getTokenError(response))
      }
    } catch {
      clearCachedToken(studyId)
      setToken(null)
      setError({
        message: 'Unable to reach real-time collaboration.',
        retryable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [enabled, studyId])

  // Use a server-issued token first when available. Otherwise use a cached
  // token for instant WebSocket connection while a fresh token loads.
  useEffect(() => {
    const bootToken = enabled ? getInitialToken(studyId, initialToken) : null
    if (enabled && initialToken) {
      cacheToken(studyId, initialToken)
    }

    setToken(bootToken)
    setError(null)
    if (!enabled) {
      fetchedStudyRef.current = null
      return
    }

    if (initialToken) {
      fetchedStudyRef.current = studyId
      setIsLoading(false)
      return
    }

    if (fetchedStudyRef.current === studyId) return
    fetchedStudyRef.current = studyId
    fetchToken()
  }, [enabled, fetchToken, initialToken, studyId])

  // Refresh token every 45 minutes (token expires in 1 hour)
  useEffect(() => {
    if (!enabled || !token) return

    const refreshInterval = setInterval(fetchToken, 45 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [enabled, token, fetchToken])

  const clearTokenError = useCallback(() => {
    setError(null)
  }, [])

  const isWaitingForToken =
    enabled && !token && !error && (isLoading || fetchedStudyRef.current !== studyId)

  return {
    token,
    isLoading: isWaitingForToken,
    error,
    refetchToken: fetchToken,
    clearTokenError,
  }
}

// Uses YjsContext from @veritio/yjs so package hooks (useTabPresence,
// useCollaborativePresence, etc.) read from the same context as app hooks.

interface YjsProviderProps {
  studyId: string
  children: ReactNode
  enabled?: boolean
  initialToken?: string | null
}

export function YjsProvider({
  studyId,
  children,
  enabled = true,
  initialToken,
}: YjsProviderProps) {
  const { user } = useCurrentUser()
  const { preferences } = useUserPreferences()

  const isAuthenticated = !!user

  // Prewarm the Yjs document immediately on mount — fires before the WebSocket
  // connection attempt so the document is loaded in memory by the time sync starts.
  // Fire-and-forget: we don't block on this, it just gives the Yjs server a head start.
  useEffect(() => {
    if (!enabled || !isAuthenticated) return
    fetch(`/api/yjs/prewarm?studyId=${studyId}`, { method: 'POST' }).catch(() => {})
  }, [enabled, isAuthenticated, studyId])

  // Get auth token for WebSocket connection
  const {
    token,
    isLoading: isTokenLoading,
    error: tokenError,
    refetchToken,
    clearTokenError,
  } = useYjsToken(enabled && isAuthenticated, studyId, initialToken)

  // Memoize currentUser to prevent infinite re-renders
  // (useYjsAwareness effect depends on this object reference)
  // Prefer custom avatar from user preferences, fall back to OAuth provider image
  const currentUser = useMemo(() => {
    if (!user) return null
    return {
      id: user.id,
      // Present this user to collaborators per their Display name format preference.
      name: formatDisplayName(
        { name: user.name, email: user.email },
        preferences?.profile?.displayNamePreference,
        user.email || 'Anonymous'
      ),
      email: user.email || '',
      avatarUrl: preferences?.profile?.avatarUrl || user.image || undefined,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.email, user?.image, preferences?.profile?.avatarUrl, preferences?.profile?.displayNamePreference])

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
    waitingForToken: isTokenLoading && !token && !tokenError,
    authError: tokenError?.message ?? null,
  })

  const { users, setLocation, setTyping, setTab, updateCursor } = useYjsAwareness({
    awareness,
    currentUser,
  })

  const handleReconnect = useCallback(() => {
    if (!token || tokenError) {
      void refetchToken()
    }
    reconnect()
  }, [reconnect, refetchToken, token, tokenError])

  const handleClearError = useCallback(() => {
    clearTokenError()
    clearError()
  }, [clearError, clearTokenError])

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
      reconnect: handleReconnect,
      clearError: handleClearError,
    }),
    [doc, provider, awareness, status, isConnected, isSynced, error, isUnhealthy, reconnectAttempts, users, setLocation, setTyping, setTab, updateCursor, handleReconnect, handleClearError]
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
