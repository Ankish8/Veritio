'use client'

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'
import { swrFetcher } from '@/lib/swr'
import { useAuthFetch } from './use-auth-fetch'
import { toast } from '@/components/ui/sonner'

export interface PendingEvent {
  id: string
  toolkit: string
  trigger_slug: string
  event_type: string
  event_summary: string
  event_payload?: Record<string, unknown>
  created_at: string
}

interface PendingEventsResponse {
  count: number
  events: PendingEvent[]
}

/** Convert raw event summaries (e.g. 'GOOGLESHEETS_NEW_ROWS_TRIGGER fired:') to readable text. */
export function humanizeEventSummary(event: PendingEvent): string {
  const { event_summary, toolkit, trigger_slug } = event

  if (event_summary.includes('trigger "') && event_summary.includes('" fired:')) {
    const humanSlug = trigger_slug
      .replace(/^[A-Z]+_/, '')
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
    return `${humanSlug} (${toolkit})`
  }

  return event_summary
}

/** Polls for pending integration events and dispatches toast alerts for new arrivals. */
export function useAssistantPendingEvents(isPanelOpen: boolean = false) {
  const authFetch = useAuthFetch()
  const previousCountRef = useRef<number>(0)
  const hasInitializedRef = useRef(false)

  const { data, error, mutate } = useSWR<PendingEventsResponse>(
    '/api/assistant/pending-events',
    swrFetcher,
    {
      refreshInterval: isPanelOpen ? 30000 : 5 * 60 * 1000, // 30s when open, 5min when closed
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const dismissPendingEvents = useCallback(async () => {
    mutate({ count: 0, events: [] }, false)

    try {
      const res = await authFetch('/api/assistant/pending-events/dismiss', {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to dismiss pending events')
      }
      mutate()
    } catch {
      mutate()
    }
  }, [authFetch, mutate])

  const dismissEvent = useCallback(
    async (eventId: string) => {
      if (data) {
        const updatedEvents = data.events.filter((e) => e.id !== eventId)
        mutate({ count: updatedEvents.length, events: updatedEvents }, false)
      }

      try {
        const res = await authFetch('/api/assistant/pending-events/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (!res.ok) {
          throw new Error('Failed to dismiss event')
        }
        mutate()
      } catch {
        mutate()
      }
    },
    [authFetch, mutate, data]
  )

  // Toast notification when new events arrive (only when panel is closed)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      previousCountRef.current = data?.count ?? 0
      return
    }

    const currentCount = data?.count ?? 0
    const newCount = currentCount - previousCountRef.current
    previousCountRef.current = currentCount

    if (isPanelOpen || newCount <= 0) return

    const toastAction = {
      label: 'View',
      onClick: () => document.dispatchEvent(new CustomEvent('open-ai-assistant')),
    }

    const message = newCount === 1 && data?.events[0]
      ? humanizeEventSummary(data.events[0])
      : `${newCount} new integration events`

    toast.info(message, { action: toastAction, duration: 5000 })
  }, [data, isPanelOpen])

  return {
    pendingCount: data?.count ?? 0,
    pendingEvents: data?.events ?? [],
    dismissPendingEvents,
    dismissEvent,
    mutate,
    error,
  }
}
