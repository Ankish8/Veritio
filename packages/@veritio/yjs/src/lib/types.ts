/**
 * Yjs Type Definitions
 */

import type * as Y from 'yjs'

export interface YjsUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  color: string
}

export interface YjsCursor {
  x: number
  y: number
  locationId?: string
}

export interface YjsAwarenessState {
  user?: YjsUser
  cursor?: YjsCursor
  location?: string
  typing?: boolean
  tab?: string
  isActive?: boolean
}

export interface YjsConnectionState {
  status: 'connecting' | 'connected' | 'disconnected'
  isConnected: boolean
  isSynced: boolean
  error: string | null
  isUnhealthy: boolean
  reconnectAttempts: number
}
export interface YjsStudyDocument {
  // Metadata (Details tab)
  'meta.title': Y.Text
  'meta.description': Y.Text
  'meta.purpose': Y.Text
  'meta.participantRequirements': Y.Text

  // Study Flow sections
  'flow.welcome.title': Y.Text
  'flow.welcome.message': Y.Text
  'flow.agreement.title': Y.Text
  'flow.agreement.message': Y.Text
  'flow.thankYou.title': Y.Text
  'flow.thankYou.message': Y.Text

  // Arrays
  cards: Y.Array<Y.Map<unknown>>
  categories: Y.Array<Y.Map<unknown>>
  treeNodes: Y.Array<Y.Map<unknown>>
  tasks: Y.Array<Y.Map<unknown>>
}
