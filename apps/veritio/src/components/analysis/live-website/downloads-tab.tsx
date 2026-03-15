'use client'

import { useMemo } from 'react'
import { DownloadsTabBase, type ExportOption } from '@/components/analysis/shared'
import {
  exportLiveWebsiteRawResponses,
  exportLiveWebsiteTaskSummary,
  exportLiveWebsiteBehavioralEvents,
  exportLiveWebsiteOverallSummary,
} from '@/lib/export/live-website'
import { createExportFilename } from '@/lib/export'
import type { ExportFormat, DataExportFormat } from '@/lib/export'
import type { Participant } from '@veritio/study-types'
import type { LiveWebsiteMetrics } from '@/services/results/live-website-overview'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

interface LiveWebsiteDownloadsTabProps {
  studyId: string
  studyTitle: string
  studyDescription?: string | null
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  events: LiveWebsiteEvent[]
  participants: Participant[]
  metrics: LiveWebsiteMetrics
  trackingMode: string
}

export function LiveWebsiteDownloadsTab({
  studyId: _studyId,
  studyTitle,
  tasks,
  responses,
  events,
  participants,
  metrics,
  trackingMode,
}: LiveWebsiteDownloadsTabProps) {
  const hasResponses = responses.length > 0
  const hasEvents = events.length > 0
  const showBehavioralEvents = trackingMode !== 'url_only'

  const exportData = useMemo(() => ({
    tasks,
    responses,
    events,
    participants,
    metrics,
  }), [tasks, responses, events, participants, metrics])

  const exportOptions: ExportOption[] = useMemo(() => {
    const makeDownload = (exportFn: typeof exportLiveWebsiteRawResponses, suffix: string) => {
      return async (format: ExportFormat) => {
        const dataFormat = format as DataExportFormat
        await exportFn(exportData, {
          format: dataFormat,
          filename: createExportFilename(studyTitle, suffix, dataFormat),
          studyTitle,
        })
      }
    }

    const options: ExportOption[] = [
      {
        id: 'raw-responses',
        title: 'Raw Responses',
        description: 'Task response data including participant, task, status, and timing for each response.',
        formats: ['csv'] as ExportFormat[],
        disabled: !hasResponses,
        onDownload: makeDownload(exportLiveWebsiteRawResponses, 'raw_responses'),
      },
      {
        id: 'task-summary',
        title: 'Task Summary',
        description: 'Aggregated per-task metrics including success rate, completion counts, and average time.',
        formats: ['csv'] as ExportFormat[],
        disabled: !hasResponses,
        onDownload: makeDownload(exportLiveWebsiteTaskSummary, 'task_summary'),
      },
      ...(showBehavioralEvents ? [{
        id: 'behavioral-events',
        title: 'Behavioral Events',
        description: 'Full event log with timestamps, coordinates, page URLs, and element selectors.',
        formats: ['csv'] as ExportFormat[],
        disabled: !hasEvents,
        onDownload: makeDownload(exportLiveWebsiteBehavioralEvents, 'behavioral_events'),
      }] : []),
      {
        id: 'overall-summary',
        title: 'Overall Summary',
        description: 'Study-level metrics including participation, success rate, usability score, and timing.',
        formats: ['csv'] as ExportFormat[],
        disabled: !hasResponses,
        onDownload: makeDownload(exportLiveWebsiteOverallSummary, 'overview'),
      },
    ]

    return options
  }, [hasResponses, hasEvents, showBehavioralEvents, studyTitle, exportData])

  return (
    <div className="space-y-4 sm:space-y-6">
      <DownloadsTabBase
        studyType={'live_website_test' as any}
        exportOptions={exportOptions}
        description="Download your live website test data in various formats for further analysis."
      />
    </div>
  )
}
