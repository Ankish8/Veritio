'use client'
import { useContext, useMemo, type ReactNode } from 'react'
import {
  YjsContext,
  useYjsDocument,
  useYjsAwareness,
  type YjsContextValue,
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
  const userId = user?.id
  const userName = user?.name
  const userEmail = user?.email
  const userImage = user?.image
  const avatarUrl = preferences?.profile?.avatarUrl
  const currentUser = useMemo(() => {
    if (!userId) return null
    return {
      id: userId,
      name: userName || userEmail || 'Anonymous',
      email: userEmail || '',
      avatarUrl: avatarUrl || userImage || undefined,
    }
  }, [userId, userName, userEmail, userImage, avatarUrl])

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
