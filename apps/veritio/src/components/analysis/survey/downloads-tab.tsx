'use client'

import { useMemo } from 'react'
import { DownloadsTabBase, type ExportOption } from '@/components/analysis/shared'
import {
  exportSurveyRawResponses,
  exportSurveySummaryReport,
  exportSurveyParticipantData,
  exportSurveyCrossTabulation,
  createExportFilename,
  type ExportFormat,
  type DataExportFormat,
} from '@/lib/export'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface SurveyDownloadsTabProps {
  studyId: string
  studyTitle: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  /** Optional set of participant IDs to filter exports (from segmentation) */
  filteredParticipantIds?: Set<string> | null
}

export function SurveyDownloadsTab({
  studyId: _studyId,
  studyTitle,
  flowQuestions,
  flowResponses,
  participants,
  filteredParticipantIds,
}: SurveyDownloadsTabProps) {
  const hasResponses = flowResponses.length > 0
  const hasParticipants = participants.length > 0

  // Prepare export data object
  const exportData = useMemo(() => ({
    questions: flowQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      config: q.config,
      section: q.section,
      position: q.position,
      is_required: q.is_required,
    })),
    responses: flowResponses.map(r => ({
      id: r.id,
      participant_id: r.participant_id,
      question_id: r.question_id,
      response_value: r.response_value,
      response_time_ms: r.response_time_ms,
      created_at: r.created_at,
    })),
    participants: participants.map(p => ({
      id: p.id,
      status: p.status,
      started_at: p.started_at,
      completed_at: p.completed_at,
      identifier_type: p.identifier_type,
      identifier_value: p.identifier_value,
      country: p.country,
      region: p.region,
      city: p.city,
      metadata: p.metadata,
      url_tags: p.url_tags,
    })),
  }), [flowQuestions, flowResponses, participants])

  // Helper to create a CSV export option with common boilerplate
  const csvExport = (
    id: string,
    title: string,
    description: string,
    exportFn: typeof exportSurveyRawResponses,
    filenameSuffix: string,
    disabled: boolean,
  ): ExportOption => ({
    id,
    title,
    description,
    formats: ['csv'] as ExportFormat[],
    disabled,
    onDownload: async (format: ExportFormat) => {
      const dataFormat = format as DataExportFormat
      await exportFn(exportData, {
        format: dataFormat,
        filename: createExportFilename(studyTitle, filenameSuffix, dataFormat),
        studyTitle,
        filteredParticipantIds,
      })
    },
  })

  const exportOptions: ExportOption[] = useMemo(() => [
    csvExport('raw-responses', 'Raw Responses',
      'Export all survey responses with one row per participant and one column per question.',
      exportSurveyRawResponses, 'raw_responses', !hasResponses),
    csvExport('summary-report', 'Summary Report',
      'Export aggregated statistics for each question including response counts and percentages.',
      exportSurveySummaryReport, 'summary_report', !hasResponses),
    csvExport('participant-data', 'Participant Data',
      'Export participant information including completion status, timestamps, and demographics.',
      exportSurveyParticipantData, 'participant_data', !hasParticipants),
    csvExport('cross-tab-report', 'Cross-Tabulation Report',
      'Export cross-tabulated data showing response distribution for choice-based questions.',
      exportSurveyCrossTabulation, 'cross_tabulation', !hasResponses),
    {
      id: 'questionnaire',
      title: 'Questionnaire Responses',
      description: 'Pre-study and post-study questionnaire answers from all participants.',
      formats: ['csv'] as ExportFormat[],
      comingSoon: true,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [hasResponses, hasParticipants, studyTitle, exportData, filteredParticipantIds, csvExport])

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType="survey"
        exportOptions={exportOptions}
        title="Export Survey Data"
        description="Download your survey data in various formats for further analysis in Excel, SPSS, or other tools."
      />
    </div>
  )
}
