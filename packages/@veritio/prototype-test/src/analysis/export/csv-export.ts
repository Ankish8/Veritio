
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import type { AdvancedTaskMetrics } from '@veritio/prototype-test/algorithms/advanced-metrics'
import type { CSVExportData } from './export-types'
import { triggerDownload, escapeCsvValue, formatTime, sanitizeFilename } from './export-utils'

export function exportToCSV(data: CSVExportData, filename: string): void {
  const csvContent = [
    data.headers.map(escapeCsvValue).join(','),
    ...data.rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${filename}.csv`)
  URL.revokeObjectURL(url)
}

export function exportTaskMetricsToCSV(
  metrics: PrototypeTaskMetrics,
  studyTitle: string,
  advancedMetrics?: AdvancedTaskMetrics
): void {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedTask = sanitizeFilename(metrics.taskTitle)
  const filename = `task-results-${sanitizedTask}-${timestamp}`

  const rows: (string | number)[][] = [
    ['Study', studyTitle],
    ['Task', metrics.taskTitle],
    ['Task Instruction', metrics.taskInstruction || ''],
    [],
    ['Metric', 'Value', 'Additional Info'],
    [],
    ['Responses', metrics.responseCount],
    [],
    ['-- Outcomes --'],
    ['Success Count', metrics.successCount, `${metrics.successRate.toFixed(1)}%`],
    ['Failure Count', metrics.failureCount, `${metrics.failureRate.toFixed(1)}%`],
    ['Skipped Count', metrics.skippedCount, `${metrics.skippedRate.toFixed(1)}%`],
    [],
    ['-- Success Breakdown --'],
    ['Direct Success', metrics.statusBreakdown?.success.direct || 0],
    ['Indirect Success', metrics.statusBreakdown?.success.indirect || 0],
    [],
    ['-- Key Metrics --'],
    ['Success Rate', `${metrics.successRate.toFixed(1)}%`, `95% CI: ${metrics.successCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.successCI?.upperBound?.toFixed(1) || 0}%`],
    ['Directness Rate', `${metrics.directRate.toFixed(1)}%`, `95% CI: ${metrics.directnessCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.directnessCI?.upperBound?.toFixed(1) || 0}%`],
    ['Average Time', formatTime(metrics.averageTimeMs), `${metrics.averageTimeMs.toFixed(0)}ms`],
    ['Misclick Rate', `${metrics.misclickRate.toFixed(1)}%`],
    ['Task Score', `${metrics.taskScore.toFixed(1)}/10`, '(Success × 3 + Directness) / 4'],
    [],
    ['-- Click Statistics --'],
    ['Average Clicks', metrics.averageClickCount.toFixed(1)],
    ['Average Misclicks', metrics.averageMisclickCount.toFixed(1)],
    ['Average Backtracks', metrics.averageBacktrackCount.toFixed(1)],
    [],
    ['-- Time Distribution --'],
    ['Min', formatTime(metrics.timeBoxPlot?.min || 0)],
    ['Q1 (25th percentile)', formatTime(metrics.timeBoxPlot?.q1 || 0)],
    ['Median', formatTime(metrics.timeBoxPlot?.median || 0)],
    ['Q3 (75th percentile)', formatTime(metrics.timeBoxPlot?.q3 || 0)],
    ['Max', formatTime(metrics.timeBoxPlot?.max || 0)],
    ['Outliers', metrics.timeBoxPlot?.outliers?.length || 0],
  ]

  if (advancedMetrics) {
    rows.push(
      [],
      ['-- Advanced Metrics --'],
      ['Lostness Score', advancedMetrics.lostness.score.toFixed(3), advancedMetrics.lostness.interpretation],
      ['Path Efficiency', `${advancedMetrics.pathEfficiency.score.toFixed(1)}%`],
      ['Confusion Points', advancedMetrics.dwellTime.confusionPoints.length],
    )

    if (advancedMetrics.dwellTime.confusionPoints.length > 0) {
      rows.push([], ['-- Confusion Points --'])
      advancedMetrics.dwellTime.confusionPoints.forEach((cp, i) => {
        rows.push([`${i + 1}. ${cp.frameName}`, `${cp.dwellTimeMs.toFixed(0)}ms avg`, `${cp.ratio.toFixed(1)}x threshold`])
      })
    }
  }

  exportToCSV({
    headers: [],
    rows: rows as (string | number | boolean | null | undefined)[][],
  }, filename)
}

export function exportAllTasksToCSV(
  taskMetrics: PrototypeTaskMetrics[],
  studyTitle: string
): void {
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedStudy = sanitizeFilename(studyTitle)
  const filename = `all-tasks-${sanitizedStudy}-${timestamp}`

  const headers = [
    'Task',
    'Responses',
    'Success Rate (%)',
    'Directness Rate (%)',
    'Avg Time (ms)',
    'Avg Clicks',
    'Avg Misclicks',
    'Avg Backtracks',
    'Task Score',
  ]

  const rows = taskMetrics.map(m => [
    m.taskTitle,
    m.responseCount,
    m.successRate.toFixed(1),
    m.directRate.toFixed(1),
    m.averageTimeMs.toFixed(0),
    m.averageClickCount.toFixed(1),
    m.averageMisclickCount.toFixed(1),
    m.averageBacktrackCount.toFixed(1),
    m.taskScore.toFixed(1),
  ])

  exportToCSV({ headers, rows }, filename)
}
