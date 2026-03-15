'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { getYjsServerUrl, createDocumentName } from '../lib/utils'
import type { YjsConnectionState } from '../lib/types'

interface UseYjsDocumentOptions {
  studyId: string
  enabled?: boolean
  token?: string | null
}

interface UseYjsDocumentReturn extends YjsConnectionState {
  doc: Y.Doc | null
  provider: WebsocketProvider | null
  awareness: WebsocketProvider['awareness'] | null
  reconnect: () => void
  clearError: () => void
}

export function useYjsDocument({
  studyId,
  enabled = true,
  token,
}: UseYjsDocumentOptions): UseYjsDocumentReturn {
  const [doc, setDoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [status, setStatus] = useState<YjsConnectionState['status']>('connecting')
  const [isSynced, setIsSynced] = useState(false)
  const [isIndexedDbSynced, setIsIndexedDbSynced] = useState(false)
  const [isWsSynced, setIsWsSynced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnhealthy, setIsUnhealthy] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Refs to track instances across renders
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const indexedDbRef = useRef<IndexeddbPersistence | null>(null)
  const roomNameRef = useRef<string | null>(null)
  const providerTokenRef = useRef<string | null>(null)
  const providerRoomRef = useRef<string | null>(null)
  const isCleaningUpRef = useRef(false)
  const isSettingUpRef = useRef(false)
  const reconnectAttemptsRef = useRef(0)

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    isCleaningUpRef.current = true
    isSettingUpRef.current = false

    if (providerRef.current) {
      providerRef.current.disconnect()
      providerRef.current.destroy()
      providerRef.current = null
    }
    if (indexedDbRef.current) {
      indexedDbRef.current.destroy()
      indexedDbRef.current = null
    }
    if (docRef.current) {
      docRef.current.destroy()
      docRef.current = null
    }
    roomNameRef.current = null
    providerTokenRef.current = null
    providerRoomRef.current = null
    setDoc(null)
    setProvider(null)
    setStatus('disconnected')
    setIsSynced(false)
    setIsIndexedDbSynced(false)
    setIsWsSynced(false)
    setIsUnhealthy(false)
    setError(null)
    reconnectAttemptsRef.current = 0
    setReconnectAttempts(0)

    isCleaningUpRef.current = false
  }, [])

  // Manual reconnect function - only used when user clicks reconnect
  const reconnect = useCallback(() => {
    if (isCleaningUpRef.current || !providerRef.current) {
      return
    }

    setError(null)
    setIsUnhealthy(false)
    setStatus('connecting')

    // Disconnect and reconnect
    try {
      providerRef.current.disconnect()
      setTimeout(() => {
        if (providerRef.current && !isCleaningUpRef.current) {
          providerRef.current.connect()
        }
      }, 500)
    } catch (err) {
      console.error('[Yjs] Reconnect error:', err)
    }
  }, [])

  // Initialize Y.Doc and IndexedDB as soon as possible
  useEffect(() => {
    if (!enabled || !studyId) {
      cleanup()
      return cleanup
    }

    const roomName = createDocumentName(studyId)

    if (docRef.current && roomNameRef.current === roomName) {
      return cleanup
    }

    if (docRef.current || providerRef.current || indexedDbRef.current) {
      cleanup()
    }

    setError(null)
    setIsUnhealthy(false)
    setIsSynced(false)
    setStatus('connecting')
    reconnectAttemptsRef.current = 0
    setReconnectAttempts(0)

    const ydoc = new Y.Doc()
    docRef.current = ydoc
    roomNameRef.current = roomName
    setDoc(ydoc)

    const indexedDb = new IndexeddbPersistence(roomName, ydoc)
    indexedDbRef.current = indexedDb

    indexedDb.on('synced', () => {
      setIsIndexedDbSynced(true)
    })

    return cleanup
  }, [studyId, enabled, cleanup])

  // Connect WebSocket once the auth token is ready
  useEffect(() => {
    if (!enabled || !studyId) {
      return
    }

    const ydoc = docRef.current
    if (!ydoc) {
      return
    }

    if (!token) {
      return
    }

    const roomName = roomNameRef.current || createDocumentName(studyId)
    roomNameRef.current = roomName
    const serverUrl = getYjsServerUrl()

    // Prevent multiple simultaneous setup attempts (e.g., from React StrictMode)
    if (isSettingUpRef.current) {
      return
    }

    if (
      providerRef.current &&
      providerTokenRef.current === token &&
      providerRoomRef.current === roomName
    ) {
      if (!providerRef.current.wsconnected && !isCleaningUpRef.current) {
        providerRef.current.connect()
      }
      return
    }

    // Clean up any existing broken connection before setting up new one
    if (providerRef.current) {
      try {
        providerRef.current.disconnect()
        providerRef.current.destroy()
      } catch (_e) {
        // Ignore cleanup errors
      }
      providerRef.current = null
    }

    isSettingUpRef.current = true

    try {
      setError(null)
      setIsUnhealthy(false)
      reconnectAttemptsRef.current = 0
      setReconnectAttempts(0)
      setStatus('connecting')

      // Build WebSocket URL with auth token
      const params: Record<string, string> = {
        token,
      }

      // Setup WebSocket provider
      // y-websocket handles reconnection automatically with exponential backoff
      const wsProvider = new WebsocketProvider(serverUrl, roomName, ydoc, {
        connect: true,
        params,
        resyncInterval: 30000, // Resync every 30 seconds
        maxBackoffTime: 10000, // Max 10 second backoff
      })

      providerRef.current = wsProvider
      providerTokenRef.current = token
      providerRoomRef.current = roomName
      setProvider(wsProvider)

      // Connection status handlers
      wsProvider.on('status', ({ status: wsStatus }: { status: string }) => {
        if (isCleaningUpRef.current) return

        setStatus(wsStatus as YjsConnectionState['status'])

        if (wsStatus === 'connected') {
          // Reset on successful connection
          reconnectAttemptsRef.current = 0
          setReconnectAttempts(0)
          setError(null)
          setIsUnhealthy(false)
        } else if (wsStatus === 'disconnected') {
          // Track reconnect attempts (y-websocket will auto-reconnect)
          reconnectAttemptsRef.current++
          setReconnectAttempts(reconnectAttemptsRef.current)
        }
      })

      // Sync status handler
      wsProvider.on('sync', (synced: boolean) => {
        if (!isCleaningUpRef.current) {
          setIsWsSynced(synced)
          if (synced) {
            setIsUnhealthy(false)
          }
        }
      })

      // Error handler - only for actual errors, not normal disconnects
      wsProvider.on('connection-error', (event: Event) => {
        console.error('[Yjs] Connection error:', event)
        // Don't set error here - let y-websocket retry
      })

      // Handle WebSocket close events - only set error for permanent failures
      wsProvider.on('connection-close', (event: CloseEvent | null) => {
        if (!event || isCleaningUpRef.current) return

        // Only set error for permanent/auth failures
        switch (event.code) {
          case 1008:
            // Policy violation - could be auth failure
            setError('Connection rejected by server.')
            break
          case 4001:
            // Custom: Authentication required
            setError('Authentication required. Please sign in again.')
            break
          case 4003:
            // Custom: Forbidden
            setError('Access denied to this study.')
            break
          // Normal disconnects (1000, 1001, 1006) - let y-websocket handle reconnection
        }
      })
    } catch (error) {
      console.error('[Yjs] Setup error:', error)
      setStatus('disconnected')
      setError('Failed to initialize collaboration.')
    } finally {
      isSettingUpRef.current = false
    }
  }, [studyId, enabled, token])

  // Derive isSynced from either IndexedDB or WS sync.
  // Yjs CRDTs handle out-of-order updates correctly, so it's safe to show
  // content as soon as either source has synced. IndexedDB syncs near-instantly
  // for cached docs; WS brings the authoritative server state shortly after.
  useEffect(() => {
    const synced = isIndexedDbSynced || isWsSynced
    setIsSynced(synced)
  }, [isIndexedDbSynced, isWsSynced])

  return {
    doc,
    provider,
    awareness: provider?.awareness ?? null,
    status,
    isConnected: status === 'connected',
    isSynced,
    error,
    isUnhealthy,
    reconnectAttempts,
    reconnect,
    clearError,
  }
}
