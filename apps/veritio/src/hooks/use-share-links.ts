'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import type { StudyShareLink } from '@/lib/supabase/collaboration-types'

export interface ShareLinkWithViews extends StudyShareLink {
  view_count: number
}

export interface CreateShareLinkInput {
  name?: string
  password?: string
  expires_at?: string
  allow_download?: boolean
  allow_comments?: boolean
}

export interface ValidateShareLinkResult {
  valid: boolean
  requires_password: boolean
  expired: boolean
  study_id?: string
  study_title?: string
  permissions?: {
    allow_download: boolean
    allow_comments: boolean
  }
}

/** Hook to fetch and manage share links for a study. */
export function useShareLinks(studyId: string | null) {
  const { data, error, isLoading, mutate: revalidate } = useSWR<ShareLinkWithViews[]>(
    studyId ? SWR_KEYS.studyShareLinks(studyId) : null
  )

  const authFetch = getAuthFetchInstance()

  const createLink = useCallback(
    async (input: CreateShareLinkInput = {}): Promise<StudyShareLink & { share_url: string }> => {
      if (!studyId) throw new Error('Study ID required')

      const response = await authFetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_id: studyId,
          ...input,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create share link')
      }

      const created = await response.json()
      await revalidate()
      return created
    },
    [authFetch, studyId, revalidate]
  )

  const revokeLink = useCallback(
    async (linkId: string): Promise<void> => {
      const response = await authFetch(`/api/share-links/${linkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke share link')
      }

      await revalidate()
    },
    [authFetch, revalidate]
  )

  // Filter active vs revoked links
  const activeLinks = data?.filter((l) => l.is_active) || []
  const revokedLinks = data?.filter((l) => !l.is_active) || []

  // Check if any links are expired
  const expiredLinks = activeLinks.filter((l) => {
    if (!l.expires_at) return false
    return new Date(l.expires_at) < new Date()
  })

  return {
    links: data || [],
    activeLinks,
    revokedLinks,
    expiredLinks,
    isLoading,
    error,
    refetch: revalidate,
    createLink,
    revokeLink,
  }
}

/** Hook to validate a share link token (public, no auth required). */
export function useValidateShareLink(token: string | null) {
  // Custom fetcher for POST-based validation
  const validateFetcher = async (url: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!response.ok) throw new Error('Failed to validate')
    return response.json()
  }

  // Initial validation without password
  const { data, error, isLoading, mutate: revalidate } = useSWR<ValidateShareLinkResult>(
    token ? SWR_KEYS.shareLink(token) : null,
    validateFetcher
  )

  // Function to validate with password
  const validate = useCallback(
    async (password?: string): Promise<ValidateShareLinkResult> => {
      if (!token) throw new Error('Token required')

      const response = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to validate share link')
      }

      const result = await response.json()
      await revalidate()
      return result
    },
    [token, revalidate]
  )

  return {
    validation: data || null,
    isLoading,
    error,
    validate,
  }
}

export function getShareUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/share/${token}`
  }
  return `${window.location.origin}/share/${token}`
}

export async function copyShareUrl(
  token: string,
  options?: { includePassword?: string }
): Promise<void> {
  let url = getShareUrl(token)

  if (options?.includePassword) {
    url += `?p=${encodeURIComponent(options.includePassword)}`
  }

  await navigator.clipboard.writeText(url)
}
