'use client'
/**
 * Context + consumer hooks only — no runtime dependency on yjs/y-websocket.
 *
 * Presence UI (avatars, sync indicators, tab presence) renders on routes that
 * never mount a YjsProvider; importing the provider module from those
 * components would pull the entire yjs runtime into their bundles. All heavy
 * imports here are type-only, which the compiler erases.
 */
import { createContext, useContext } from 'react'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import type { useYjsDocument } from '../hooks/use-yjs-document'
import type { useYjsAwareness } from '../hooks/use-yjs-awareness'
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

/** Shared by the package provider and app-level providers (avoids dual-context bugs). */
export const YjsContext = createContext<YjsContextValue | null>(null)

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
