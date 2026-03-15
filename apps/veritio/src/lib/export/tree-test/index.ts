/**
 * Tree Test Export Module
 *
 * Provides CSV and Excel exports for Tree Test study results including:
 * - Raw responses with participant-level data
 * - Task summary with aggregated metrics
 * - Overall summary with study-level statistics
 * - First click analysis
 */

import type { Task, TreeNode } from '@veritio/study-types'
import type {
  TreeTestResponse,
  Participant,
  OverallMetrics,
} from '../../algorithms/tree-test-analysis'
import { calculatePathToNode } from '../../algorithms/tree-test-analysis'
import type { ExportOptions, ColumnConfig } from '../types'
import { createExportFilename } from '../utils'
import { formatCSV, downloadCSV } from '../csv/index'

// ============================================================================
// Types
// ============================================================================

export interface TreeTestExportData {
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  metrics: OverallMetrics
}

// ============================================================================
// Column Configurations
// ============================================================================

const RAW_RESPONSE_COLUMNS: ColumnConfig[] = [
  { header: 'Participant ID', key: 'participantId', type: 'string', width: 20 },
  { header: 'Status', key: 'status', type: 'string', width: 12 },
  { header: 'Task Question', key: 'task', type: 'string', width: 40 },
  { header: 'Selected Node', key: 'selectedNode', type: 'string', width: 20 },
  { header: 'Selected Node Path', key: 'selectedPath', type: 'string', width: 40 },
  { header: 'Correct Answer', key: 'correctAnswer', type: 'string', width: 20 },
  { header: 'Is Correct', key: 'isCorrect', type: 'string', width: 10 },
  { header: 'Is Direct', key: 'isDirect', type: 'string', width: 10 },
  { header: 'Path Taken', key: 'pathTaken', type: 'string', width: 50 },
  { header: 'Path Length', key: 'pathLength', type: 'number', width: 12 },
  { header: 'Time to First Click (ms)', key: 'firstClickMs', type: 'number', width: 22 },
  { header: 'Total Time (ms)', key: 'totalTimeMs', type: 'number', width: 15 },
  { header: 'Backtrack Count', key: 'backtrackCount', type: 'number', width: 15 },
]

const TASK_SUMMARY_COLUMNS: ColumnConfig[] = [
  { header: 'Task Question', key: 'question', type: 'string', width: 40 },
  { header: 'Correct Answer', key: 'correctAnswer', type: 'string', width: 25 },
  { header: 'Response Count', key: 'responseCount', type: 'number', width: 15 },
  { header: 'Success Rate (%)', key: 'successRate', type: 'percent', width: 15 },
  { header: 'Directness Rate (%)', key: 'directnessRate', type: 'percent', width: 18 },
  { header: 'Direct Success Rate (%)', key: 'directSuccessRate', type: 'percent', width: 20 },
  { header: 'First Click Success (%)', key: 'firstClickSuccess', type: 'percent', width: 20 },
  { header: 'Avg Time (seconds)', key: 'avgTime', type: 'number', width: 18 },
  { header: 'Avg Path Length', key: 'avgPathLength', type: 'number', width: 15 },
  { header: 'Avg Backtracks', key: 'avgBacktracks', type: 'number', width: 14 },
  { header: 'Top Wrong Answer 1', key: 'topWrong1', type: 'string', width: 25 },
  { header: 'Top Wrong Answer 2', key: 'topWrong2', type: 'string', width: 25 },
  { header: 'Top Wrong Answer 3', key: 'topWrong3', type: 'string', width: 25 },
]

