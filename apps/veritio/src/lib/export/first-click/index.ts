/**
 * First-Click Test Export Functions
 */

import type { FirstClickResultsResponse } from '../../../services/results/first-click'
import { downloadCSV, formatCSV, createCSVFilename } from '../csv/index'

interface ResponseRow {
  participant_id: string
  task_id: string
  click_x: number
  click_y: number
  time_to_click_ms: number | null
  is_correct: boolean
  matched_aoi_id: string
  is_skipped: boolean
  viewport_width: number | null
  viewport_height: number | null
  created_at: string
}

function objectsToCSV<T extends object>(rows: T[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const data = rows.map(row => headers.map(h => (row as Record<string, unknown>)[h]))
  return formatCSV([headers, ...data])
}

export async function exportFirstClickRawResponses(
  data: FirstClickResultsResponse,
) {
  const rows: ResponseRow[] = data.responses.map((r: any) => ({
    participant_id: r.participant_id,
    task_id: r.task_id,
    click_x: r.click_x,
    click_y: r.click_y,
    time_to_click_ms: r.time_to_click_ms,
    is_correct: r.is_correct,
    matched_aoi_id: r.matched_aoi_id || '',
    is_skipped: r.is_skipped,
    viewport_width: r.viewport_width,
    viewport_height: r.viewport_height,
    created_at: r.created_at,
  }))

  const content = objectsToCSV(rows)
  const filename = createCSVFilename(data.study.title, 'raw-responses')
  downloadCSV(filename, content)
}

export async function exportFirstClickTaskSummary(
  data: FirstClickResultsResponse,
) {
  const rows = data.metrics.taskMetrics.map((task, idx) => ({
    task_number: idx + 1,
    instruction: task.instruction,
    response_count: task.responseCount,
    success_rate: task.successRate.toFixed(2),
    skip_rate: task.skipRate.toFixed(2),
    avg_time_ms: Math.round(task.avgTimeToClickMs),
    median_time_ms: Math.round(task.medianTimeToClickMs),
  }))

  const content = objectsToCSV(rows)
  const filename = createCSVFilename(data.study.title, 'task-summary')
  downloadCSV(filename, content)
}

export async function exportFirstClickParticipantSummary(
  data: FirstClickResultsResponse,
) {
  interface ParticipantStats {
    participant_id: string
    tasks_completed: number
    tasks_skipped: number
    tasks_correct: number
    total_time_ms: number
  }

  const participantMap = data.responses.reduce((acc: Record<string, ParticipantStats>, r: any) => {
    if (!acc[r.participant_id]) {
      acc[r.participant_id] = {
        participant_id: r.participant_id,
        tasks_completed: 0,
        tasks_skipped: 0,
        tasks_correct: 0,
        total_time_ms: 0,
      }
    }
    if (r.is_skipped) {
      acc[r.participant_id].tasks_skipped++
    } else {
      acc[r.participant_id].tasks_completed++
      if (r.is_correct) acc[r.participant_id].tasks_correct++
      acc[r.participant_id].total_time_ms += r.time_to_click_ms || 0
    }
    return acc
  }, {})

  const rows = Object.values(participantMap)
  const content = objectsToCSV(rows)
  const filename = createCSVFilename(data.study.title, 'participant-summary')
  downloadCSV(filename, content)
}
