import type { StudyFlowResponseRow } from '@veritio/study-types'
import type { QuestionCorrelationInfo } from '../types'

export interface ExtractedData {
  participantId: string
  value: number
}

export interface PairedData {
  x: number[]
  y: number[]
  n: number
  participantIds: string[]
}

export function extractQuestionData(
  questionId: string,
  questionInfo: QuestionCorrelationInfo,
  responses: StudyFlowResponseRow[],
  filteredParticipantIds: Set<string> | null
): ExtractedData[] {
  const results: ExtractedData[] = []

  for (const r of responses) {
    if (r.question_id !== questionId) continue
    if (filteredParticipantIds !== null && !filteredParticipantIds.has(r.participant_id)) continue

    const value = extractNumericValue(r.response_value, questionInfo)
    if (value !== null) {
      results.push({ participantId: r.participant_id, value })
    }
  }

  return results
}

export function extractNumericValue(
  response: unknown,
  questionInfo: QuestionCorrelationInfo
): number | null {
  if (response === null || response === undefined) return null

  const { type, options } = questionInfo

  switch (type) {
    case 'nps':
    case 'opinion_scale':
    case 'linear_scale':
    case 'rating':
    case 'slider':
      return parseNumericResponse(response)

    case 'yes_no':
      return parseBinaryResponse(response)

    case 'multiple_choice':
    case 'image_choice':
    case 'dropdown':
      return parseCategoricalResponse(response, options)

    case 'checkboxes':
      return parseCheckboxResponse(response)

    // Average score across all scales
    case 'semantic_differential':
      return averageObjectValues(response)

    // Coefficient of variation of point allocations
    case 'constant_sum':
      return coefficientOfVariation(response)

    default:
      return null
  }
}

function parseNumericResponse(response: unknown): number | null {
  if (typeof response === 'number') {
    return isNaN(response) ? null : response
  }

  if (typeof response === 'string') {
    const parsed = parseFloat(response)
    return isNaN(parsed) ? null : parsed
  }

  if (typeof response === 'object' && response !== null && 'value' in response) {
    return parseNumericResponse((response as { value: unknown }).value)
  }

  return null
}

function parseBinaryResponse(response: unknown): number | null {
  if (typeof response === 'boolean') return response ? 1 : 0

  if (typeof response === 'string') {
    const lower = response.toLowerCase()
    if (lower === 'yes' || lower === 'true' || lower === '1') return 1
    if (lower === 'no' || lower === 'false' || lower === '0') return 0
  }

  if (typeof response === 'number') {
    return response === 1 ? 1 : response === 0 ? 0 : null
  }

  return null
}

function parseCategoricalResponse(
  response: unknown,
  options: string[] | undefined
): number | null {
  if (!options || options.length === 0) {
    return typeof response === 'number' ? response : null
  }

  let responseValue: string

  if (typeof response === 'string') {
    responseValue = response
  } else if (typeof response === 'object' && response !== null) {
    const obj = response as { optionId?: string; value?: string; label?: string }
    responseValue = obj.optionId || obj.value || obj.label || ''
  } else {
    return null
  }

  const index = options.findIndex(
    opt => opt.toLowerCase() === responseValue.toLowerCase()
  )
  return index >= 0 ? index : null
}

function parseCheckboxResponse(response: unknown): number | null {
  if (Array.isArray(response)) return response.length

  if (typeof response === 'string') {
    return response.split(',').filter(Boolean).length
  }

  if (typeof response === 'object' && response !== null) {
    const obj = response as { optionIds?: string[] }
    if (Array.isArray(obj.optionIds)) return obj.optionIds.length
  }

  return null
}

/** Extract numeric values from an object's properties */
function extractObjectNumbers(response: unknown): number[] | null {
  if (!response || typeof response !== 'object') return null
  const values = Object.values(response as Record<string, unknown>)
    .filter((v): v is number => typeof v === 'number')
  return values.length > 0 ? values : null
}

/** Average of numeric values in an object (for semantic differential) */
function averageObjectValues(response: unknown): number | null {
  const values = extractObjectNumbers(response)
  if (!values) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Coefficient of variation of numeric values in an object (for constant sum) */
function coefficientOfVariation(response: unknown): number | null {
  const values = extractObjectNumbers(response)
  if (!values) return null

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return (Math.sqrt(variance) / mean) * 100
}

export function getPairedData(
  data1: ExtractedData[],
  data2: ExtractedData[]
): PairedData {
  const map2 = new Map(data2.map(d => [d.participantId, d.value]))

  const x: number[] = []
  const y: number[] = []
  const participantIds: string[] = []

  for (const d of data1) {
    const value2 = map2.get(d.participantId)
    if (value2 !== undefined) {
      x.push(d.value)
      y.push(value2)
      participantIds.push(d.participantId)
    }
  }

  return { x, y, n: x.length, participantIds }
}

export function isBinaryData(data: number[]): boolean {
  return data.every(v => v === 0 || v === 1)
}
