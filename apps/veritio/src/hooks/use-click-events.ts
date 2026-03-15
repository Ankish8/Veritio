'use client'

import useSWR from 'swr'
import type {
  ClickEventsResponse,
  ClickEventFilters,
  FrameSortOption,
  FrameWithStats,
} from '@/types/analytics'

function buildClickEventsUrl(studyId: string, filters: ClickEventFilters): string {
  const params = new URLSearchParams()

  if (filters.taskId) params.set('taskId', filters.taskId)
  if (filters.frameId) params.set('frameId', filters.frameId)
  if (filters.participantId) params.set('participantId', filters.participantId)
  if (filters.pageVisit && filters.pageVisit !== 'all') params.set('pageVisit', filters.pageVisit)

  const queryString = params.toString()
  return `/api/studies/${studyId}/click-events${queryString ? `?${queryString}` : ''}`
}

/** Hook to fetch click events for prototype test analysis. */
export function useClickEvents(studyId: string | null, filters: ClickEventFilters = {}) {
  const url = studyId ? buildClickEventsUrl(studyId, filters) : null

  const { data, error, isLoading, mutate } = useSWR<ClickEventsResponse>(url)

  return {
    clicks: data?.clicks || [],
    frames: data?.frames || [],
    taskInfo: data?.taskInfo || null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
  }
}

export function useFrameClickEvents(
  studyId: string | null,
  frameId: string | null,
  filters: Omit<ClickEventFilters, 'frameId'> = {}
) {
  return useClickEvents(studyId, frameId ? { ...filters, frameId } : filters)
}

export function sortFrames(
  frames: FrameWithStats[],
  sortBy: FrameSortOption
): FrameWithStats[] {
  const sorted = [...frames]

  switch (sortBy) {
    case 'visits':
      return sorted.sort((a, b) => b.pageVisits - a.pageVisits)
    case 'time':
      return sorted.sort((a, b) => b.avgTimeMs - a.avgTimeMs)
    case 'misclicks':
      return sorted.sort((a, b) => b.misclickCount - a.misclickCount)
    default:
      return sorted
  }
}

export function filterClicksByFrame(
  clicks: ClickEventsResponse['clicks'],
  frameId: string
) {
  return clicks.filter(click => click.frameId === frameId)
}

export function calculateClickStats(clicks: ClickEventsResponse['clicks']) {
  const totalClicks = clicks.length
  const hits = clicks.filter(c => c.wasHotspot).length
  const misses = totalClicks - hits
  const hitRate = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 0

  const uniqueParticipants = new Set(clicks.map(c => c.participantId)).size

  const timesMs = clicks
    .map(c => c.timeSinceFrameLoadMs)
    .filter((t): t is number => t !== undefined && t !== null && t > 0)

  let avgTimeMs: number | null = null
  let medianTimeMs: number | null = null

  if (timesMs.length > 0) {
    // Average
    avgTimeMs = timesMs.reduce((sum, t) => sum + t, 0) / timesMs.length

    // Median
    const sorted = [...timesMs].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    medianTimeMs = sorted.length % 2 !== 0
      ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2
  }

  return {
    totalClicks,
    hits,
    misses,
    hitRate,
    uniqueParticipants,
    avgTimeMs,
    medianTimeMs,
  }
}
