'use client'

import { useMemo } from 'react'
import { DownloadsTabBase, type ExportOption } from '@/components/analysis/shared'
import {
  exportTreeTestRawResponses,
  exportTreeTestTaskSummary,
  exportTreeTestOverallSummary,
  exportTreeTestFirstClickAnalysis,
  createExportFilename,
  type ExportFormat,
  type DataExportFormat,
} from '@/lib/export'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse, OverallMetrics, Participant } from '@/lib/algorithms/tree-test-analysis'

interface TreeTestDownloadsTabProps {
  studyId: string
  studyTitle: string
  studyDescription?: string | null
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  metrics: OverallMetrics
  /** Flow questions for PDF export */
  flowQuestions?: unknown[]
  /** Flow responses for PDF export */
  flowResponses?: unknown[]
  /** Optional set of participant IDs to filter exports (from segmentation) */
  filteredParticipantIds?: Set<string> | null
}

/**
 * Downloads Tab for Tree Test - Export options for study data.
 * Supports CSV and PDF formats.
 */
export function TreeTestDownloadsTab({
  studyId: _studyId,
  studyTitle,
  tasks,
  nodes,
  responses,
  participants,
  metrics,
  filteredParticipantIds,
}: TreeTestDownloadsTabProps) {
  const hasResponses = responses.length > 0

  // Prepare export data object
  const exportData = useMemo(() => ({
    tasks,
    nodes,
    responses,
    participants,
    metrics,
  }), [tasks, nodes, responses, participants, metrics])

  const exportOptions: ExportOption[] = useMemo(() => [
    {
      id: 'raw-responses',
      title: 'Raw Responses',
      description: 'Complete participant response data including paths taken, selected nodes, and timing.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportTreeTestRawResponses(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, 'raw_responses', dataFormat),
          studyTitle,
          filteredParticipantIds,
        })
      },
    },
    {
      id: 'task-summary',
      title: 'Task Summary',
      description: 'Aggregated metrics per task including success rate, directness, and average time.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportTreeTestTaskSummary(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, 'task_summary', dataFormat),
          studyTitle,
          filteredParticipantIds,
        })
      },
    },
    {
      id: 'overall-summary',
      title: 'Overall Summary',
      description: 'Study-level metrics including overall success, directness, and completion rates.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportTreeTestOverallSummary(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, 'overview', dataFormat),
          studyTitle,
          filteredParticipantIds,
        })
      },
    },
    {
      id: 'first-click',
      title: 'First Click Analysis',
      description: 'Analysis of first clicks per task to understand initial navigation patterns.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportTreeTestFirstClickAnalysis(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, 'first_click', dataFormat),
          studyTitle,
          filteredParticipantIds,
        })
      },
    },
    {
      id: 'questionnaire',
      title: 'Questionnaire Responses',
      description: 'Pre-study and post-study questionnaire answers from all participants.',
      formats: ['csv'] as ExportFormat[],
      comingSoon: true,
    },
  ], [hasResponses, studyTitle, exportData, filteredParticipantIds])

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType="tree_test"
        exportOptions={exportOptions}
      />
    </div>
  )
}
