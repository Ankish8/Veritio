'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthFetch } from './use-auth-fetch'
import type {
  AssistantMessage,
  SSEEvent,
  RateLimitInfo,
  FileAttachment,
} from '@/services/assistant/types'
import { applyEvent, chatStateCache } from './assistant-chat-events'
import type { UseAssistantChatOptions } from './assistant-chat-events'

export type { StudyCreatedInfo, UseAssistantChatOptions } from './assistant-chat-events'

const WS_URL = process.env.NEXT_PUBLIC_MOTIA_WS_URL || 'ws://localhost:4004'

export function useAssistantChat(studyId: string | undefined, mode: 'results' | 'builder' | 'create' = 'results', options?: UseAssistantChatOptions) {
  const cacheKey = `${studyId || 'no-study'}:${mode}`
  const skipAutoRestore = options?.skipAutoRestore ?? false
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    if (skipAutoRestore) {
      chatStateCache.delete(cacheKey) // Clear stale cache so a fresh conversation starts
      return []
    }
    return chatStateCache.get(cacheKey)?.messages ?? []
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (skipAutoRestore) return null
    return chatStateCache.get(cacheKey)?.conversationId ?? null
  })
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const authFetch = useAuthFetch()
  const abortRef = useRef<AbortController | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const _saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStudyIdRef = useRef<string | null>(null)
  const loadGenRef = useRef(0)
  /** Tracks which cacheKey we've already attempted auto-restore for */
  const autoRestoredKeyRef = useRef<string | null>(null)
  /** Tracks the currently active streaming message for the persistent WS handler */
  const activeMessageRef = useRef<{ assistantMsgId: string; completedRef: { current: boolean } } | null>(null)
  const onDataChangedRef = useRef(options?.onDataChanged)
  onDataChangedRef.current = options?.onDataChanged
  const onStudyCreatedRef = useRef(options?.onStudyCreated)
  onStudyCreatedRef.current = options?.onStudyCreated
  const onConversationLoadedRef = useRef(options?.onConversationLoaded)
  onConversationLoadedRef.current = options?.onConversationLoaded
  const endpointRef = useRef(options?.endpoint)
  endpointRef.current = options?.endpoint

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  // Reset state when study/mode changes
  useEffect(() => {
    const key = studyId || 'no-study'
    if (lastStudyIdRef.current === key) return
    lastStudyIdRef.current = key
    closeWs()
    activeMessageRef.current = null
    const newCacheKey = `${key}:${mode}`
    const cached = chatStateCache.get(newCacheKey)
    setMessages(cached?.messages ?? [])  
    setConversationId(cached?.conversationId ?? null)  
  }, [studyId, mode, closeWs])

  // Keep module-level cache in sync so state survives unmount/remount
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      chatStateCache.set(cacheKey, { conversationId, messages })
    }
  }, [cacheKey, conversationId, messages])

  /**
   * Ensure a persistent WebSocket connection is open.
   * Reuses the existing connection if still open, avoiding TCP+TLS overhead per message.
   * The onmessage handler reads from activeMessageRef to route events to the current message.
   */
  const connectWs = useCallback((): Promise<void> => {
    // Reuse existing open connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    // Clean up stale connection
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    return new Promise<void>((resolve) => {
      let ws: WebSocket
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        resolve()
        return
      }

      wsRef.current = ws

      ws.onopen = () => resolve()

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.event?.type !== 'event') return

          // iii v1 wraps: { event: { type:'event', event: { type:'event', data: sseEvent } } }
          // Unwrap one extra level when the intermediate wrapper has type === 'event'
          let rawEvent = msg.event.data ?? msg.event.event
          if (rawEvent?.type === 'event') rawEvent = rawEvent.data ?? rawEvent.event ?? rawEvent
          const sseEvent = rawEvent as SSEEvent
          if (!sseEvent) return

          const active = activeMessageRef.current
          if (!active || active.completedRef.current) return

          const done = applyEvent(
            sseEvent,
            active.assistantMsgId,
            setMessages,
            setConversationId,
            setRateLimitInfo,
            onDataChangedRef.current,
            onStudyCreatedRef.current
          )

          if (done) {
            active.completedRef.current = true
            setIsStreaming(false)
            // Don't close WS — keep it persistent for the next message
          }
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onerror = () => {
        ws.close()
        wsRef.current = null
        resolve()
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
      }
    })
  }, [])

  const sendMessage = useCallback(
    async (text: string, files?: FileAttachment[]) => {
      if (isStreaming) return

      // Add optimistic user message
      const userMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        conversationId: conversationId ?? '',
        role: 'user',
        content: text,
        metadata: files?.length ? { type: 'text', files } : null,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Create placeholder assistant message for streaming
      const assistantMsgId = crypto.randomUUID()
      const assistantMsg: AssistantMessage = {
        id: assistantMsgId,
        conversationId: conversationId ?? '',
        role: 'assistant',
        content: '',
        metadata: { type: 'text' },
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      setIsStreaming(true)
      const controller = new AbortController()
      abortRef.current = controller

      const timeoutId = setTimeout(() => controller.abort(), 300_000)
      const completedRef = { current: false }
      const streamId = crypto.randomUUID()

      // Set up persistent WS and subscribe to this message's stream
      activeMessageRef.current = { assistantMsgId, completedRef }
      await connectWs()
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        data: { streamName: 'assistantChat', groupId: streamId, subscriptionId: crypto.randomUUID() },
      }))
      // Allow server time to register WS subscription before HTTP request triggers events
      await new Promise<void>((resolve) => setTimeout(resolve, 100))

      try {
        const endpoint = endpointRef.current
        const response = await authFetch(endpoint ?? '/api/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(studyId ? { studyId } : {}),
            conversationId: conversationId ?? undefined,
            message: text,
            streamId,
            // Only include mode/context fields when using the default endpoint
            ...(endpoint ? {} : {
              ...(files && files.length > 0 ? { files } : {}),
              mode,
              ...(options?.preSelectedProjectId ? { preSelectedProjectId: options.preSelectedProjectId, preSelectedProjectName: options.preSelectedProjectName } : {}),
              ...(options?.preSelectedStudyType ? { preSelectedStudyType: options.preSelectedStudyType } : {}),
              ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
              ...(options?.activeTab ? { activeTab: options.activeTab } : {}),
              ...(options?.activeFlowSection ? { activeFlowSection: options.activeFlowSection } : {}),
            }),
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 429) {
            const data = await response.json().catch(() => null)
            if (data?.rateLimitInfo) {
              setRateLimitInfo(data.rateLimitInfo)
            }
            const resetTime = data?.rateLimitInfo?.resetsAt
              ? new Date(data.rateLimitInfo.resetsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              : null
            const errorContent = resetTime
              ? `You've reached your daily message limit. Your limit resets at ${resetTime}.`
              : 'Rate limit reached. Please try again later.'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: errorContent, metadata: { type: 'error' } }
                  : m
              )
            )
            return
          }

          const errorBody = await response.text().catch(() => 'Unknown error')
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${errorBody || 'Something went wrong'}`, metadata: { type: 'error' } }
                : m
            )
          )
          return
        }

        const data = await response.json()
        setConversationId(data.conversationId)

        if (completedRef.current) return

        // Wait for in-flight WS events to arrive before applying fallback.
        // With await-per-token delivery, events arrive at ~LLM rate, so message_complete
        // arrives well within this window. 1500ms handles slow Redis/IPC edge cases.
        await new Promise<void>((resolve) => setTimeout(resolve, 1500))

        if (completedRef.current) return

        // Fallback: apply JSON events if WebSocket didn't deliver message_complete.
        // Preserve component messages (type:'component') — they may have been created
        // by WS-delivered component_props_delta events and should not be discarded.
        // Only remove tool_progress messages and reset the assistant text placeholder.
        setMessages((prev) => {
          return prev
            .filter((m) => m.metadata?.type !== 'tool_progress')
            .map((m) =>
              m.id === assistantMsgId ? { ...m, content: '' } : m
            )
        })

        const events: SSEEvent[] = data.events ?? []
        for (const event of events) {
          applyEvent(
            event,
            assistantMsgId,
            setMessages,
            setConversationId,
            setRateLimitInfo,
            onDataChangedRef.current,
            onStudyCreatedRef.current
          )
        }
      } catch (err) {
        closeWs() // Close WS on error — will reconnect on next message
        const isTimeout = err instanceof DOMException && err.name === 'AbortError'
        const errorContent = isTimeout ? 'The request timed out. Please try again.' : 'Something went wrong. Please try again.'

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: errorContent, metadata: { type: 'error' } }
              : m
          )
        )
      } finally {
        clearTimeout(timeoutId)
        activeMessageRef.current = null
        setIsStreaming(false)
        abortRef.current = null
        // Note: WS stays open for reuse on next message (closed only on error/unmount)
      }
    },
    [studyId, conversationId, authFetch, isStreaming, connectWs, closeWs, mode] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const loadConversation = useCallback(
    async (id: string) => {
      const gen = ++loadGenRef.current
      setMessages([])
      setConversationId(id)
      setIsLoadingConversation(true)

      try {
        const response = await authFetch(`/api/assistant/conversations/${id}/messages`)
        if (loadGenRef.current !== gen) return // Stale load — discard
        if (!response.ok) {
          setIsLoadingConversation(false)
          return
        }

        const data = await response.json()
        if (loadGenRef.current !== gen) return // Stale load — discard

        const allMessages: AssistantMessage[] = data.messages ?? []

        // Filter to user-visible messages only
        const visibleMessages = allMessages.filter((m) => {
          if (m.role === 'user') return true
          if (m.role === 'tool') return false
          if (m.role === 'system') return false
          if (m.role === 'assistant' && !m.content && m.toolCalls) return false
          return true
        })

        setMessages(visibleMessages)
        onConversationLoadedRef.current?.(data.studyId ?? null)
      } catch {
        // Failed to load — stay on empty state
      } finally {
        if (loadGenRef.current === gen) {
          setIsLoadingConversation(false)
        }
      }
    },
    [authFetch]
  )

  const newChat = useCallback(() => {
    loadGenRef.current++ // Invalidate any pending loadConversation
    closeWs()
    activeMessageRef.current = null
    setMessages([])
    setConversationId(null)
    chatStateCache.delete(cacheKey)
    // Prevent auto-restore from re-loading the old conversation
    autoRestoredKeyRef.current = cacheKey
  }, [closeWs, cacheKey])

  const clearChat = useCallback(() => {
    closeWs()
    activeMessageRef.current = null
    setMessages([])
    if (conversationId) {
      authFetch(`/api/assistant/conversations/${conversationId}`, { method: 'DELETE' }).catch(() => {})
    }
    setConversationId(null)
    chatStateCache.delete(cacheKey)
    // Prevent auto-restore from re-loading the deleted conversation
    autoRestoredKeyRef.current = cacheKey
  }, [closeWs, conversationId, authFetch, cacheKey])

  const stopStreaming = useCallback(() => {
    closeWs()
    activeMessageRef.current = null
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [closeWs])

  // Auto-restore: on mount (or studyId/mode change), if cache is empty,
  // fetch the latest conversation from DB and load its messages.
  // This ensures the chat survives full page refreshes.
  useEffect(() => {
    // Skip if caller wants a fresh start (e.g., navigating from home with a prompt in the URL)
    if (skipAutoRestore) {
      autoRestoredKeyRef.current = cacheKey
      return
    }
    // Skip if we already restored for this key
    if (autoRestoredKeyRef.current === cacheKey) return
    // Skip if we already have a conversation (from cache or earlier load)
    if (conversationId) {
      autoRestoredKeyRef.current = cacheKey
      return
    }
    autoRestoredKeyRef.current = cacheKey

    const params = new URLSearchParams()
    if (studyId) params.set('studyId', studyId)
    params.set('mode', mode)

    // For non-create mode, studyId is required by the API
    if (!studyId && mode !== 'create') return

    authFetch(`/api/assistant/conversations?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // Only restore if we haven't switched away in the meantime
        if (autoRestoredKeyRef.current !== cacheKey) return
        if (data?.conversations?.length > 0) {
          loadConversation(data.conversations[0].id)
        }
      })
      .catch(() => {})
  }, [cacheKey, conversationId, studyId, mode, authFetch, loadConversation]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up persistent WS on unmount
  useEffect(() => {
    return () => {
      closeWs()
      activeMessageRef.current = null
    }
  }, [closeWs])

  return {
    messages,
    isStreaming,
    isLoadingConversation,
    sendMessage,
    loadConversation,
    newChat,
    clearChat,
    stopStreaming,
    conversationId,
    rateLimitInfo,
  }
}
