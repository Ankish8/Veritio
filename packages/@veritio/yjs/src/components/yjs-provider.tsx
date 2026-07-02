'use client'
import { useMemo, type ReactNode } from 'react'
import { useYjsDocument } from '../hooks/use-yjs-document'
import { useYjsAwareness } from '../hooks/use-yjs-awareness'
import { YjsContext } from './yjs-context'

// Context/hooks live in yjs-context (no runtime yjs deps) so presence-only
// consumers don't pull the collaboration runtime; re-exported for back-compat
export { YjsContext, useYjs, useYjsOptional, type YjsContextValue } from './yjs-context'

interface YjsProviderProps {
  studyId: string
  children: ReactNode
  enabled?: boolean
  currentUser: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  } | null
  token?: string | null
}

export function YjsProvider({
  studyId,
  children,
  enabled = true,
  currentUser,
  token = null,
}: YjsProviderProps) {
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
    enabled: enabled && !!currentUser,
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
