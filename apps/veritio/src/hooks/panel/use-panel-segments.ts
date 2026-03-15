import useSWR from 'swr'
import { useCallback } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type { PanelSegment, PanelSegmentInsert, PanelSegmentUpdate, SegmentCondition, PanelParticipant } from '@/lib/supabase/panel-types'

/** Manages panel segments with CRUD and preview. */
export function usePanelSegments(overrideOrganizationId?: string) {
  const authFetch = useAuthFetch()
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = overrideOrganizationId || storeOrganizationId

  const { data, error, isLoading, mutate } = useSWR<PanelSegment[]>(
    organizationId ? `/api/panel/segments?organizationId=${organizationId}` : null,
    null,
    overrideOrganizationId ? { revalidateOnMount: false } : undefined
  )

  const createSegment = useCallback(async (input: PanelSegmentInsert) => {
    const response = await authFetch(`/api/panel/segments?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create segment')
    }

    const newSegment = await response.json()

    await invalidateCache('panel:segment-created')
    mutate((segments) => [...(segments || []), newSegment], { revalidate: false })
    return newSegment as PanelSegment
  }, [authFetch, mutate, organizationId])

  const updateSegment = useCallback(async (segmentId: string, input: PanelSegmentUpdate) => {
    const response = await authFetch(`/api/panel/segments/${segmentId}?organizationId=${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update segment')
    }

    const updatedSegment = await response.json()

    await invalidateCache('panel:segment-updated', { segmentId })
    mutate((segments) => segments?.map(s => s.id === segmentId ? updatedSegment : s), { revalidate: false })
    return updatedSegment as PanelSegment
  }, [authFetch, mutate, organizationId])

  const deleteSegment = useCallback(async (segmentId: string) => {
    const response = await authFetch(`/api/panel/segments/${segmentId}?organizationId=${organizationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete segment')
    }

    await invalidateCache('panel:segment-updated', { segmentId })
    mutate((segments) => segments?.filter(s => s.id !== segmentId), { revalidate: false })
  }, [authFetch, mutate, organizationId])

  const previewSegment = useCallback(async (conditions: SegmentCondition[], limit: number = 10) => {
    const response = await authFetch(`/api/panel/segments/preview?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions, limit }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to preview segment')
    }

    return response.json() as Promise<{ count: number; samples: PanelParticipant[] }>
  }, [authFetch, organizationId])

  return {
    segments: data || [],
    isLoading,
    error,
    mutate,
    createSegment,
    updateSegment,
    deleteSegment,
    previewSegment,
  }
}

/** Fetches a single segment by ID. */
export function usePanelSegment(segmentId: string | null) {
  const organizationId = useCurrentOrganizationId()
  const { data, error, isLoading, mutate } = useSWR<PanelSegment>(
    segmentId && organizationId ? `/api/panel/segments/${segmentId}?organizationId=${organizationId}` : null
  )

  return {
    segment: data || null,
    isLoading,
    error,
    mutate,
  }
}
