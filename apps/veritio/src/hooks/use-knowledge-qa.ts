'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthFetch } from './use-auth-fetch'

const WS_URL = process.env.NEXT_PUBLIC_MOTIA_WS_URL || 'ws://localhost:4004'

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
  const wsRef = useRef<WebSocket | null>(null)

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
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

      // Open WebSocket and join stream
      await new Promise<void>((resolve) => {
        let ws: WebSocket
        try {
          ws = new WebSocket(WS_URL)
        } catch {
          resolve()
          return
        }
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'join',
              data: {
                streamName: 'assistantChat',
                groupId: streamId,
                subscriptionId: crypto.randomUUID(),
              },
            })
          )
          resolve()
        }

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string)
            if (msg.event?.type !== 'event') return
            let rawEvt = msg.event.data ?? msg.event.event
            if (rawEvt?.type === 'event') rawEvt = rawEvt.data ?? rawEvt.event ?? rawEvt
            const event = rawEvt as SSEEvent
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
              ws.close()
              wsRef.current = null
              setIsStreaming(false)  
            } else if (event.type === 'error') {
              setError(event.message || 'Something went wrong')  
              completedRef.current = true
              ws.close()
              wsRef.current = null
              setIsStreaming(false)  
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
          wsRef.current = null
        }
      })

      // POST to backend
      try {
        const response = await authFetch('/api/knowledge/help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, context, streamId }),
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
    [authFetch, context, reset, closeWs]
  )

  return { answer, isStreaming, usedArticleSlugs, error, askQuestion, reset }
}
