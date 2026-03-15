'use client'

/**
 * First-Click Downloads Tab
 *
 * CSV export options for first-click test results.
 */

import { DownloadsTabBase, type ExportOption } from '@veritio/analysis-shared'
import { exportFirstClickRawResponses, exportFirstClickTaskSummary, exportFirstClickParticipantSummary } from '@/lib/export/first-click'
import type { FirstClickResultsResponse } from '@/services/results/first-click'

interface FirstClickDownloadsProps {
  studyId: string
  data: FirstClickResultsResponse
}

export function FirstClickDownloads({ studyId: _studyId, data }: FirstClickDownloadsProps) {
  const _hasResponses = (data.participants?.length ?? 0) > 0

  const exportOptions: ExportOption[] = [
    {
      id: 'raw-responses',
      title: 'Raw click data',
      description: 'Individual click data with coordinates, timing, and success status for each participant',
      formats: ['csv'],
      onDownload: () => exportFirstClickRawResponses(data),
    },
    {
      id: 'task-summary',
      title: 'Task summary',
      description: 'Aggregated metrics per task including success rates and timing statistics',
      formats: ['csv'],
      onDownload: () => exportFirstClickTaskSummary(data),
    },
    {
      id: 'participant-summary',
      title: 'Participant summary',
      description: 'Per-participant completion rates and success metrics',
      formats: ['csv'],
      onDownload: () => exportFirstClickParticipantSummary(data),
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType="first_click"
        exportOptions={exportOptions}
        title="Export First-Click Test Data"
        description="Download your first-click test results in various formats"
      />
    </div>
  )
}
