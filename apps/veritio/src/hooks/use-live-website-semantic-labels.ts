'use client'

import useSWR from 'swr'
import { useAuthFetch } from '@/hooks'
import { useCallback } from 'react'

export interface IntentGroup {
  label: string
  event_ids: string[]
}

export interface PageLabel {
  label: string
  purpose: string
}

export interface SemanticLabelsData {
  id: string
  study_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  event_labels: Record<string, string>
  intent_groups: Record<string, IntentGroup[]>
  page_labels: Record<string, PageLabel>
  participants_analyzed: number
  error_message: string | null
  generation_time_ms: number | null
  created_at: string
  updated_at: string
}

const STALE_PROCESSING_MS = 2 * 60 * 1000 // 2 minutes

function resolveStatus(labels: SemanticLabelsData | null | undefined): SemanticLabelsData | null {
  if (!labels) return null
  // If stuck in processing for >2 min, treat as failed so UI doesn't spin forever
  if (labels.status === 'processing' && labels.updated_at) {
    const elapsed = Date.now() - new Date(labels.updated_at).getTime()
    if (elapsed > STALE_PROCESSING_MS) {
      return { ...labels, status: 'failed', error_message: 'Processing timed out' }
    }
  }
  return labels
}

export function useLiveWebsiteSemanticLabels(studyId: string | null) {
  const authFetch = useAuthFetch()

  const { data, error, isLoading, mutate } = useSWR<{ labels: SemanticLabelsData | null }>(
    studyId ? `/api/studies/${studyId}/live-website/semantic-labels` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      refreshInterval: (data) => {
        const labels = resolveStatus(data?.labels)
        if (labels?.status === 'processing') return 5000
        return 0
      },
    }
  )

  const labels = resolveStatus(data?.labels)

  const regenerate = useCallback(async (participantId?: string) => {
    if (!studyId) return
    await authFetch(`/api/studies/${studyId}/live-website/semantic-labels/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: participantId ? JSON.stringify({ participantId }) : undefined,
    })
    mutate()
  }, [studyId, authFetch, mutate])

  return {
    labels,
    isLoading,
    error: error?.message || null,
    regenerate,
    mutate,
  }
}
