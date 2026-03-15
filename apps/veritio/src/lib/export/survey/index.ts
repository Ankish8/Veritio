/**
 * Survey Export Module
 *
 * Provides CSV and Excel exports for Survey study results including:
 * - Raw responses (one row per participant, one column per question)
 * - Summary report (aggregated statistics per question)
 * - Participant data (metadata and demographics)
 * - Cross-tabulation (question × question analysis)
 */

import type { Json } from '@veritio/study-types'
import type { ExportOptions, ColumnConfig } from '../types'
import { createExportFilename } from '../utils'
import { formatCSV, downloadCSV, formatDateForCSV } from '../csv/index'

// ============================================================================
// Types
// ============================================================================

export interface SurveyQuestion {
  id: string
  question_text: string
  question_type: string
  config: Json | null
  section: string
  position: number
  is_required: boolean | null
}

export interface SurveyResponse {
  id: string
  participant_id: string
  question_id: string
  response_value: Json
  response_time_ms: number | null
  created_at: string | null
}

export interface SurveyParticipant {
  id: string
  status: string | null
  started_at: string | null
  completed_at: string | null
  identifier_type: string | null
  identifier_value: string | null
  country: string | null
  region: string | null
  city: string | null
  metadata: Json | null
  url_tags: Json | null
}

export interface SurveyExportData {
  questions: SurveyQuestion[]
  responses: SurveyResponse[]
  participants: SurveyParticipant[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a response value for export (handles arrays, objects, primitives)
 */
function formatResponseValue(value: Json | null | undefined): string {
  if (value === null || value === undefined) return ''

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join('; ')
  }

  if (typeof value === 'object') {
    // Handle special response formats
    if ('value' in value && value.value !== undefined) {
      return String(value.value)
    }
    if ('selected' in value && Array.isArray(value.selected)) {
      return (value.selected as unknown[]).map(String).join('; ')
    }
    // For matrix/grid questions
    if ('rows' in value || 'columns' in value) {
      return JSON.stringify(value)
    }
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Get a clean question label for column headers
 */
function getQuestionLabel(question: SurveyQuestion, index: number): string {
  const text = question.question_text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50) // Limit length

  return text || `Question ${index + 1}`
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export Survey raw responses (one row per participant)
 */
export async function exportSurveyRawResponses(
  data: SurveyExportData,
  options: ExportOptions
): Promise<void> {
  const { questions, responses, participants } = data
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  // Group responses by participant
  const responsesByParticipant = new Map<string, Map<string, SurveyResponse>>()
  for (const r of responses) {
    if (!responsesByParticipant.has(r.participant_id)) {
      responsesByParticipant.set(r.participant_id, new Map())
    }
    responsesByParticipant.get(r.participant_id)!.set(r.question_id, r)
  }

  // Filter by segment
  const participantIds = options.filteredParticipantIds
    ? Array.from(options.filteredParticipantIds)
    : Array.from(responsesByParticipant.keys())

  // Sort questions by section and position
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return a.position - b.position
  })

  // Build columns
  const baseColumns: ColumnConfig[] = [
    { header: 'Participant ID', key: 'participantId', type: 'string', width: 20 },
    { header: 'Status', key: 'status', type: 'string', width: 12 },
    { header: 'Started At', key: 'startedAt', type: 'date', width: 20 },
    { header: 'Completed At', key: 'completedAt', type: 'date', width: 20 },
  ]

  const questionColumns: ColumnConfig[] = sortedQuestions.map((q, idx) => ({
    header: getQuestionLabel(q, idx),
    key: q.id,
    type: 'string' as const,
    width: 'auto' as const,
  }))

  const columns = [...baseColumns, ...questionColumns]
  const headers = columns.map((c) => c.header)

  const rows = participantIds.map((participantId) => {
    const participant = participantMap.get(participantId)
    const participantResponses = responsesByParticipant.get(participantId) ?? new Map()

    const baseData = [
      participantId,
      participant?.status || '',
      formatDateForCSV(participant?.started_at),
      formatDateForCSV(participant?.completed_at),
    ]

    const questionData = sortedQuestions.map((q) => {
      const response = participantResponses.get(q.id)
      return formatResponseValue(response?.response_value)
    })

    return [...baseData, ...questionData]
  })

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Survey summary report (aggregated statistics per question)
 */
export async function exportSurveySummaryReport(
  data: SurveyExportData,
  options: ExportOptions
): Promise<void> {
  const { questions, responses } = data

  // Filter responses by segment
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  // Group responses by question
  const responsesByQuestion = new Map<string, SurveyResponse[]>()
  for (const r of filteredResponses) {
    if (!responsesByQuestion.has(r.question_id)) {
      responsesByQuestion.set(r.question_id, [])
    }
    responsesByQuestion.get(r.question_id)!.push(r)
  }

  // Sort questions
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return a.position - b.position
  })

  const columns: ColumnConfig[] = [
    { header: 'Section', key: 'section', type: 'string', width: 15 },
    { header: 'Question', key: 'question', type: 'string', width: 50 },
    { header: 'Type', key: 'type', type: 'string', width: 15 },
    { header: 'Response Count', key: 'count', type: 'number', width: 15 },
    { header: 'Required', key: 'required', type: 'string', width: 10 },
    { header: 'Completion Rate (%)', key: 'completionRate', type: 'percent', width: 18 },
    { header: 'Avg Response Time (s)', key: 'avgTime', type: 'number', width: 20 },
    { header: 'Top Response', key: 'topResponse', type: 'string', width: 30 },
  ]

