'use client'

import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import type { Recording } from './use-recordings'

export interface TranscriptSegment {
  start: number  // milliseconds
  end: number
  text: string
  speaker?: string
  confidence?: number
}

export interface Transcript {
  id: string
  recording_id: string
  full_text: string | null
  segments: TranscriptSegment[]
  language: string | null
  model: string | null
  confidence_avg: number | null
  word_count: number | null
  status: string
  updated_at: string | null
}

export interface RecordingWithTranscript extends Recording {
  transcript: Transcript | null
  playback_url: string | null
  webcam_recording?: RecordingWithTranscript | null  // Linked webcam recording
}

export interface UseRecordingReturn {
  recording: RecordingWithTranscript | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  getPlaybackUrl: () => Promise<string>
  getWebcamPlaybackUrl: () => Promise<string | null>
  regenerateTranscript: () => Promise<void>
}

/**
 * In-memory cache for signed playback URLs.
 * URLs are signed for 1 hour, so we cache for 50 minutes to be safe.
 */
const URL_CACHE_TTL_MS = 50 * 60 * 1000
const urlCache = new Map<string, { url: string; expiresAt: number }>()

function getCachedUrl(key: string): string | null {
  const entry = urlCache.get(key)
  if (entry && Date.now() < entry.expiresAt) return entry.url
  if (entry) urlCache.delete(key)
  return null
}

function setCachedUrl(key: string, url: string): void {
  urlCache.set(key, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS })
}

/** Prefetch a playback URL into the cache so it's ready when the user clicks. */
export function prefetchPlaybackUrl(studyId: string, recordingId: string): void {
  const cacheKey = `${studyId}/${recordingId}`
  if (getCachedUrl(cacheKey)) return // Already cached

  const authFetch = getAuthFetchInstance()
  authFetch(`/api/studies/${studyId}/recordings/${recordingId}/playback`)
    .then(async (response) => {
      if (response.ok) {
        const { playback_url } = await response.json()
        setCachedUrl(cacheKey, playback_url)
      }
    })
    .catch(() => {}) // Silent — prefetch is best-effort
}

/** Hook to fetch a single recording with transcript and playback URL. */
export function useRecording(studyId: string, recordingId: string): UseRecordingReturn {
  const { data, error, isLoading, mutate } = useSWR<RecordingWithTranscript>(
    studyId && recordingId ? SWR_KEYS.recording(studyId, recordingId) : null,
    {
      // Poll every 5s while transcript is still processing so the UI updates automatically
      refreshInterval: (latestData) => {
        const status = latestData?.transcript?.status
        if (status === 'processing' || status === 'pending' || status === 'retrying') return 5000
        // Also poll if recording itself is in transcribing state (regenerate flow)
        if (latestData?.status === 'transcribing') return 5000
        return 0 // No polling once complete/failed
      },
    }
  )

  const authFetch = getAuthFetchInstance()

  const getPlaybackUrl = async (): Promise<string> => {
    const cacheKey = `${studyId}/${recordingId}`
    const cached = getCachedUrl(cacheKey)
    if (cached) return cached

    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/playback`
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to get playback URL')
    }

    const { playback_url } = await response.json()
    setCachedUrl(cacheKey, playback_url)
    return playback_url
  }

  const getWebcamPlaybackUrl = async (): Promise<string | null> => {
    if (!data?.webcam_recording?.id) return null

    const webcamId = data.webcam_recording.id
    const cacheKey = `${studyId}/${webcamId}`
    const cached = getCachedUrl(cacheKey)
    if (cached) return cached

    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${webcamId}/playback`
    )

    if (!response.ok) return null

    const { playback_url } = await response.json()
    setCachedUrl(cacheKey, playback_url)
    return playback_url
  }

  const regenerateTranscript = async (): Promise<void> => {
    const response = await authFetch(
      `/api/studies/${studyId}/recordings/${recordingId}/regenerate-transcript`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const text = await response.text()
      let message = 'Failed to regenerate transcript'
      if (text) {
        try { message = JSON.parse(text).error || message } catch { /* non-JSON response */ }
      }
      throw new Error(message)
    }

    // Revalidate to show processing status
    await mutate()
  }

  return {
    recording: data || null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    getPlaybackUrl,
    getWebcamPlaybackUrl,
    regenerateTranscript,
  }
}
