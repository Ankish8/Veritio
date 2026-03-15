'use client'
import { useContext, useMemo, type ReactNode } from 'react'
import * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import {
  YjsProvider as BaseYjsProvider,
  YjsContext,
  useYjsDocument,
  useYjsAwareness,
  type YjsContextValue,
  type YjsConnectionState,
} from '@veritio/yjs'
import { useSession } from '@veritio/prototype-test/lib/auth-client'
import { useUserPreferences } from '../../hooks/use-user-preferences'

interface YjsProviderProps {
  studyId: string
  children: ReactNode
  enabled?: boolean
}

export function YjsProvider({ studyId, children, enabled = true }: YjsProviderProps) {
  const { data: session } = useSession()
  const user = session?.user
  const { preferences } = useUserPreferences()

  // Get auth token for WebSocket connection
  // Note: In production, you'd get this from the session
  const token = useMemo(() => {
    // For now, we'll let the server handle anonymous connections in dev
    return null
  }, [])

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
    enabled: enabled && !!user,
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
  return context
}
export function useYjsOptional(): YjsContextValue | null {
  return useContext(YjsContext)
}
