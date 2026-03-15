import useSWR from 'swr'
import { useCallback } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type { PanelWidgetConfig, PanelWidgetConfigUpdate } from '@/lib/supabase/panel-types'

/** Manages panel widget configuration with optimistic updates. */
export function usePanelWidget(overrideOrganizationId?: string) {
  const authFetch = useAuthFetch()
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = overrideOrganizationId || storeOrganizationId

  const { data, error, isLoading, mutate } = useSWR<PanelWidgetConfig>(
    organizationId ? `/api/panel/widget?organizationId=${organizationId}` : null,
    // When server-prefetched data exists (overrideOrganizationId provided),
    // skip revalidation on mount — the SWR fallback is already fresh.
    overrideOrganizationId ? { revalidateOnMount: false } : undefined
  )

  const updateConfig = useCallback(async (input: PanelWidgetConfigUpdate) => {
    if (data) {
      mutate({
        ...data,
        config: input.config ? { ...data.config, ...input.config } : data.config,
        active_study_id: input.active_study_id !== undefined ? input.active_study_id : data.active_study_id,
      }, { revalidate: false })
    }

    try {
      const response = await authFetch(`/api/panel/widget?organizationId=${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update widget config')
      }

      const updatedConfig = await response.json()
      mutate(updatedConfig, { revalidate: false })
      return updatedConfig as PanelWidgetConfig
    } catch (error) {
      // Rollback on error by revalidating
      mutate()
      throw error
    }
  }, [authFetch, mutate, data, organizationId])

  const setEnabled = useCallback(async (enabled: boolean) => {
    return updateConfig({ config: { enabled } })
  }, [updateConfig])

  const setActiveStudy = useCallback(async (studyId: string | null) => {
    return updateConfig({ active_study_id: studyId })
  }, [updateConfig])

  return {
    config: data || null,
    isLoading,
    error,
    mutate,
    updateConfig,
    setEnabled,
    setActiveStudy,
  }
}

/** Fetches widget embed code. */
export function useWidgetEmbedCode(overrideOrganizationId?: string) {
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = overrideOrganizationId || storeOrganizationId
  const { data, error, isLoading } = useSWR<{ embed_code: string }>(
    organizationId ? `/api/panel/widget/embed-code?organizationId=${organizationId}` : null,
    overrideOrganizationId ? { revalidateOnMount: false } : undefined
  )

  return {
    embedCode: data?.embed_code || null,
    isLoading,
    error,
  }
}

/** Fetches available studies for widget assignment. */
export function useAvailableStudiesForWidget() {
  const organizationId = useCurrentOrganizationId()
  const { data, error, isLoading } = useSWR<Array<{ id: string; title: string; study_type: string }>>(
    organizationId ? `/api/panel/widget/available-studies?organizationId=${organizationId}` : null
  )

  return {
    studies: data || [],
    isLoading,
    error,
  }
}
