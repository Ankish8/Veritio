import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type {
  PanelParticipantWithTags,
  PanelParticipantWithDetails,
  PanelParticipantFilters,
  PaginationParams,
  PanelParticipantInsert,
  PanelParticipantUpdate,
} from '@/lib/supabase/panel-types'
import type { PaginatedResult } from '@/services/panel'

interface UsePanelParticipantsOptions {
  filters?: PanelParticipantFilters
  pagination?: PaginationParams
  overrideOrganizationId?: string
}

/** Manages panel participants with pagination and filters. */
export function usePanelParticipants(options: UsePanelParticipantsOptions = {}) {
  const authFetch = useAuthFetch()
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = options.overrideOrganizationId || storeOrganizationId
  const { filters, pagination } = options

  const queryString = useMemo(() => {
    const params = new URLSearchParams()

    if (organizationId) params.set('organizationId', organizationId)
    if (pagination?.page) params.set('page', String(pagination.page))
    if (pagination?.limit) params.set('limit', String(pagination.limit))
    if (pagination?.sort_by) params.set('sort_by', pagination.sort_by)
    if (pagination?.sort_order) params.set('sort_order', pagination.sort_order)

    const statusValue = Array.isArray(filters?.status) ? filters.status[0] : filters?.status
    const sourceValue = Array.isArray(filters?.source) ? filters.source[0] : filters?.source
    if (statusValue) params.set('status', statusValue)
    if (sourceValue) params.set('source', sourceValue)
    if (filters?.search) params.set('search', filters.search)
    if (filters?.segment_id) params.set('segment_id', filters.segment_id)
    if (filters?.tag_id) params.set('tag_id', filters.tag_id)

    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [filters, pagination, organizationId])

  const { data, error, isLoading, mutate } = useSWR<PaginatedResult<PanelParticipantWithTags>>(
    organizationId ? `/api/panel/participants${queryString}` : null,
    null,
    options.overrideOrganizationId ? { revalidateOnMount: false } : undefined
  )

  const createParticipant = useCallback(async (input: PanelParticipantInsert & { tag_ids?: string[] }) => {
    const response = await authFetch(`/api/panel/participants?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create participant')
    }

    const newParticipant = await response.json()
    await invalidateCache('panel:participant-created')
    mutate()
    return newParticipant
  }, [authFetch, mutate, organizationId])

  const updateParticipant = useCallback(async (
    participantId: string,
    input: PanelParticipantUpdate & { tag_ids?: string[] }
  ) => {
    const response = await authFetch(`/api/panel/participants/${participantId}?organizationId=${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update participant')
    }

    const updatedParticipant = await response.json()
    await invalidateCache('panel:participant-created')
    mutate()
    return updatedParticipant
  }, [authFetch, mutate, organizationId])

  const deleteParticipant = useCallback(async (participantId: string) => {
    const response = await authFetch(`/api/panel/participants/${participantId}?organizationId=${organizationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete participant')
    }

    await invalidateCache('panel:participant-created')
    mutate()
  }, [authFetch, mutate, organizationId])

  const bulkDeleteParticipants = useCallback(async (ids: string[]) => {
    const response = await authFetch(`/api/panel/participants/bulk-delete?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete participants')
    }

    await invalidateCache('panel:participant-created')
    mutate()
    return response.json() as Promise<{ deleted: number }>
  }, [authFetch, mutate, organizationId])

  return {
    participants: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 50,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    mutate,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    bulkDeleteParticipants,
  }
}

/** Fetches a single participant with full details. */
export function usePanelParticipant(participantId: string | null) {
  const organizationId = useCurrentOrganizationId()
  const { data, error, isLoading, mutate } = useSWR<PanelParticipantWithDetails>(
    participantId && organizationId ? `/api/panel/participants/${participantId}?organizationId=${organizationId}` : null,
    null,
    {
      // Show stale data instantly while revalidating in background
      keepPreviousData: true,
    }
  )

  return {
    participant: data || null,
    isLoading,
    error,
    mutate,
  }
}

/** Participant mutations without fetching the participants list. */
export function useParticipantActions() {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()

  const updateParticipant = useCallback(async (
    participantId: string,
    input: PanelParticipantUpdate & { tag_ids?: string[] }
  ) => {
    const response = await authFetch(`/api/panel/participants/${participantId}?organizationId=${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update participant')
    }

    return response.json()
  }, [authFetch, organizationId])

  const deleteParticipant = useCallback(async (participantId: string) => {
    const response = await authFetch(`/api/panel/participants/${participantId}?organizationId=${organizationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete participant')
    }
  }, [authFetch, organizationId])

  return {
    updateParticipant,
    deleteParticipant,
  }
}

/** Imports participants from CSV/JSON. */
export function usePanelImport() {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()

  const importParticipants = useCallback(async (input: {
    participants: Array<{
      email: string
      first_name?: string
      last_name?: string
      demographics?: Record<string, unknown>
      custom_attributes?: Record<string, unknown>
      tags?: string[]
    }>
    duplicate_handling: 'skip' | 'update' | 'merge'
    auto_create_tags: boolean
    default_tag_id?: string
  }) => {
    const response = await authFetch(`/api/panel/participants/import?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to import participants')
    }

    return response.json()
  }, [authFetch, organizationId])

  return { importParticipants }
}
