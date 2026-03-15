'use client'

import { useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { getAuthFetchInstance, SWR_KEYS } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import type { PublicResultsSettings } from '@/components/builders/shared/types'

interface StudyPublicResultsData {
  publicResultsToken: string | null
  publicResultsSettings: PublicResultsSettings
  /** Full sharing_settings object — preserved so updates don't overwrite sibling keys (redirects, intercept, etc.) */
  sharingSettings: Record<string, unknown>
}

interface UsePublicResultsSettingsReturn {
  /** Current public results settings */
  settings: PublicResultsSettings
  /** Public results token (null if not generated) */
  token: string | null
  /** Public results URL (null if not enabled or no token) */
  publicUrl: string | null
  /** Loading state */
  isLoading: boolean
  /** Update public results settings */
  updateSettings: (updates: Partial<PublicResultsSettings>) => Promise<void>
  /** Generate or regenerate the public results token */
  regenerateToken: () => Promise<{ token: string; url: string } | null>
  /** Refresh settings from server (e.g. after external password endpoint changes them) */
  refreshSettings: () => Promise<void>
}

const DEFAULT_SETTINGS: PublicResultsSettings = {
  enabled: false,
  sharedMetrics: {
    overview: true,
    participants: true,
    analysis: true,
    questionnaire: false,
  },
}

/** Hook for managing public results sharing settings. */
export function usePublicResultsSettings(studyId: string | null): UsePublicResultsSettingsReturn {
  const authFetch = getAuthFetchInstance()

  const { data, isLoading, mutate } = useSWR<StudyPublicResultsData>(
    studyId ? SWR_KEYS.studyPublicResults(studyId) : null,
    async () => {
      const response = await authFetch(`/api/studies/${studyId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch study')
      }
      const study = await response.json()

      const sharingSettings = study.sharing_settings || {}
      const publicResultsSettings = sharingSettings.publicResults || DEFAULT_SETTINGS

      return {
        publicResultsToken: study.public_results_token || null,
        publicResultsSettings,
        sharingSettings,
      }
    },
    {
      revalidateOnFocus: false,
    }
  )

  const settings = data?.publicResultsSettings || DEFAULT_SETTINGS
  const token = data?.publicResultsToken || null

  const publicUrl =
    token && settings.enabled && typeof window !== 'undefined'
      ? `${window.location.origin}/results/public/${token}`
      : null

  const updateSettings = useCallback(
    async (updates: Partial<PublicResultsSettings>) => {
      if (!studyId) return

      const newSettings = {
        ...settings,
        ...updates,
        sharedMetrics: {
          ...settings.sharedMetrics,
          ...updates.sharedMetrics,
        },
      }

      // Preserve existing sharing_settings (redirects, intercept, autoAddToPanel) — only update publicResults
      const currentSharingSettings = data?.sharingSettings || {}

      mutate(
        (prev) =>
          prev
            ? { ...prev, publicResultsSettings: newSettings, sharingSettings: { ...currentSharingSettings, publicResults: newSettings } }
            : { publicResultsToken: null, publicResultsSettings: newSettings, sharingSettings: { publicResults: newSettings } },
        false
      )

      const response = await authFetch(`/api/studies/${studyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharing_settings: {
            ...currentSharingSettings,
            publicResults: newSettings,
          },
        }),
      })

      if (!response.ok) {
        mutate()
        throw new Error('Failed to update public results settings')
      }

      await invalidateCache('study:updated', { studyId })
      mutate()
    },
    [studyId, settings, data, authFetch, mutate]
  )

  const regenerateToken = useCallback(async () => {
    if (!studyId) return null

    const response = await authFetch(`/api/studies/${studyId}/public-results/token`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to generate token')
    }

    const result = await response.json()

    mutate(
      (prev) =>
        prev
          ? { ...prev, publicResultsToken: result.token }
          : { publicResultsToken: result.token, publicResultsSettings: DEFAULT_SETTINGS, sharingSettings: {} },
      false
    )

    return result as { token: string; url: string }
  }, [studyId, authFetch, mutate])

  const isGeneratingRef = useRef(false)
  useEffect(() => {
    if (!isLoading && settings.enabled && !token && !isGeneratingRef.current) {
      isGeneratingRef.current = true
      regenerateToken()
        .catch(() => {
          // Ignore errors - user can manually retry
        })
        .finally(() => {
          isGeneratingRef.current = false
        })
    }
  }, [isLoading, settings.enabled, token, regenerateToken])

  const refreshSettings = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    settings,
    token,
    publicUrl,
    isLoading,
    updateSettings,
    regenerateToken,
    refreshSettings,
  }
}
