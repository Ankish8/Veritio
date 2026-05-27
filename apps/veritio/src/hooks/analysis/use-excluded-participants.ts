'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
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

function isStudyListCacheKey(key: unknown): key is string {
  if (typeof key !== 'string') return false

  return (
    key === '/api/studies' ||
    key.startsWith('/api/studies?') ||
    key.startsWith('/api/dashboard/stats') ||
    (key.startsWith('/api/projects/') && key.includes('/studies'))
  )
}

const initialExcludedIdsByStudyId = new Map<string, string[]>()

function setInitialExcludedIdsForStudy(studyId: string | null, excludedIds?: string[]) {
  if (!studyId || excludedIds === undefined) return
  initialExcludedIdsByStudyId.set(studyId, excludedIds)
}

function getInitialExcludedIdsForStudy(studyId: string | null) {
  if (!studyId) return undefined
  return initialExcludedIdsByStudyId.get(studyId)
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
  const fallbackExcludedIds = useMemo(() => {
    setInitialExcludedIdsForStudy(studyId, initialExcludedIds)
    return initialExcludedIds ?? getInitialExcludedIdsForStudy(studyId)
  }, [studyId, initialExcludedIds])

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
      fallbackData: fallbackExcludedIds ? { excludedIds: fallbackExcludedIds } : undefined,
    }
  )

  const excludedIds = useRef(new Set<string>())

  // Keep ref in sync with SWR data
  const currentSet = new Set(data?.excludedIds ?? [])
  excludedIds.current = currentSet

  useEffect(() => {
    if (data?.excludedIds) {
      setInitialExcludedIdsForStudy(studyId, data.excludedIds)
    }
  }, [studyId, data?.excludedIds])

  const revalidateStudyListCounts = useCallback(async () => {
    await globalMutate(isStudyListCacheKey, undefined, { revalidate: true })
  }, [])

  const toggleExclude = useCallback(async (participantId: string, exclude: boolean) => {
    if (!studyId) return

    // Optimistic update
    const previousData = data
    const optimisticIds = new Set(data?.excludedIds ?? [])
    if (exclude) {
      optimisticIds.add(participantId)
    } else {
      optimisticIds.delete(participantId)
    }
    mutate({ excludedIds: [...optimisticIds] }, false)
    setInitialExcludedIdsForStudy(studyId, [...optimisticIds])

    try {
      const res = await authFetch(`/api/studies/${studyId}/participants/${participantId}/toggle-exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude }),
      })
      if (!res.ok) throw new Error('Toggle exclude failed')
      await revalidateStudyListCounts()
    } catch {
      // Rollback on error
      mutate(previousData, false)
      setInitialExcludedIdsForStudy(studyId, previousData?.excludedIds ?? [])
    }
  }, [authFetch, studyId, data, mutate, revalidateStudyListCounts])

  const bulkToggleExclude = useCallback(async (participantIds: string[], exclude: boolean) => {
    if (!studyId) return
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
    setInitialExcludedIdsForStudy(studyId, [...optimisticIds])

    try {
      const res = await authFetch(`/api/studies/${studyId}/participants/bulk-toggle-exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds, exclude }),
      })
      if (!res.ok) throw new Error('Bulk toggle failed')
      await revalidateStudyListCounts()
    } catch {
      // Rollback on error
      mutate(previousData, false)
      setInitialExcludedIdsForStudy(studyId, previousData?.excludedIds ?? [])
    }
  }, [authFetch, studyId, data, mutate, revalidateStudyListCounts])

  return {
    excludedIds: currentSet,
    isLoading,
    toggleExclude,
    bulkToggleExclude,
  }
}
