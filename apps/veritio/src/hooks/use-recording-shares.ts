'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import type { Share } from '@/components/analysis/recordings/share-dialog'

interface UseRecordingSharesReturn {
  shares: Share[]
  isLoading: boolean
  error: Error | null
  mutate: () => void
  createShare: (data: {
    accessLevel: 'view' | 'comment'
    password?: string
    expiresInDays?: number
  }) => Promise<{ shareCode: string }>
  revokeShare: (id: string) => Promise<void>
}

export function useRecordingShares(
  studyId: string,
  recordingId: string
): UseRecordingSharesReturn {
  const { data, error, isLoading, mutate } = useSWR<{ shares: Share[] }>(
    studyId && recordingId
      ? `/api/studies/${studyId}/recordings/${recordingId}/shares`
      : null
  )

  const createShare = useCallback(
    async (shareData: {
      accessLevel: 'view' | 'comment'
      password?: string
      expiresInDays?: number
    }): Promise<{ shareCode: string }> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/shares`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_level: shareData.accessLevel,
            password: shareData.password,
            expires_in_days: shareData.expiresInDays,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create share')
      }

      const result = await response.json()
      mutate()
      return { shareCode: result.data.share_code }
    },
    [studyId, recordingId, mutate]
  )

  const revokeShare = useCallback(
    async (id: string): Promise<void> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/shares/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to revoke share')
      }

      mutate()
    },
    [studyId, recordingId, mutate]
  )

  return {
    shares: data?.shares || [],
    isLoading,
    error: error || null,
    mutate,
    createShare,
    revokeShare,
  }
}
