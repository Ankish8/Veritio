'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  /** Why the shareable link could not be generated (null while pending or on success) */
  tokenError: string | null
  /** Returns the existing token, minting one only when the study has none */
  ensureToken: () => Promise<string | null>
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

/**
 * Studies whose token this session already tried to auto-generate.
 *
 * Module scope on purpose: the results header and the Report tab each mount
 * this hook, and two instances racing the same POST would mint two tokens —
 * the link one of them just handed the user would already be dead. They share
 * the SWR cache, so the loser still sees the winner's token.
 */
const autoGenerationAttempted = new Set<string>()

/** In-flight token requests per study, so concurrent callers share one POST. */
const tokenGenerationInFlight = new Map<string, Promise<{ token: string; url: string } | null>>()

/** Hook for managing public results sharing settings. */
export function usePublicResultsSettings(studyId: string | null): UsePublicResultsSettingsReturn {
  const authFetch = getAuthFetchInstance()
  // Keyed by study so a failure never leaks into another study's panel
  const [tokenError, setTokenError] = useState<{ studyId: string; message: string } | null>(null)

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
      const serverError = await response
        .json()
        .then((body: { error?: string }) => body?.error)
        .catch(() => undefined)
      throw new Error(
        response.status === 403
          ? serverError || 'You do not have permission to share this study'
          : serverError || 'Failed to generate the shareable link',
      )
    }

    const result = await response.json()
    setTokenError(null)

    mutate(
      (prev) =>
        prev
          ? { ...prev, publicResultsToken: result.token }
          : { publicResultsToken: result.token, publicResultsSettings: DEFAULT_SETTINGS, sharingSettings: {} },
      false
    )

    return result as { token: string; url: string }
  }, [studyId, authFetch, mutate])

  /**
   * Returns the study's token, minting one only if it has none. Concurrent
   * callers (auto-generation effect, the header's share button) join the same
   * request instead of each minting a token that invalidates the others.
   */
  const ensureToken = useCallback(async () => {
    if (!studyId) return null
    if (token) return token

    const inFlight = tokenGenerationInFlight.get(studyId)
    if (inFlight) return (await inFlight)?.token ?? null

    autoGenerationAttempted.add(studyId)
    const request = regenerateToken().finally(() => {
      tokenGenerationInFlight.delete(studyId)
    })
    tokenGenerationInFlight.set(studyId, request)
    return (await request)?.token ?? null
  }, [studyId, token, regenerateToken])

  const isGeneratingRef = useRef(false)
  // One auto-attempt per study. Without this the effect retries forever on a
  // permanent failure (403, 500), and the UI sits on "Generating..." with no
  // way out — the error has to reach the user instead.
  useEffect(() => {
    if (!studyId || isLoading || !settings.enabled || token) return
    if (isGeneratingRef.current || autoGenerationAttempted.has(studyId)) return

    isGeneratingRef.current = true
    // setTokenError below runs in a rejection callback, not synchronously in
    // the effect body, so it cannot cascade renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ensureToken()
      .catch((error: unknown) => {
        setTokenError({
          studyId,
          message: error instanceof Error ? error.message : 'Failed to generate link',
        })
      })
      .finally(() => {
        isGeneratingRef.current = false
      })
  }, [isLoading, settings.enabled, token, studyId, ensureToken])

  const refreshSettings = useCallback(async () => {
    await mutate()
  }, [mutate])

  return {
    settings,
    token,
    publicUrl,
    isLoading,
    tokenError: tokenError && tokenError.studyId === studyId ? tokenError.message : null,
    ensureToken,
    updateSettings,
    regenerateToken,
    refreshSettings,
  }
}
