'use client'

/**
 * First Impression Downloads Tab
 *
 * CSV export options for first impression test results.
 */

import { DownloadsTabBase, type ExportOption } from '@veritio/analysis-shared'
import type { FirstImpressionResultsResponse } from '@/services/results/first-impression'
import { downloadCSV, formatCSV, createCSVFilename } from '@/lib/export/csv'

interface FirstImpressionDownloadsProps {
  studyId: string
  data: FirstImpressionResultsResponse
}

// Helper to convert object array to CSV string
function objectsToCSV<T extends object>(rows: T[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const data = rows.map(row => headers.map(h => (row as Record<string, unknown>)[h]))
  return formatCSV([headers, ...data])
}

export function FirstImpressionDownloads({ studyId: _studyId, data }: FirstImpressionDownloadsProps) {
  const _hasResponses = (data.participants?.length ?? 0) > 0
  // Export raw exposure data
  const exportRawExposures = async () => {
    const rows = data.exposures.map((exposure: any) => {
      const design = data.designs.find((d: any) => d.id === exposure.design_id)
      const participantIndex = data.participants.findIndex((p: any) => p.id === exposure.participant_id)

      return {
        participant_id: `P${participantIndex + 1}`,
        design_name: design?.name || `Design ${(design?.position || 0) + 1}`,
        design_id: exposure.design_id,
        exposure_sequence: exposure.exposure_sequence,
        configured_duration_ms: exposure.configured_duration_ms,
        actual_display_ms: exposure.actual_display_ms || '',
        exposure_started_at: exposure.exposure_started_at,
        exposure_ended_at: exposure.exposure_ended_at || '',
        viewport_width: exposure.viewport_width || '',
        viewport_height: exposure.viewport_height || '',
      }
    })

    const content = objectsToCSV(rows)
    const filename = createCSVFilename(data.study.title, 'exposures')
    downloadCSV(filename, content)
  }

  // Export question responses
  const exportResponses = async () => {
    const rows = data.responses.map((response: any) => {
      const design = data.designs.find((d: any) => d.id === response.design_id)
      const participantIndex = data.participants.findIndex((p: any) => p.id === response.participant_id)

      // Find question from design
      const question = design?.questions?.find((q: any) => q.id === response.question_id)

      // Format response value
      let responseValue = ''
      if (typeof response.response_value === 'string') {
        responseValue = response.response_value
      } else if (Array.isArray(response.response_value)) {
        responseValue = response.response_value.join('; ')
      } else if (response.response_value?.value !== undefined) {
        responseValue = String(response.response_value.value)
      } else {
        responseValue = JSON.stringify(response.response_value)
      }

      return {
        participant_id: `P${participantIndex + 1}`,
        design_name: design?.name || `Design ${(design?.position || 0) + 1}`,
        question_id: response.question_id,
        question_prompt: question?.prompt || '',
        question_type: question?.type || '',
        response_value: responseValue,
        response_time_ms: response.response_time_ms || '',
        submitted_at: response.submitted_at || '',
      }
    })

    const content = objectsToCSV(rows)
    const filename = createCSVFilename(data.study.title, 'responses')
    downloadCSV(filename, content)
  }

  // Export design summary
  const exportDesignSummary = async () => {
    const rows = data.metrics.designMetrics.map((design) => ({
      design_name: design.designName,
      design_id: design.designId,
      is_practice: design.isPractice ? 'Yes' : 'No',
      exposure_count: design.exposureCount,
      exposure_percentage: design.exposurePercentage.toFixed(1),
      avg_exposure_duration_ms: design.avgExposureDurationMs.toFixed(0),
      avg_question_time_ms: design.avgQuestionTimeMs.toFixed(0),
      total_questions: design.questionMetrics.length,
      total_responses: design.questionMetrics.reduce((sum, q) => sum + q.responseCount, 0),
    }))

    const content = objectsToCSV(rows)
    const filename = createCSVFilename(data.study.title, 'design-summary')
    downloadCSV(filename, content)
  }

  // Export participant summary
  const exportParticipantSummary = async () => {
    const rows = data.participants.map((p: any, index: number) => {
      const session = data.sessions.find((s: any) => s.participant_id === p.id)
      const participantExposures = data.exposures.filter((e: any) => e.participant_id === p.id)
      const participantResponses = data.responses.filter((r: any) => r.participant_id === p.id)

      // Get design name if assigned
      let designName = ''
      if (session?.assigned_design_id) {
        const design = data.designs.find((d: any) => d.id === session.assigned_design_id)
        designName = design?.name || `Design ${(design?.position || 0) + 1}`
      }

      return {
        participant_id: `P${index + 1}`,
        status: p.status,
        started_at: p.started_at,
        completed_at: p.completed_at || '',
        total_time_ms: session?.total_time_ms || '',
        design_assigned: designName,
        designs_viewed: participantExposures.length,
        questions_answered: participantResponses.length,
        device_type: session?.device_type || '',
        country: p.country || '',
        region: p.region || '',
      }
    })

    const content = objectsToCSV(rows)
    const filename = createCSVFilename(data.study.title, 'participants')
    downloadCSV(filename, content)
  }

  const exportOptions: ExportOption[] = [
    {
      id: 'raw-exposures',
      title: 'Raw exposure data',
      description: 'Individual exposure events with timing and viewport information',
      formats: ['csv'],
      onDownload: exportRawExposures,
    },
    {
      id: 'responses',
      title: 'Question responses',
      description: 'All question responses with design and participant information',
      formats: ['csv'],
      onDownload: exportResponses,
    },
    {
      id: 'design-summary',
      title: 'Design summary',
      description: 'Aggregated metrics per design including exposure rates and question stats',
      formats: ['csv'],
      onDownload: exportDesignSummary,
    },
    {
      id: 'participant-summary',
      title: 'Participant summary',
      description: 'Per-participant session details and response counts',
      formats: ['csv'],
      onDownload: exportParticipantSummary,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType="first_impression"
        exportOptions={exportOptions}
        title="Export First Impression Test Data"
        description="Download your first impression test results in various formats"
      />
    </div>
  )
}
