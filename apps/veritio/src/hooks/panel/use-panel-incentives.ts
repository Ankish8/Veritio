import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type {
  StudyIncentiveConfig,
  PanelIncentiveDistributionWithDetails,
  PanelIncentiveFilters,
  PaginationParams,
  IncentiveStatus,
} from '@/lib/supabase/panel-types'
import type { PaginatedResult, IncentiveStats } from '@/services/panel'

interface UseIncentiveDistributionsOptions {
  filters?: PanelIncentiveFilters
  pagination?: PaginationParams
  skipRevalidateOnMount?: boolean
}

/** Manages study incentive configuration. */
export function useStudyIncentiveConfig(studyId: string | null) {
  const authFetch = useAuthFetch()

  const { data, error, isLoading, mutate } = useSWR<StudyIncentiveConfig>(
    studyId ? `/api/studies/${studyId}/incentive-config` : null,
    {
      revalidateOnFocus: true,  // Refetch when window regains focus
      revalidateOnReconnect: true,  // Refetch when network reconnects
      dedupingInterval: 2000,  // Dedupe requests within 2 seconds
    }
  )

  const updateConfig = useCallback(async (input: {
    enabled?: boolean
    amount?: number | null
    currency?: string
    incentive_type?: string
    description?: string | null
  }) => {
    if (!studyId) throw new Error('Study ID is required')

    const response = await authFetch(`/api/studies/${studyId}/incentive-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update incentive config')
    }

    const updatedConfig = await response.json()
    mutate(updatedConfig, { revalidate: false })
    return updatedConfig as StudyIncentiveConfig
  }, [studyId, authFetch, mutate])

  return {
    config: data || null,
    isLoading,
    error,
    mutate,
    updateConfig,
  }
}

/** Manages incentive distributions with pagination and filters. */
export function useIncentiveDistributions(options: UseIncentiveDistributionsOptions = {}) {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()
  const { filters, pagination } = options

  // Build query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams()

    if (organizationId) params.set('organizationId', organizationId)
    if (pagination?.page) params.set('page', String(pagination.page))
    if (pagination?.limit) params.set('limit', String(pagination.limit))
    if (pagination?.sort_by) params.set('sort_by', pagination.sort_by)
    if (pagination?.sort_order) params.set('sort_order', pagination.sort_order)

    if (filters?.study_id) params.set('study_id', filters.study_id)
    if (filters?.status) {
      const status = Array.isArray(filters.status) ? filters.status[0] : filters.status
      params.set('status', status)
    }

    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [filters, pagination, organizationId])

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<PanelIncentiveDistributionWithDetails>>(
    organizationId ? `/api/panel/incentives${queryString}` : null,
    null,
    options.skipRevalidateOnMount ? { revalidateOnMount: false } : undefined
  )

  const updateDistribution = useCallback(async (
    distributionId: string,
    input: { status: IncentiveStatus; fulfillment_method?: string; fulfillment_reference?: string; notes?: string }
  ) => {
    const response = await authFetch(`/api/panel/incentives/${distributionId}?organizationId=${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update distribution')
    }

    mutate()
    return response.json()
  }, [authFetch, mutate, organizationId])

  const bulkMarkSent = useCallback(async (input: {
    distribution_ids: string[]
    fulfillment_method: string
    fulfillment_reference?: string
    notes?: string
  }) => {
    const response = await authFetch(`/api/panel/incentives/bulk-mark-sent?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to mark distributions as sent')
    }

    mutate()
    return response.json()
  }, [authFetch, mutate, organizationId])

  return {
    distributions: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 50,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
    updateDistribution,
    bulkMarkSent,
  }
}

/** Fetches aggregate incentive stats. */
export function useIncentiveStats(options?: { skipRevalidateOnMount?: boolean }) {
  const organizationId = useCurrentOrganizationId()
  const { data, error, isLoading } = useSWR<IncentiveStats>(
    organizationId ? `/api/panel/incentives/stats?organizationId=${organizationId}` : null,
    null,
    options?.skipRevalidateOnMount ? { revalidateOnMount: false } : undefined
  )

  return {
    stats: data || null,
    isLoading,
    error,
  }
}
