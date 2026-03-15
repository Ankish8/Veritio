'use client'

import { useCallback, useRef } from 'react'
import useSWR from 'swr'
import { useAuthFetch } from '@/hooks/use-auth-fetch'

interface ExcludedParticipantsResponse {
  excludedIds: string[]
}

interface UseExcludedParticipantsReturn {
  /** Set of currently excluded participant IDs */
  excludedIds: Set<string>
  /** Whether the initial fetch is loading */
  isLoading: boolean
  /** Toggle a single participant's exclusion (optimistic) */
  toggleExclude: (participantId: string, exclude: boolean) => Promise<void>
  /** Bulk toggle multiple participants' exclusion (optimistic) */
  bulkToggleExclude: (participantIds: string[], exclude: boolean) => Promise<void>
}

/**
 * Shared hook for participant exclusion state.
 *
 * - Fetches excluded IDs from the server on mount via SWR
 * - Provides optimistic toggle/bulk-toggle with automatic rollback on error
 * - SWR deduplicates across components — safe to call from multiple places
 * - Accepts optional `initialExcludedIds` from SSR to prevent flash of unfiltered data
 */
export function useExcludedParticipants(
  studyId: string | null,
  initialExcludedIds?: string[]
): UseExcludedParticipantsReturn {
  const authFetch = useAuthFetch()
  const swrKey = studyId ? `/api/studies/${studyId}/excluded-participants` : null

  const { data, isLoading, mutate } = useSWR<ExcludedParticipantsResponse>(
    swrKey,
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch excluded participants')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
      // When SSR provides initial IDs, SWR starts with data immediately (no loading flash)
      fallbackData: initialExcludedIds ? { excludedIds: initialExcludedIds } : undefined,
    }
  )

  const excludedIds = useRef(new Set<string>())

  // Keep ref in sync with SWR data
  const currentSet = new Set(data?.excludedIds ?? [])
  excludedIds.current = currentSet

  const toggleExclude = useCallback(async (participantId: string, exclude: boolean) => {
    // Optimistic update
    const previousData = data
    const optimisticIds = new Set(data?.excludedIds ?? [])
    if (exclude) {
      optimisticIds.add(participantId)
    } else {
      optimisticIds.delete(participantId)
    }
    mutate({ excludedIds: [...optimisticIds] }, false)

    try {
      await authFetch(`/api/studies/${studyId}/participants/${participantId}/toggle-exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude }),
      })
    } catch {
      // Rollback on error
      mutate(previousData, false)
    }
  }, [authFetch, studyId, data, mutate])

  const bulkToggleExclude = useCallback(async (participantIds: string[], exclude: boolean) => {
    if (participantIds.length === 0) return

    // Optimistic update
    const previousData = data
    const optimisticIds = new Set(data?.excludedIds ?? [])
    for (const id of participantIds) {
      if (exclude) {
        optimisticIds.add(id)
      } else {
        optimisticIds.delete(id)
      }
    }
    mutate({ excludedIds: [...optimisticIds] }, false)

    try {
      const res = await authFetch(`/api/studies/${studyId}/participants/bulk-toggle-exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds, exclude }),
      })
      if (!res.ok) throw new Error('Bulk toggle failed')
    } catch {
      // Rollback on error
      mutate(previousData, false)
    }
  }, [authFetch, studyId, data, mutate])

  return {
    excludedIds: currentSet,
    isLoading,
    toggleExclude,
    bulkToggleExclude,
  }
}
