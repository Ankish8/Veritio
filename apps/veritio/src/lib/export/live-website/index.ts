import type { Participant } from '@veritio/study-types'
import type { LiveWebsiteMetrics, LiveWebsiteTaskMetrics } from '@/services/results/live-website-overview'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { ExportOptions } from '../types'
import { formatCSV, downloadCSV, formatDateForCSV } from '../csv/index'

// ============================================================================
// Types
// ============================================================================

export interface LiveWebsiteExportData {
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  events: LiveWebsiteEvent[]
  participants: Participant[]
  metrics: LiveWebsiteMetrics
}

// ============================================================================
// Raw Responses Export
// ============================================================================

export async function exportLiveWebsiteRawResponses(
  data: LiveWebsiteExportData,
  options: ExportOptions
): Promise<void> {
  const { tasks, responses, participants } = data
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const _participantMap = new Map(participants.map(p => [p.id, p]))

  const filteredResponses = options.filteredParticipantIds
    ? responses.filter(r => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  const headers = [
    'Participant ID',
    'Task ID',
    'Task Title',
    'Status',
    'Started At',
    'Completed At',
    'Duration (seconds)',
  ]

  const rows = filteredResponses.map(r => {
    const task = taskMap.get(r.task_id)
    return [
      r.participant_id,
      r.task_id,
      task?.title || '',
      r.status,
      formatDateForCSV(r.started_at),
      formatDateForCSV(r.completed_at),
      r.duration_ms != null ? (r.duration_ms / 1000).toFixed(1) : '',
    ]
  })

  const csv = formatCSV([headers, ...rows])
  downloadCSV(options.filename, csv)
}

// ============================================================================
// Task Summary Export
// ============================================================================

export async function exportLiveWebsiteTaskSummary(
  data: LiveWebsiteExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const headers = [
    'Task Title',
    'Total Responses',
    'Completed',
    'Abandoned',
    'Timed Out',
    'Skipped',
    'Success Rate (%)',
    'Avg Time (seconds)',
  ]

  const rows = metrics.taskMetrics.map((tm: LiveWebsiteTaskMetrics) => [
    tm.taskTitle,
    tm.totalResponses,
    tm.completedCount,
    tm.abandonedCount,
    tm.timedOutCount,
    tm.skippedCount,
    (tm.successRate * 100).toFixed(1),
    tm.avgTimeMs > 0 ? (tm.avgTimeMs / 1000).toFixed(1) : '',
  ])

  const csv = formatCSV([headers, ...rows])
  downloadCSV(options.filename, csv)
}

// ============================================================================
// Behavioral Events Export
// ============================================================================

export async function exportLiveWebsiteBehavioralEvents(
  data: LiveWebsiteExportData,
  options: ExportOptions
): Promise<void> {
  const { events, tasks } = data
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  const filteredEvents = options.filteredParticipantIds
    ? events.filter(e => e.participant_id && options.filteredParticipantIds!.has(e.participant_id))
    : events

  const headers = [
    'Timestamp',
    'Participant ID',
    'Task ID',
    'Task Title',
    'Event Type',
    'Page URL',
    'Element Selector',
    'Coordinate X',
    'Coordinate Y',
    'Viewport Width',
    'Viewport Height',
  ]

  const rows = filteredEvents.map(e => {
    const task = e.task_id ? taskMap.get(e.task_id) : null
    return [
      formatDateForCSV(e.timestamp),
      e.participant_id || '',
      e.task_id || '',
      task?.title || '',
      e.event_type,
      e.page_url || '',
      e.element_selector || '',
      e.coordinates?.x ?? '',
      e.coordinates?.y ?? '',
      e.viewport_size?.width ?? '',
      e.viewport_size?.height ?? '',
    ]
  })

  const csv = formatCSV([headers, ...rows])
  downloadCSV(options.filename, csv)
}

// ============================================================================
// Overall Summary Export
// ============================================================================

export async function exportLiveWebsiteOverallSummary(
  data: LiveWebsiteExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows = [
    ['Study', options.studyTitle],
    ['Total Participants', metrics.totalParticipants],
    ['Completed Participants', metrics.completedParticipants],
    ['Completion Rate', `${metrics.totalParticipants > 0 ? ((metrics.completedParticipants / metrics.totalParticipants) * 100).toFixed(1) : 0}%`],
    ['Overall Success Rate', `${(metrics.overallSuccessRate * 100).toFixed(1)}%`],
    ['Overall Abandon Rate', `${(metrics.overallAbandonRate * 100).toFixed(1)}%`],
    ['Average Completion Time', `${(metrics.averageCompletionTimeMs / 1000).toFixed(1)} seconds`],
    ['Average Time Per Task', `${(metrics.avgTimePerTask / 1000).toFixed(1)} seconds`],
    ['Average Pages Per Task', metrics.avgPagesPerTask.toFixed(1)],
    ['Usability Score', `${metrics.usabilityScore}/100`],
    ['Total Events', metrics.totalEvents],
    ['Total Rage Clicks', metrics.totalRageClicks],
  ]

  const csv = formatCSV([['Metric', 'Value'], ...rows])
  downloadCSV(options.filename, csv)
}
