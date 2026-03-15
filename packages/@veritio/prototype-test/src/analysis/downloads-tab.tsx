'use client'

import { useMemo, useState } from 'react'
import { DownloadsTabBase, type ExportOption } from '@veritio/analysis-shared'
// PDFExportDialog removed for performance
import {
  exportPrototypeTestRawResponses,
  exportPrototypeTestTaskSummary,
  exportPrototypeTestOverallSummary,
  createExportFilename,
  type ExportFormat,
  type DataExportFormat,
} from '@veritio/prototype-test/lib/export'
import type { Participant, PrototypeTestTask, PrototypeTestTaskAttempt } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { PrototypeTestMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface PrototypeTestDownloadsTabProps {
  studyId: string
  studyTitle: string
  studyDescription?: string | null
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  metrics: PrototypeTestMetrics
  flowQuestions?: unknown[]
  flowResponses?: unknown[]
  filteredParticipantIds?: Set<string> | null
}

export function PrototypeTestDownloadsTab({
  studyId,
  studyTitle,
  studyDescription,
  tasks,
  taskAttempts,
  participants,
  metrics,
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
}: PrototypeTestDownloadsTabProps) {
  const hasResponses = taskAttempts.length > 0

  // Prepare export data object
  const exportData = useMemo(() => ({
    tasks,
    taskAttempts,
    participants,
    metrics,
  }), [tasks, taskAttempts, participants, metrics])

  const exportOptions: ExportOption[] = useMemo(() => [
    {
      id: 'raw-responses',
      title: 'Raw Responses',
      description: 'Complete participant task attempt data including outcomes, clicks, and timing.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportPrototypeTestRawResponses(exportData, {
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
      description: 'Aggregated metrics per task including success rate, directness, and click analysis.',
      formats: ['csv'] as ExportFormat[],
      disabled: !hasResponses,
      onDownload: async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportPrototypeTestTaskSummary(exportData, {
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
        await exportPrototypeTestOverallSummary(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, 'overview', dataFormat),
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
    // PDF export removed to eliminate jsPDF/ExcelJS and improve performance
  ], [hasResponses, studyTitle, exportData, filteredParticipantIds])

  return (
    <DownloadsTabBase
      studyType="prototype_test"
      exportOptions={exportOptions}
    />
  )
}
