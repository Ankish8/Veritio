'use client'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import { useYjsDocument } from '../hooks/use-yjs-document'
import { useYjsAwareness } from '../hooks/use-yjs-awareness'
import type { YjsConnectionState } from '../lib/types'

export interface YjsContextValue extends YjsConnectionState {
  doc: Y.Doc | null
  provider: WebsocketProvider | null
  awareness: ReturnType<typeof useYjsDocument>['awareness']
  users: ReturnType<typeof useYjsAwareness>['users']
  setLocation: ReturnType<typeof useYjsAwareness>['setLocation']
  setTyping: ReturnType<typeof useYjsAwareness>['setTyping']
  setTab: ReturnType<typeof useYjsAwareness>['setTab']
  updateCursor: ReturnType<typeof useYjsAwareness>['updateCursor']
  reconnect: () => void
  clearError: () => void
}

/** Exported so app-level providers can reuse the same context (avoids dual-context bugs). */
export const YjsContext = createContext<YjsContextValue | null>(null)

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