const FIRST_CLICK_COLUMNS: ColumnConfig[] = [
  { header: 'Task Question', key: 'question', type: 'string', width: 40 },
  { header: 'First Click Node', key: 'firstClickNode', type: 'string', width: 25 },
  { header: 'Count', key: 'count', type: 'number', width: 10 },
  { header: 'Percentage (%)', key: 'percentage', type: 'percent', width: 15 },
  { header: 'On Correct Path', key: 'onCorrectPath', type: 'string', width: 15 },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build full path label from root to node
 */
function buildFullPathLabel(nodes: TreeNode[], nodeId: string | null): string {
  if (!nodeId) return ''

  const path = calculatePathToNode(nodes, nodeId)
  path.push(nodeId)

  const labels = path.map((id) => nodes.find((n) => n.id === id)?.label || 'Unknown')
  return labels.join(' > ')
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export Tree Test raw responses
 */
export async function exportTreeTestRawResponses(
  data: TreeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { tasks, nodes, responses, participants } = data

  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Filter responses if segment filter is active
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  const rows = filteredResponses.map((response) => {
    const task = taskMap.get(response.task_id)
    const selectedNode = response.selected_node_id
      ? nodeMap.get(response.selected_node_id)
      : null
    const correctNode = task?.correct_node_id
      ? nodeMap.get(task.correct_node_id)
      : null
    const participant = participantMap.get(response.participant_id)

    // Build path labels
    const pathLabels = response.path_taken
      .map((id) => nodeMap.get(id)?.label || 'Unknown')
      .join(' > ')

    return [
      response.participant_id,
      participant?.status || '',
      task?.question || '',
      selectedNode?.label || '',
      buildFullPathLabel(nodes, response.selected_node_id),
      correctNode?.label || '',
      response.is_correct ? 'Yes' : 'No',
      response.is_direct ? 'Yes' : 'No',
      pathLabels,
      response.path_taken.length,
      response.time_to_first_click_ms ?? '',
      response.total_time_ms ?? '',
      response.backtrack_count,
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
 * Export Tree Test task summary
 */
export async function exportTreeTestTaskSummary(
  data: TreeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows = metrics.taskMetrics.map((task) => {
    const avgTimeSec = task.averageTimeMs
      ? (task.averageTimeMs / 1000).toFixed(1)
      : ''

    const topWrong = task.commonWrongAnswers.slice(0, 3)

    return [
      task.question,
      task.correctNodeLabel,
      task.responseCount,
      task.successRate.toFixed(1),
      task.directnessRate.toFixed(1),
      task.directSuccessRate.toFixed(1),
      task.firstClickSuccessRate.toFixed(1),
      avgTimeSec,
      task.averagePathLength.toFixed(1),
      task.averageBacktracks.toFixed(1),
      topWrong[0]
        ? `${topWrong[0].nodeLabel} (${topWrong[0].percentage.toFixed(0)}%)`
        : '',
      topWrong[1]
        ? `${topWrong[1].nodeLabel} (${topWrong[1].percentage.toFixed(0)}%)`
        : '',
      topWrong[2]
        ? `${topWrong[2].nodeLabel} (${topWrong[2].percentage.toFixed(0)}%)`
        : '',
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
 * Export Tree Test overall summary
 */
export async function exportTreeTestOverallSummary(
  data: TreeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows = [
    ['Study', options.studyTitle],
    ['Total Participants', metrics.totalParticipants],
    ['Completed Participants', metrics.completedParticipants],
    ['Completion Rate', `${metrics.completionRate.toFixed(1)}%`],
    ['Overall Success Rate', `${metrics.overallSuccessRate.toFixed(1)}%`],
    ['Overall Directness Rate', `${metrics.overallDirectnessRate.toFixed(1)}%`],
    ['Overall Direct Success Rate', `${metrics.overallDirectSuccessRate.toFixed(1)}%`],
    ['Overall Score', `${metrics.overallScore.toFixed(1)}%`],
    [
      'Average Completion Time',
      `${(metrics.averageCompletionTimeMs / 1000).toFixed(1)} seconds`,
    ],
    ['Total Tasks', metrics.taskMetrics.length],
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

/**
 * Export Tree Test first click analysis
 */
export async function exportTreeTestFirstClickAnalysis(
  data: TreeTestExportData,
  options: ExportOptions
): Promise<void> {
  const { metrics } = data

  const rows: unknown[][] = []

  for (const task of metrics.taskMetrics) {
    for (const firstClick of task.firstClickData) {
      rows.push([
        task.question,
        firstClick.nodeLabel,
        firstClick.count,
        firstClick.percentage.toFixed(1),
        firstClick.isOnCorrectPath ? 'Yes' : 'No',
      ])
    }
  }

  const headers = FIRST_CLICK_COLUMNS.map((c) => c.header)

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

// ============================================================================
// Convenience Export
// ============================================================================

export { createExportFilename }
