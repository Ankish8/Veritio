'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface AnalysisEvent {
  id: string
  studyId: string
  event: 'participant-started' | 'participant-completed' | 'participant-abandoned' | 'response-submitted'
  participantId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface RealtimeResultsState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  newResponseCount: number
  lastEvent: AnalysisEvent | null
  events: AnalysisEvent[]
  resetCounter: () => void
  reconnect: () => void
}

/** Real-time results updates via Motia participantActivity SSE stream. */
export function useRealtimeResults(studyId: string): RealtimeResultsState {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newResponseCount, setNewResponseCount] = useState(0)
  const [lastEvent, setLastEvent] = useState<AnalysisEvent | null>(null)
  const [events, setEvents] = useState<AnalysisEvent[]>([])

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    setIsConnecting(true)
    setError(null)

    try {
      const eventSource = new EventSource(
        `/api/streams/participantActivity?group=${studyId}`
      )

      eventSource.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        setIsConnecting(false)

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++

        if (reconnectAttemptsRef.current <= 5) {
          reconnectTimeoutRef.current = setTimeout(() => {
            // eslint-disable-next-line react-hooks/immutability
            connect()
          }, delay)
        } else {
          setError('Connection lost. Click to reconnect.')
        }
      }

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as AnalysisEvent

          if (event.studyId !== studyId) return

          if (event.event === 'response-submitted' || event.event === 'participant-completed') {
            setNewResponseCount((prev) => prev + 1)
          }

          setLastEvent(event)
          setEvents((prev) => [...prev.slice(-49), event]) // Keep last 50 events
        } catch {
          // Ignore malformed events
        }
      }

      eventSourceRef.current = eventSource
    } catch {
      setIsConnecting(false)
      setError('Failed to connect to real-time updates')
    }
  }, [studyId])

  const resetCounter = useCallback(() => {
    setNewResponseCount(0)
  }, [])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    isConnected,
    isConnecting,
    error,
    newResponseCount,
    lastEvent,
    events,
    resetCounter,
    reconnect,
  }
}
