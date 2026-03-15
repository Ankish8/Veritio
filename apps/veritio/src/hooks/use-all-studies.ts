'use client'

import { useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'

// Explicitly defined to avoid type regeneration issues
export interface StudyWithProject {
  id: string
  title: string
  study_type: string
  status: string
  user_id: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  launched_at: string | null
  project_id: string
  project_name: string
  participant_count: number
}

export interface AllStudiesFilters {
  type?: 'card_sort' | 'tree_test'
  status?: 'draft' | 'active' | 'paused' | 'completed'
  search?: string
  archived?: boolean
}

export interface AllStudiesResponse {
  data: StudyWithProject[]
  total: number
}

/**
 * Build query string from filters
 */
function buildQueryString(filters: AllStudiesFilters, limit: number, offset: number): string {
  const params = new URLSearchParams()

  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.archived) params.set('archived', 'true')
  params.set('limit', limit.toString())
  params.set('offset', offset.toString())

  return params.toString()
}

/**
 * Hook to fetch all studies across all projects with SWR caching.
 *
 * Uses global SWR configuration from SWRProvider:
 * - 30 second deduplication
 * - Automatic error retry with exponential backoff
 * - 15 second request timeout
 *
 * Supports filtering by type, status, search, and pagination.
 */
export function useAllStudies(
  filters: AllStudiesFilters = {},
  options: { limit?: number; offset?: number } = {},
  initialData?: AllStudiesResponse
) {
  const limit = options.limit || 50
  const offset = options.offset || 0

  const queryString = useMemo(
    () => buildQueryString(filters, limit, offset),
    [filters, limit, offset]
  )

  const { data, error, isLoading, isValidating, mutate } = useSWR<AllStudiesResponse>(
    SWR_KEYS.allStudies(queryString),
    null, // Uses global fetcher
    {
      fallbackData: initialData,
      // Immediately revalidate stale data on mount (fixes stale data after deletion)
      revalidateIfStale: true,
    }
  )

  // Auth fetch for mutations only
  const authFetch = getAuthFetchInstance()

  const archiveStudy = useCallback(async (studyId: string) => {
    const response = await authFetch(`/api/studies/${studyId}/archive`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to archive study')
    }

    const result = await response.json()

    // Use cache orchestrator for centralized invalidation
    await invalidateCache('study:archived', { studyId })

    // Revalidate the current list
    mutate()

    return result
  }, [authFetch, mutate])

  const updateStudyStatus = useCallback(async (studyId: string, status: string) => {
    const response = await authFetch(`/api/studies/${studyId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      throw new Error('Failed to update study status')
    }

    const result = await response.json()

    // Use cache orchestrator for centralized invalidation
    await invalidateCache('study:status-changed', { studyId })

    // Revalidate the current list
    mutate()

    return result
  }, [authFetch, mutate])

  return {
    studies: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isValidating,
    error: error?.message || null,
    refetch: () => mutate(),
    archiveStudy,
    updateStudyStatus,
  }
}
