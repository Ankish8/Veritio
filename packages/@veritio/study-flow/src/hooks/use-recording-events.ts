'use client'

import useSWR from 'swr'

export type RecordingEventType = 'click' | 'scroll' | 'navigation' | 'task_start' | 'task_end' | 'frame_change' | string

export interface RecordingEvent {
  id: string
  event_type: RecordingEventType
  timestamp_ms: number
  data: Record<string, unknown> | null
  created_at: string
}

export interface UseRecordingEventsReturn {
  events: RecordingEvent[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useRecordingEvents(
  studyId: string,
  recordingId: string,
  options?: {
    eventType?: string
    startMs?: number
    endMs?: number
  }
): UseRecordingEventsReturn {
  const buildUrl = () => {
    if (!studyId || !recordingId) return null

    const params = new URLSearchParams()
    if (options?.eventType) params.set('event_type', options.eventType)
    if (options?.startMs !== undefined) params.set('start_ms', String(options.startMs))
    if (options?.endMs !== undefined) params.set('end_ms', String(options.endMs))

    const queryString = params.toString()
    return `/api/studies/${studyId}/recordings/${recordingId}/events${queryString ? `?${queryString}` : ''}`
  }

  const { data, error, isLoading, mutate } = useSWR<{ data: RecordingEvent[]; count: number }>(
    buildUrl()
  )

  return {
    events: data?.data || [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  }
}

export async function submitRecordingEvents(
  recordingId: string,
  events: Array<{
    timestamp_ms: number
    event_type: RecordingEventType
    data: Record<string, unknown>
  }>,
  sessionToken: string
): Promise<{ success: boolean; events_inserted: number }> {
  const response = await fetch(`/api/recordings/${recordingId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({ events }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to submit recording events')
  }

  return response.json()
}
