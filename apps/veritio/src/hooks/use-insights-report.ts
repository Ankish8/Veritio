'use client'

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'
import { getAuthFetchInstance } from '@/lib/swr'
import type { InsightsReport } from '@/services/insights/chart-schema'

interface LatestReportResponse {
  report: InsightsReport | null
  staleCount: number
}

interface UseInsightsReportReturn {
  report: InsightsReport | null
  staleCount: number
  isLoading: boolean
  error: Error | undefined
  generate: (options?: { regenerate?: boolean; segmentFilters?: unknown[] }) => Promise<{ reportId: string } | null>
  mutate: () => void
}

export function useInsightsReport(studyId: string): UseInsightsReportReturn {
  const authFetch = getAuthFetchInstance()
  const mutateRef = useRef<() => void>(() => {})

  const { data, error, isLoading, mutate } = useSWR<LatestReportResponse>(
    studyId ? `/api/studies/${studyId}/insights/latest` : null,
    async (url) => {
      const response = await authFetch(url)
      if (!response.ok) throw new Error('Failed to fetch insights report')
      return response.json()
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  )

  // Keep mutate ref stable for the polling interval
  mutateRef.current = () => mutate() // eslint-disable-line react-hooks/refs

  const report = data?.report ?? null
  const staleCount = data?.staleCount ?? 0

  // Poll every 3s while report is processing
  useEffect(() => {
    if (report?.status !== 'processing') return

    const interval = setInterval(() => mutateRef.current(), 3000)
    return () => clearInterval(interval)
  }, [report?.status])

  const generate = useCallback(
    async (options?: { regenerate?: boolean; segmentFilters?: unknown[] }) => {
      const response = await authFetch(`/api/studies/${studyId}/insights/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerate: options?.regenerate ?? false,
          segmentFilters: options?.segmentFilters ?? [],
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to generate report')
      }

      const result = await response.json()
      mutate()
      return result as { reportId: string }
    },
    [authFetch, studyId, mutate],
  )

  return {
    report,
    staleCount,
    isLoading,
    error,
    generate,
    mutate: () => mutate(),
  }
}
