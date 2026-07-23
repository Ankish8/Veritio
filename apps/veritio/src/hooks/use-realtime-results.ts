'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { subscribeToStream, unwrapStreamEvent } from './use-iii-stream'

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

  const unsubscribeRef = useRef<(() => void) | null>(null)
  /** bumped by reconnect() to force the effect to re-subscribe */
  const [connectGen, setConnectGen] = useState(0)

  const connect = useCallback(() => {
    unsubscribeRef.current?.()
    setIsConnecting(true)
    setError(null)

    // The browser-sdk manages its own reconnection (reconnectionConfig);
    // connection state drives isConnected/isConnecting. A terminal 'failed'
    // surfaces the same "click to reconnect" affordance as the old SSE path.
    unsubscribeRef.current = subscribeToStream('participantActivity', studyId, {
      onStatus: (state) => {
        if (state === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
          setError(null)
        } else if (state === 'connecting' || state === 'reconnecting') {
          setIsConnected(false)
          setIsConnecting(true)
        } else if (state === 'failed') {
          setIsConnected(false)
          setIsConnecting(false)
          setError('Connection lost. Click to reconnect.')
        } else {
          setIsConnected(false)
          setIsConnecting(false)
        }
      },
      onEvent: (change) => {
        const event = unwrapStreamEvent<AnalysisEvent>(change)
        if (!event || event.studyId !== studyId) return

        if (event.event === 'response-submitted' || event.event === 'participant-completed') {
          setNewResponseCount((prev) => prev + 1)
        }
        setLastEvent(event)
        setEvents((prev) => [...prev.slice(-49), event]) // Keep last 50 events
      },
    })
  }, [studyId])

  const resetCounter = useCallback(() => {
    setNewResponseCount(0)
  }, [])

  const reconnect = useCallback(() => {
    setConnectGen((g) => g + 1)
  }, [])

  useEffect(() => {
    connect()
    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
    // connectGen forces a fresh subscription when reconnect() is called
  }, [connect, connectGen])

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
