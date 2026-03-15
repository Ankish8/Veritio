'use client'

import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'

/** Status values that indicate processing in progress - will trigger auto-refresh */
const PROCESSING_STATUSES = ['uploading', 'processing', 'transcribing']

export interface Recording {
  id: string
  participant_id: string
  scope: 'session' | 'task'
  task_attempt_id: string | null
  capture_mode: 'audio' | 'screen_audio' | 'screen_audio_webcam'
  duration_ms: number | null
  file_size_bytes: number | null
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  has_transcript: boolean
  transcript_status: string | null
  transcript_word_count: number | null
}

export interface UseRecordingsReturn {
  recordings: Recording[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  deleteRecording: (recordingId: string, permanent?: boolean) => Promise<void>
}

/** Hook to fetch all recordings for a study with SWR caching and auto-polling for processing states. */
export function useRecordings(studyId: string): UseRecordingsReturn {
  const { data, error, isLoading, mutate } = useSWR<{ data: Recording[]; count: number }>(
    studyId ? SWR_KEYS.studyRecordings(studyId) : null,
    {
      // Poll every 5 seconds when any recordings are in a processing state
      refreshInterval: (latestData) => {
        const hasProcessing = latestData?.data?.some(r => PROCESSING_STATUSES.includes(r.status))
        return hasProcessing ? 5000 : 0 // 0 = no polling
      },
      revalidateOnFocus: true,
    }
  )

  const authFetch = getAuthFetchInstance()

  const deleteRecording = async (recordingId: string, permanent = false) => {
    const url = `/api/studies/${studyId}/recordings/${recordingId}${permanent ? '?permanent=true' : ''}`
    const response = await authFetch(url, { method: 'DELETE' })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete recording')
    }

    await mutate(
      current => {
        if (!current) return current
        return {
          ...current,
          data: current.data.filter(r => r.id !== recordingId),
          count: current.count - 1,
        }
      },
      { revalidate: true }
    )
  }

  return {
    recordings: data?.data || [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    deleteRecording,
  }
}
