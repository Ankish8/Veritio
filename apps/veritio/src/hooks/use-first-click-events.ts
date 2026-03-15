'use client'

import useSWR from 'swr'
import type { FirstClickEventData, FirstClickStats } from '@/types/analytics'

interface FirstClickAOIData {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

interface FirstClickTask {
  id: string
  instruction: string | null
  position: number
  image: {
    id: string
    image_url: string | null
    width: number | null
    height: number | null
  } | null
  aois: FirstClickAOIData[]
}

interface FirstClickEventsResponse {
  clicks: FirstClickEventData[]
  tasks: FirstClickTask[]
  stats: FirstClickStats
  taskInfo: {
    taskId: string
    instruction: string | null
    imageUrl: string | null
    imageWidth: number
    imageHeight: number
  } | null
}

interface FirstClickEventsFilters {
  taskId?: string
  participantId?: string
}

function buildFirstClickEventsUrl(studyId: string, filters: FirstClickEventsFilters): string {
  const params = new URLSearchParams()

  if (filters.taskId) params.set('taskId', filters.taskId)
  if (filters.participantId) params.set('participantId', filters.participantId)

  const queryString = params.toString()
  return `/api/studies/${studyId}/first-click-events${queryString ? `?${queryString}` : ''}`
}

export function useFirstClickEvents(
  studyId: string | null,
  filters: FirstClickEventsFilters = {}
) {
  const url = studyId ? buildFirstClickEventsUrl(studyId, filters) : null

  const { data, error, isLoading, mutate } = useSWR<FirstClickEventsResponse>(url)

  return {
    clicks: data?.clicks ?? [],
    tasks: data?.tasks ?? [],
    stats: data?.stats ?? null,
    taskInfo: data?.taskInfo ?? null,
    isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  }
}

export function calculateFirstClickStats(clicks: FirstClickEventData[]): FirstClickStats {
  const validClicks = clicks.filter(c => !c.isSkipped)
  const correctClicks = validClicks.filter(c => c.wasCorrect)
  const uniqueParticipants = new Set(validClicks.map(c => c.participantId)).size

  // Calculate time metrics
  const times = validClicks
    .map(c => c.timeToClickMs)
    .filter((t): t is number => t !== null && t > 0)
    .sort((a, b) => a - b)

  const avgTimeMs = times.length > 0
    ? times.reduce((sum, t) => sum + t, 0) / times.length
    : null

  const medianTimeMs = times.length > 0
    ? times[Math.floor(times.length / 2)]
    : null

  return {
    totalClicks: validClicks.length,
    successRate: validClicks.length > 0
      ? (correctClicks.length / validClicks.length) * 100
      : 0,
    uniqueParticipants,
    avgTimeMs,
    medianTimeMs,
    hits: correctClicks.length,
    misses: validClicks.length - correctClicks.length,
    skipped: clicks.filter(c => c.isSkipped).length,
  }
}
