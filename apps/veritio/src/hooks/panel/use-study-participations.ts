import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import type {
  PanelStudyParticipationWithDetails,
  ParticipationStatus,
  ParticipationSource,
  PaginationParams,
} from '@/lib/supabase/panel-types'
import type { PaginatedResult } from '@/services/panel'

interface UseStudyParticipationsOptions {
  status?: ParticipationStatus
  source?: ParticipationSource
  pagination?: PaginationParams
}

/** Fetches panel participations for a study with pagination. */
export function useStudyParticipations(
  studyId: string | null,
  options: UseStudyParticipationsOptions = {}
) {
  const authFetch = useAuthFetch()
  const { status, source, pagination } = options

  // Build query string
  const queryString = useMemo(() => {
    if (!studyId) return ''

    const params = new URLSearchParams()
    if (pagination?.page) params.set('page', String(pagination.page))
    if (pagination?.limit) params.set('limit', String(pagination.limit))
    if (status) params.set('status', status)
    if (source) params.set('source', source)

    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [studyId, status, source, pagination])

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<PanelStudyParticipationWithDetails>>(
    studyId ? `/api/studies/${studyId}/panel-participations${queryString}` : null
  )

  const inviteParticipants = useCallback(async (participantIds: string[], inviteSource: ParticipationSource = 'direct') => {
    if (!studyId) throw new Error('Study ID is required')

    const response = await authFetch(`/api/studies/${studyId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_ids: participantIds,
        source: inviteSource,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to invite participants')
    }

    const result = await response.json()
    mutate() // Revalidate list
    return result as { invited: number; skipped: number; message: string }
  }, [studyId, authFetch, mutate])

  return {
    participations: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 50,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
    inviteParticipants,
  }
}