  const headers = columns.map((c) => c.header)
  const totalParticipants = options.filteredParticipantIds
    ? options.filteredParticipantIds.size
    : new Set(responses.map((r) => r.participant_id)).size

  const rows = sortedQuestions.map((question) => {
    const qResponses = responsesByQuestion.get(question.id) || []
    const responseCount = qResponses.length
    const completionRate = totalParticipants > 0
      ? ((responseCount / totalParticipants) * 100).toFixed(1)
      : '0'

    // Calculate average response time
    const validTimes = qResponses
      .filter((r) => r.response_time_ms !== null)
      .map((r) => r.response_time_ms as number)
    const avgTime = validTimes.length > 0
      ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length / 1000).toFixed(1)
      : ''

    // Find top response (most common value)
    const valueCounts = new Map<string, number>()
    for (const r of qResponses) {
      const val = formatResponseValue(r.response_value)
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1)
    }

    let topResponse = ''
    let maxCount = 0
    for (const [val, count] of valueCounts) {
      if (count > maxCount) {
        maxCount = count
        topResponse = val.slice(0, 50) // Limit length
      }
    }

    return [
      question.section,
      getQuestionLabel(question, 0),
      question.question_type,
      responseCount,
      question.is_required ? 'Yes' : 'No',
      completionRate,
      avgTime,
      topResponse,
    ]
  })

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Survey participant data
 */
export async function exportSurveyParticipantData(
  data: SurveyExportData,
  options: ExportOptions
): Promise<void> {
  const { participants } = data

  // Filter by segment
  const filteredParticipants = options.filteredParticipantIds
    ? participants.filter((p) => options.filteredParticipantIds!.has(p.id))
    : participants

  const columns: ColumnConfig[] = [
    { header: 'Participant ID', key: 'id', type: 'string', width: 20 },
    { header: 'Status', key: 'status', type: 'string', width: 12 },
    { header: 'Started At', key: 'startedAt', type: 'date', width: 20 },
    { header: 'Completed At', key: 'completedAt', type: 'date', width: 20 },
    { header: 'Identifier Type', key: 'identifierType', type: 'string', width: 15 },
    { header: 'Identifier Value', key: 'identifierValue', type: 'string', width: 25 },
    { header: 'Country', key: 'country', type: 'string', width: 15 },
    { header: 'Region', key: 'region', type: 'string', width: 15 },
    { header: 'City', key: 'city', type: 'string', width: 15 },
    { header: 'URL Tags', key: 'urlTags', type: 'string', width: 30 },
  ]

  const headers = columns.map((c) => c.header)

  const rows = filteredParticipants.map((p) => [
    p.id,
    p.status || '',
    formatDateForCSV(p.started_at),
    formatDateForCSV(p.completed_at),
    p.identifier_type || '',
    p.identifier_value || '',
    p.country || '',
    p.region || '',
    p.city || '',
    p.url_tags ? JSON.stringify(p.url_tags) : '',
  ])

  if (options.format === 'csv') {
    const csv = formatCSV([headers, ...rows])
    downloadCSV(options.filename, csv)
    return
  }

  // Excel export
}

/**
 * Export Survey cross-tabulation
 * Shows response distribution for each question
 */
export async function exportSurveyCrossTabulation(
  data: SurveyExportData,
  options: ExportOptions
): Promise<void> {
  const { questions, responses } = data

  // Filter responses by segment
  const filteredResponses = options.filteredParticipantIds
    ? responses.filter((r) => options.filteredParticipantIds!.has(r.participant_id))
    : responses

  // Only include questions with enumerable responses (choice, rating, nps, etc.)
  const tabulatableTypes = ['single_choice', 'multiple_choice', 'rating', 'nps', 'likert', 'yes_no']
  const tabulatableQuestions = questions.filter((q) =>
    tabulatableTypes.includes(q.question_type)
  )

  // Group responses by question
  const responsesByQuestion = new Map<string, SurveyResponse[]>()
  for (const r of filteredResponses) {
    if (!responsesByQuestion.has(r.question_id)) {
      responsesByQuestion.set(r.question_id, [])
    }
    responsesByQuestion.get(r.question_id)!.push(r)
  }

  const columns: ColumnConfig[] = [
    { header: 'Question', key: 'question', type: 'string', width: 40 },
    { header: 'Type', key: 'type', type: 'string', width: 15 },
    { header: 'Response Value', key: 'value', type: 'string', width: 30 },
    { header: 'Count', key: 'count', type: 'number', width: 10 },
    { header: 'Percentage (%)', key: 'percentage', type: 'percent', width: 15 },
  ]

  const headers = columns.map((c) => c.header)

  const rows: unknown[][] = []

  for (const question of tabulatableQuestions) {
    const qResponses = responsesByQuestion.get(question.id) || []

    // Count response values
    const valueCounts = new Map<string, number>()
    for (const r of qResponses) {
      const val = formatResponseValue(r.response_value)
      valueCounts.set(val, (valueCounts.get(val) || 0) + 1)
    }

    const total = qResponses.length

    // Sort by count descending
    const sortedValues = Array.from(valueCounts.entries()).sort((a, b) => b[1] - a[1])

    for (const [value, count] of sortedValues) {
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
      rows.push([
        getQuestionLabel(question, 0),
        question.question_type,
        value,
        count,
        percentage,
      ])
    }
  }

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
