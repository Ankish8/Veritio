/**
 * Prototype Test Export Module
 *
 * Provides CSV and Excel exports for Prototype Test study results including:
 * - Raw responses with participant-level task attempts
 * - Task summary with aggregated metrics
 * - Overall summary with study-level statistics
 */

import type {
  Participant,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/study-types'
import type { PrototypeTestMetrics } from '../../algorithms/prototype-test-analysis'
import type { ExportOptions, ColumnConfig } from '../types'
import { createExportFilename } from '../utils'
import { formatCSV, downloadCSV } from '../csv/index'

// ============================================================================
// Types
// ============================================================================

export interface PrototypeTestExportData {
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  metrics: PrototypeTestMetrics
}

// ============================================================================
// Column Configurations
// ============================================================================

const RAW_RESPONSE_COLUMNS: ColumnConfig[] = [
  { header: 'Participant ID', key: 'participantId', type: 'string', width: 20 },
  { header: 'Status', key: 'status', type: 'string', width: 12 },
  { header: 'Task Title', key: 'taskTitle', type: 'string', width: 30 },
  { header: 'Outcome', key: 'outcome', type: 'string', width: 12 },
  { header: 'Time (ms)', key: 'totalTimeMs', type: 'number', width: 12 },
  { header: 'Time to First Click (ms)', key: 'firstClickMs', type: 'number', width: 20 },
  { header: 'Click Count', key: 'clickCount', type: 'number', width: 12 },
  { header: 'Misclick Count', key: 'misclickCount', type: 'number', width: 14 },
  { header: 'Backtrack Count', key: 'backtrackCount', type: 'number', width: 14 },
  { header: 'Is Direct', key: 'isDirect', type: 'string', width: 10 },
]

const TASK_SUMMARY_COLUMNS: ColumnConfig[] = [
  { header: 'Task Title', key: 'taskTitle', type: 'string', width: 30 },
  { header: 'Response Count', key: 'responseCount', type: 'number', width: 15 },
  { header: 'Success Rate (%)', key: 'successRate', type: 'percent', width: 15 },
  { header: 'Failure Rate (%)', key: 'failureRate', type: 'percent', width: 15 },
  { header: 'Abandoned Rate (%)', key: 'abandonedRate', type: 'percent', width: 16 },
  { header: 'Skipped Rate (%)', key: 'skippedRate', type: 'percent', width: 15 },
  { header: 'Direct Rate (%)', key: 'directRate', type: 'percent', width: 14 },
  { header: 'Avg Time (seconds)', key: 'avgTime', type: 'number', width: 18 },
  { header: 'Avg Clicks', key: 'avgClicks', type: 'number', width: 12 },
  { header: 'Avg Misclicks', key: 'avgMisclicks', type: 'number', width: 14 },
  { header: 'Avg Backtracks', key: 'avgBacktracks', type: 'number', width: 14 },
  { header: 'Misclick Rate (%)', key: 'misclickRate', type: 'percent', width: 16 },
]

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export Prototype Test raw responses
 */
export async function exportPrototypeTestRawResponses(
  data: PrototypeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { tasks, taskAttempts, participants } = data

  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Filter responses if segment filter is active
  const filteredAttempts = options.filteredParticipantIds
    ? taskAttempts.filter((a) => options.filteredParticipantIds!.has(a.participant_id))
    : taskAttempts

  const rows = filteredAttempts.map((attempt) => {
    const task = taskMap.get(attempt.task_id)
    const participant = participantMap.get(attempt.participant_id)

    return [
      attempt.participant_id,
      participant?.status || '',
      task?.title || '',
      attempt.outcome,
      attempt.total_time_ms ?? '',
      attempt.time_to_first_click_ms ?? '',
      attempt.click_count ?? 0,
      attempt.misclick_count ?? 0,
      attempt.backtrack_count ?? 0,
      attempt.is_direct ? 'Yes' : 'No',
    ]
  })

  const headers = RAW_RESPONSE_COLUMNS.map((c) => c.header)

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Prototype Test task summary
 */
export async function exportPrototypeTestTaskSummary(
  data: PrototypeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows = metrics.taskMetrics.map((task) => {
    const avgTimeSec = task.averageTimeMs
      ? (task.averageTimeMs / 1000).toFixed(1)
      : ''

    return [
      task.taskTitle,
      task.responseCount,
      task.successRate.toFixed(1),
      task.failureRate.toFixed(1),
      task.abandonedRate.toFixed(1),
      task.skippedRate.toFixed(1),
      task.directRate.toFixed(1),
      avgTimeSec,
      task.averageClickCount.toFixed(1),
      task.averageMisclickCount.toFixed(1),
      task.averageBacktrackCount.toFixed(1),
      task.misclickRate.toFixed(1),
    ]
  })

  const headers = TASK_SUMMARY_COLUMNS.map((c) => c.header)

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Prototype Test overall summary
 */
export async function exportPrototypeTestOverallSummary(
  data: PrototypeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows = [
    ['Study', options.studyTitle],
    ['Total Participants', metrics.totalParticipants],
    ['Completed Participants', metrics.completedParticipants],
    ['Abandoned Participants', metrics.abandonedParticipants],
    ['Completion Rate', `${metrics.completionRate.toFixed(1)}%`],
    ['Total Tasks', metrics.totalTasks],
    ['Overall Success Rate', `${metrics.overallSuccessRate.toFixed(1)}%`],
    ['Overall Direct Rate', `${metrics.overallDirectRate.toFixed(1)}%`],
    ['Overall Direct Success Rate', `${metrics.overallDirectSuccessRate.toFixed(1)}%`],
    ['Average Click Count', metrics.averageClickCount.toFixed(1)],
    ['Average Misclick Count', metrics.averageMisclickCount.toFixed(1)],
    ['Average Misclick Rate', `${metrics.averageMisclickRate.toFixed(1)}%`],
    [
      'Average Completion Time',
      `${(metrics.averageCompletionTimeMs / 1000).toFixed(1)} seconds`,
    ],
  ]

  const _columns: ColumnConfig[] = [
    { header: 'Metric', key: 'metric', type: 'string', width: 25 },
    { header: 'Value', key: 'value', type: 'string', width: 25 },
  ]

  if (options.format === 'csv') {
    const csv = formatCSV([['Metric', 'Value'], ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

// ============================================================================
// Convenience Export
// ============================================================================

export { createExportFilename }
