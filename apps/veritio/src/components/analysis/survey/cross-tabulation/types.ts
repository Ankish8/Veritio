export interface CrossTabCell {
  count: number
  rowPercent: number
  colPercent: number
  totalPercent: number
  expected: number
  residual: number
}

export interface CrossTabData {
  rowLabels: string[]
  colLabels: string[]
  cells: CrossTabCell[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
  rowQuestionId: string
  colQuestionId: string
  rowQuestionText: string
  colQuestionText: string
}

export interface ChiSquareResult {
  chiSquare: number
  degreesOfFreedom: number
  pValue: number
  isSignificant: boolean
  cramersV: number
  effectInterpretation: EffectSize
  hasLowExpectedCounts: boolean
  lowExpectedCountWarning?: string
}

export interface FisherExactResult {
  pValue: number
  isSignificant: boolean
  oddsRatio: number
}

export interface TTestResult {
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  isSignificant: boolean
  meanA: number
  meanB: number
  meanDifference: number
  stdA: number
  stdB: number
  confidenceInterval: [number, number]
}

type EffectSize = 'negligible' | 'small' | 'medium' | 'large'

export type StatisticalTestResult =
  | { type: 'chi_square'; result: ChiSquareResult }
  | { type: 'fisher_exact'; result: FisherExactResult }
  | { type: 't_test'; result: TTestResult }
  | { type: 'insufficient_data'; message: string }

export type CrossTabDataType =
  | 'categorical'
  | 'ordinal'
  | 'binary'
  | 'text'
  | 'complex'

export interface CrossTabQuestion {
  id: string
  text: string
  type: string
  section: string
  dataType: CrossTabDataType
  isCompatible: boolean
  incompatibilityReason?: string
  categoryLabels: string[]
  categoryValues: string[]
  responseCount: number
}

export interface CrossTabDisplayOptions {
  showRowPercent: boolean
  showColPercent: boolean
  showTotalPercent: boolean
  showExpected: boolean
  highlightSignificant: boolean
  colorScale: 'diverging' | 'sequential'
  minCellWidth: number
}

export const DEFAULT_DISPLAY_OPTIONS: CrossTabDisplayOptions = {
  showRowPercent: true,
  showColPercent: false,
  showTotalPercent: false,
  showExpected: false,
  highlightSignificant: true,
  colorScale: 'diverging',
  minCellWidth: 100,
}

const INCOMPATIBLE_TYPES = new Set<CrossTabDataType>(['text', 'complex'])

export const QUESTION_TYPE_TO_DATA_TYPE: Record<string, CrossTabDataType> = {
  'multiple_choice': 'categorical',
  'image_choice': 'categorical',
  'yes_no': 'binary',
  'opinion_scale': 'ordinal',
  'nps': 'ordinal',
  'slider': 'ordinal',
  'semantic_differential': 'ordinal',
  'constant_sum': 'ordinal',
  'single_line_text': 'text',
  'multi_line_text': 'text',
  'audio_response': 'text',
  'matrix': 'complex',
  'ranking': 'complex',
}

export function isQuestionTypeCompatible(questionType: string): boolean {
  const type = QUESTION_TYPE_TO_DATA_TYPE[questionType]
  return !INCOMPATIBLE_TYPES.has(type)
}

export function getResidualColorClass(residual: number): string {
  if (residual >= 2.5) return 'bg-green-300'
  if (residual >= 2) return 'bg-green-200'
  if (residual >= 1) return 'bg-green-100'
  if (residual <= -2.5) return 'bg-red-300'
  if (residual <= -2) return 'bg-red-200'
  if (residual <= -1) return 'bg-red-100'
  return ''
}

export function interpretCramersV(v: number, df: number): EffectSize {
  const k = Math.min(df + 1, 5)

  // Thresholds: [negligible, small, medium] upper bounds per Cohen's guidelines
  const thresholds: [number, number, number] =
    k <= 2 ? [0.1, 0.3, 0.5] :
    k <= 3 ? [0.07, 0.21, 0.35] :
             [0.05, 0.15, 0.25]

  if (v < thresholds[0]) return 'negligible'
  if (v < thresholds[1]) return 'small'
  if (v < thresholds[2]) return 'medium'
  return 'large'
}
