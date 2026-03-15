'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { swrFetcher } from '@/lib/swr'
import { useAuthFetch } from './use-auth-fetch'

export interface ComposioTrigger {
  id: string
  user_id: string
  toolkit: string
  trigger_slug: string
  composio_trigger_id: string | null
  trigger_config: Record<string, unknown>
  status: string
  last_event_at: string | null
  event_count: number
  created_at: string
  updated_at: string
}

interface TriggersResponse {
  triggers: ComposioTrigger[]
}

/**
 * Hook to manage Composio event triggers.
 * Returns the user's triggers, plus methods to create and delete them.
 */
export function useComposioTriggers(toolkit?: string) {
  const authFetch = useAuthFetch()

  const swrKey = toolkit
    ? `/api/integrations/composio/triggers?toolkit=${encodeURIComponent(toolkit)}`
    : '/api/integrations/composio/triggers'

  const { data, error, isLoading, mutate } = useSWR<TriggersResponse>(
    swrKey,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const createTrigger = useCallback(
    async (params: { toolkit: string; triggerSlug: string; config?: Record<string, unknown> }) => {
      const res = await authFetch('/api/integrations/composio/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create trigger' }))
        throw new Error(err.error)
      }

      const result = await res.json()
      mutate()
      return result
    },
    [authFetch, mutate]
  )

  const deleteTrigger = useCallback(
    async (triggerId: string) => {
      const res = await authFetch(`/api/integrations/composio/triggers/${triggerId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete trigger' }))
        throw new Error(err.error)
      }

      mutate()
    },
    [authFetch, mutate]
  )

  return {
    triggers: data?.triggers ?? [],
    isLoading,
    error,
    createTrigger,
    deleteTrigger,
    refresh: mutate,
  }
}
