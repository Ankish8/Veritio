import type { CorrelationResult } from '@/lib/algorithms/correlation-statistics'

export type { CorrelationResult }

export type DataType = 'continuous' | 'ordinal' | 'binary' | 'categorical' | 'unsupported'

export interface QuestionCorrelationInfo {
  id: string
  text: string
  shortText: string
  type: string
  dataType: DataType
  section: string
  options?: string[]
}

export interface CorrelationPair {
  question1Id: string
  question2Id: string
  result: CorrelationResult
}

export interface CorrelationMatrixData {
  questions: QuestionCorrelationInfo[]
  pairs: Map<string, CorrelationPair>
}

export interface DriverResult {
  questionId: string
  questionText: string
  shortText: string
  correlation: CorrelationResult
  rank: number
}

export interface DriverAnalysisData {
  targetQuestion: QuestionCorrelationInfo
  drivers: DriverResult[]
}

export interface CorrelationDisplayOptions {
  showCoefficients: boolean
  showSignificanceOnly: boolean
  minSampleSize: number
}

export const DEFAULT_DISPLAY_OPTIONS: CorrelationDisplayOptions = {
  showCoefficients: true,
  showSignificanceOnly: false,
  minSampleSize: 10,
}

/** Order-independent key for symmetric matrix lookup */
export function getPairKey(q1Id: string, q2Id: string): string {
  return q1Id < q2Id ? `${q1Id}:${q2Id}` : `${q2Id}:${q1Id}`
}

export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}
