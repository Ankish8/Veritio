'use client'

import { useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'

interface UseRecordingExportReturn {
  exportTranscript: (format: 'txt' | 'json') => Promise<Blob>
  exportClips: () => Promise<Blob>
  exportBundle: () => Promise<Blob>
}

export function useRecordingExport(
  studyId: string,
  recordingId: string
): UseRecordingExportReturn {
  const exportTranscript = useCallback(
    async (format: 'txt' | 'json'): Promise<Blob> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/export/transcript?format=${format}`,
        {
          method: 'GET',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export transcript')
      }

      return response.blob()
    },
    [studyId, recordingId]
  )

  const exportClips = useCallback(async (): Promise<Blob> => {
    const authFetch = getAuthFetchInstance()
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/export/clips`,
      {
        method: 'GET',
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to export clips')
    }

    return response.blob()
  }, [studyId, recordingId])

  const exportBundle = useCallback(async (): Promise<Blob> => {
    const authFetch = getAuthFetchInstance()
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/export/bundle`,
      {
        method: 'GET',
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to export bundle')
    }

    return response.blob()
  }, [studyId, recordingId])

  return {
    exportTranscript,
    exportClips,
    exportBundle,
  }
}
