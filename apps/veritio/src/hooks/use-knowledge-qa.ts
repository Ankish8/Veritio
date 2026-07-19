'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthFetch } from './use-auth-fetch'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { subscribeToStream, unwrapStreamEvent } from './use-iii-stream'

interface SSEEvent {
  type: string
  content?: string
  message?: string
  metadata?: { usedArticleSlugs?: string[] }
}

export function useKnowledgeQA(context: string) {
  const [answer, setAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [usedArticleSlugs, setUsedArticleSlugs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const authFetch = useAuthFetch()
  const currentOrganizationId = useCurrentOrganizationId()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const closeWs = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    closeWs()
    setAnswer('')
    setIsStreaming(false)
    setUsedArticleSlugs([])
    setError(null)
  }, [closeWs])

  const askQuestion = useCallback(
    async (question: string) => {
      reset()
      setIsStreaming(true)

      const streamId = crypto.randomUUID()
      const completedRef = { current: false }

      // Subscribe to the answer stream via the shared iii client. Fail-soft:
      // if it never delivers, the HTTP fallback below applies data.events.
      unsubscribeRef.current = subscribeToStream('assistantChat', streamId, {
        onEvent: (change) => {
          const event = unwrapStreamEvent<SSEEvent>(change)
          if (!event) return

          if (event.type === 'text_delta' && event.content) {
            setAnswer((prev) => prev + event.content)
          } else if (event.type === 'text_replace' && event.content) {
            setAnswer(event.content)
          } else if (event.type === 'message_complete') {
            if (event.metadata?.usedArticleSlugs) {
              setUsedArticleSlugs(event.metadata.usedArticleSlugs)
            }
            completedRef.current = true
            closeWs()
            setIsStreaming(false)
          } else if (event.type === 'error') {
            setError(event.message || 'Something went wrong')
            completedRef.current = true
            closeWs()
            setIsStreaming(false)
          }
        },
      })
      // Allow the subscription to register before the HTTP request fires events
      await new Promise<void>((resolve) => setTimeout(resolve, 150))

      // POST to backend
      try {
        const response = await authFetch('/api/knowledge/help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            context,
            streamId,
            organizationId: currentOrganizationId ?? undefined,
          }),
        })

        if (!response.ok) {
          closeWs()
          // Only show error if WebSocket didn't already complete successfully
          if (!completedRef.current) {
            setError('Failed to get answer. Please try again.')
            setIsStreaming(false)
          }
          return
        }

        const data = await response.json()

        if (completedRef.current) return

        // Wait briefly for buffered WebSocket events
        await new Promise((r) => setTimeout(r, 200))
        if (completedRef.current) return

        // Fallback: apply JSON events if WebSocket didn't complete
        closeWs()
        setAnswer('')
        let fallbackAnswer = ''
        const events: SSEEvent[] = data.events ?? []
        for (const event of events) {
          if ((event.type === 'text_delta' || event.type === 'text_replace') && event.content) {
            fallbackAnswer = event.type === 'text_replace' ? event.content : fallbackAnswer + event.content
          } else if (event.type === 'message_complete' && event.metadata?.usedArticleSlugs) {
            setUsedArticleSlugs(event.metadata.usedArticleSlugs)
          }
        }
        setAnswer(fallbackAnswer)
        setIsStreaming(false)
      } catch {
        closeWs()
        setError('Something went wrong. Please try again.')
        setIsStreaming(false)
      }
    },
    [authFetch, context, currentOrganizationId, reset, closeWs]
  )

  return { answer, isStreaming, usedArticleSlugs, error, askQuestion, reset }
}
