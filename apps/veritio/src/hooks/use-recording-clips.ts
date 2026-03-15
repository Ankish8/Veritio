'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import type { Clip } from '@/components/analysis/recordings/clips-tab'

interface UseRecordingClipsReturn {
  clips: Clip[]
  isLoading: boolean
  error: Error | null
  mutate: () => void
  createClip: (data: {
    startMs: number
    endMs: number
    title: string
    description?: string
    thumbnailUrl?: string
  }) => Promise<Clip>
  updateClip: (id: string, data: { title: string; description?: string }) => Promise<Clip>
  trimClip: (id: string, startMs: number, endMs: number) => Promise<Clip>
  deleteClip: (id: string) => Promise<void>
}

export function useRecordingClips(
  studyId: string,
  recordingId: string
): UseRecordingClipsReturn {
  const { data, error, isLoading, mutate } = useSWR<{ data: Clip[] }>(
    studyId && recordingId
      ? `/api/studies/${studyId}/recordings/${recordingId}/clips`
      : null
  )

  const createClip = useCallback(
    async (clipData: {
      startMs: number
      endMs: number
      title: string
      description?: string
      thumbnailUrl?: string
    }): Promise<Clip> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/clips`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_ms: clipData.startMs,
            end_ms: clipData.endMs,
            title: clipData.title,
            description: clipData.description,
            thumbnail_url: clipData.thumbnailUrl,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create clip')
      }

      const result = await response.json()
      mutate()
      return result.data
    },
    [studyId, recordingId, mutate]
  )

  const updateClip = useCallback(
    async (id: string, clipData: { title: string; description?: string }): Promise<Clip> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/clips/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clipData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update clip')
      }

      const result = await response.json()
      mutate()
      return result.data
    },
    [studyId, recordingId, mutate]
  )

  const trimClip = useCallback(
    async (id: string, startMs: number, endMs: number): Promise<Clip> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/clips/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_ms: startMs,
            end_ms: endMs,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to trim clip')
      }

      const result = await response.json()
      mutate()
      return result.data
    },
    [studyId, recordingId, mutate]
  )

  const deleteClip = useCallback(
    async (id: string): Promise<void> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/clips/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete clip')
      }

      mutate()
    },
    [studyId, recordingId, mutate]
  )

  return {
    clips: data?.data || [],
    isLoading,
    error: error || null,
    mutate,
    createClip,
    updateClip,
    trimClip,
    deleteClip,
  }
}
