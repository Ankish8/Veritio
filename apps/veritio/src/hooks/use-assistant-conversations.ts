'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { swrFetcher } from '@/lib/swr'
import { useAuthFetch } from './use-auth-fetch'
import type { ConversationListResponse } from '@/services/assistant/types'

export function useAssistantConversations(studyId: string, mode: 'results' | 'builder' = 'results') {
  const authFetch = useAuthFetch()

  const { data, error, isLoading, mutate } = useSWR<ConversationListResponse>(
    studyId ? `/api/assistant/conversations?studyId=${studyId}&mode=${mode}` : null,
    swrFetcher
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      // Optimistic update
      mutate(
        (current) =>
          current ? { conversations: current.conversations.filter((c) => c.id !== id) } : current,
        false
      )

      try {
        const response = await authFetch(`/api/assistant/conversations/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          mutate()
        }
      } catch {
        mutate()
      }
    },
    [authFetch, mutate]
  )

  const deleteAllConversations = useCallback(async () => {
    const ids = data?.conversations.map((c) => c.id) ?? []
    if (ids.length === 0) return

    mutate({ conversations: [] }, false)

    try {
      await Promise.all(
        ids.map((id) =>
          authFetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' })
        )
      )
    } catch {
      mutate()
    }
  }, [data?.conversations, authFetch, mutate])

  return {
    conversations: data?.conversations ?? [],
    isLoading,
    error,
    mutate,
    deleteConversation,
    deleteAllConversations,
  }
}
