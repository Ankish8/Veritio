'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { ExportOption } from '@veritio/analysis-shared'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import type { AiFollowupEntry } from '@/lib/ai-followup/format'
import { exportAiFollowups, flattenAiFollowups } from '@/lib/export/ai-followups'
import { createExportFilename } from '@/lib/export/utils'

interface UseAiFollowupExportOptionArgs {
  studyId: string
  studyTitle: string
  filteredParticipantIds?: Set<string> | null
}

/**
 * Downloads-tab card for AI follow-up answers. Returns null when the study has
 * no follow-ups, so tabs can append it unconditionally. Shares its SWR key
 * with AiFollowupResponsesPanel, so the data is usually already cached.
 */
export function useAiFollowupExportOption({
  studyId,
  studyTitle,
  filteredParticipantIds,
}: UseAiFollowupExportOptionArgs): ExportOption | null {
  const { data } = useSWR<{ followups: Record<string, AiFollowupEntry[]> | AiFollowupEntry[] }>(
    studyId ? `/api/studies/${studyId}/ai-followups` : null,
    (url: string) => getAuthFetchInstance()(url).then((r: Response) => r.json())
  )

  const entries = useMemo(() => flattenAiFollowups(data?.followups), [data])

  return useMemo(() => {
    if (entries.length === 0) return null
    return {
      id: 'ai-followups',
      title: 'AI Follow-up Responses',
      description: 'Every AI follow-up question asked, with the participant’s answer. One row per follow-up.',
      formats: ['csv'],
      onDownload: async () => {
        await exportAiFollowups(entries, {
          format: 'csv',
          filename: createExportFilename(studyTitle, 'ai_followups', 'csv'),
          studyTitle,
          filteredParticipantIds,
        })
      },
    }
  }, [entries, studyTitle, filteredParticipantIds])
}
