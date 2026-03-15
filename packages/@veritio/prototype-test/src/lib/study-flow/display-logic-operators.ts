/**
 * Display Logic Operators
 *
 * Defines question-type-specific operators for display logic conditions.
 * Each question type has tailored operators that make semantic sense for that data type.
 */

import type {
  StudyFlowQuestion,
  QuestionType,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
  OpinionScaleQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  ConstantSumQuestionConfig,
  SemanticDifferentialQuestionConfig,
  ImageChoiceQuestionConfig,
  TextQuestionConfig,
  ChoiceOption,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

export type ValueUIType =
  | 'none'           // No value input needed (is_answered, is_yes, etc.)
  | 'option-select'  // Single option dropdown
  | 'option-multi'   // Multi-select dropdown with checkboxes
  | 'number'         // Single number input
  | 'number-range'   // Two number inputs for "between X and Y"
  | 'text'           // Text input
  | 'date'           // Date picker input
  | 'date-range'     // Two date pickers for "between date X and Y"
  | 'row-column'     // Row dropdown + Column dropdown (for matrix)
  | 'row-column-multi' // Row dropdown + Column multi-select (for matrix)
  | 'column-only'    // Just column dropdown (for matrix any_row_equals)
  | 'item-position'  // Item dropdown + Position number (for ranking)
  | 'item-number'    // Item dropdown + Number input (for constant sum)
  | 'item-item'      // Two item dropdowns (for ranking comparison)
  | 'scale-number'   // Scale dropdown + Number input (for semantic diff)

export interface DisplayLogicOperatorDef {
  value: string
  label: string
  valueUI: ValueUIType
  needsItemSelect?: boolean
  needsSecondItem?: boolean
  needsRowSelect?: boolean
  needsColumnSelect?: boolean
  needsScaleSelect?: boolean
}

const universalOperators: DisplayLogicOperatorDef[] = [
  { value: 'is_answered', label: 'is answered', valueUI: 'none' },
  { value: 'is_not_answered', label: 'is not answered', valueUI: 'none' },
]

const singleChoiceOperators: DisplayLogicOperatorDef[] = [
  { value: 'is', label: 'is', valueUI: 'option-select' },
  { value: 'is_not', label: 'is not', valueUI: 'option-select' },
  ...universalOperators,
]

const multiChoiceOperators: DisplayLogicOperatorDef[] = [
  { value: 'includes_any', label: 'includes any of', valueUI: 'option-multi' },
  { value: 'includes_all', label: 'includes all of', valueUI: 'option-multi' },
  { value: 'includes_none', label: 'includes none of', valueUI: 'option-multi' },
  { value: 'selected_count_equals', label: 'has exactly N selected', valueUI: 'number' },
  { value: 'selected_count_gte', label: 'has at least N selected', valueUI: 'number' },
  ...universalOperators,
]

const yesNoOperators: DisplayLogicOperatorDef[] = [
  { value: 'is_yes', label: 'is Yes', valueUI: 'none' },
  { value: 'is_no', label: 'is No', valueUI: 'none' },
  ...universalOperators,
]

const numericOperators: DisplayLogicOperatorDef[] = [
  { value: 'equals', label: 'equals', valueUI: 'number' },
  { value: 'not_equals', label: 'does not equal', valueUI: 'number' },
  { value: 'greater_than', label: 'is greater than', valueUI: 'number' },
  { value: 'less_than', label: 'is less than', valueUI: 'number' },
  { value: 'between', label: 'is between', valueUI: 'number-range' },
  ...universalOperators,
]

const textOperators: DisplayLogicOperatorDef[] = [
  { value: 'contains', label: 'contains', valueUI: 'text' },
  { value: 'not_contains', label: 'does not contain', valueUI: 'text' },
  { value: 'equals', label: 'equals exactly', valueUI: 'text' },
  { value: 'is_empty', label: 'is empty', valueUI: 'none' },
  { value: 'is_not_empty', label: 'is not empty', valueUI: 'none' },
]

const numericalTextOperators: DisplayLogicOperatorDef[] = [
  { value: 'number_equals', label: 'equals', valueUI: 'number' },
  { value: 'number_not_equals', label: 'does not equal', valueUI: 'number' },
  { value: 'number_greater_than', label: 'is greater than', valueUI: 'number' },
  { value: 'number_less_than', label: 'is less than', valueUI: 'number' },
  { value: 'number_between', label: 'is between', valueUI: 'number-range' },
  { value: 'is_empty', label: 'is empty', valueUI: 'none' },
  { value: 'is_not_empty', label: 'is not empty', valueUI: 'none' },
  ...universalOperators,
]

const dateTextOperators: DisplayLogicOperatorDef[] = [
  { value: 'date_is', label: 'is on', valueUI: 'date' },
  { value: 'date_before', label: 'is before', valueUI: 'date' },
  { value: 'date_after', label: 'is after', valueUI: 'date' },
  { value: 'date_between', label: 'is between', valueUI: 'date-range' },
  { value: 'is_empty', label: 'is empty', valueUI: 'none' },
  { value: 'is_not_empty', label: 'is not empty', valueUI: 'none' },
  ...universalOperators,
]

const emailTextOperators: DisplayLogicOperatorDef[] = [
  { value: 'email_domain_is', label: 'domain is', valueUI: 'text' },
  { value: 'email_domain_contains', label: 'domain contains', valueUI: 'text' },
  { value: 'contains', label: 'contains', valueUI: 'text' },
  { value: 'equals', label: 'equals exactly', valueUI: 'text' },
  { value: 'is_empty', label: 'is empty', valueUI: 'none' },
  { value: 'is_not_empty', label: 'is not empty', valueUI: 'none' },
  ...universalOperators,
]

const matrixOperators: DisplayLogicOperatorDef[] = [
  { value: 'row_equals', label: 'row is', valueUI: 'row-column', needsRowSelect: true, needsColumnSelect: true },
  { value: 'row_includes', label: 'row includes', valueUI: 'row-column-multi', needsRowSelect: true, needsColumnSelect: true },
  { value: 'any_row_equals', label: 'any row is', valueUI: 'column-only', needsColumnSelect: true },
  ...universalOperators,
]

const rankingOperators: DisplayLogicOperatorDef[] = [
  { value: 'item_ranked_at', label: 'is ranked #', valueUI: 'item-position', needsItemSelect: true },
  { value: 'item_in_top', label: 'is in top', valueUI: 'item-number', needsItemSelect: true },
  { value: 'item_ranked_above', label: 'is ranked above', valueUI: 'item-item', needsItemSelect: true, needsSecondItem: true },
  ...universalOperators,
]

const constantSumOperators: DisplayLogicOperatorDef[] = [
  { value: 'item_equals', label: 'has', valueUI: 'item-number', needsItemSelect: true },
  { value: 'item_greater_than', label: 'has more than', valueUI: 'item-number', needsItemSelect: true },
  { value: 'item_less_than', label: 'has less than', valueUI: 'item-number', needsItemSelect: true },
  ...universalOperators,
]

const semanticDiffOperators: DisplayLogicOperatorDef[] = [
  { value: 'scale_equals', label: 'scale is', valueUI: 'scale-number', needsScaleSelect: true },
  { value: 'scale_greater_than', label: 'scale is greater than', valueUI: 'scale-number', needsScaleSelect: true },
  { value: 'scale_less_than', label: 'scale is less than', valueUI: 'scale-number', needsScaleSelect: true },
  { value: 'average_greater_than', label: 'average is greater than', valueUI: 'number' },
  { value: 'average_less_than', label: 'average is less than', valueUI: 'number' },
  ...universalOperators,
]

const audioOperators: DisplayLogicOperatorDef[] = [
  { value: 'is_answered', label: 'has recording', valueUI: 'none' },
  { value: 'is_not_answered', label: 'has no recording', valueUI: 'none' },
]

export function getOperatorsForQuestion(question: StudyFlowQuestion): DisplayLogicOperatorDef[] {
  const questionType = question.question_type

  switch (questionType) {
    case 'multiple_choice': {
      const config = question.config as MultipleChoiceQuestionConfig | undefined
      const isMulti = config?.mode === 'multi'
      return isMulti ? multiChoiceOperators : singleChoiceOperators
    }

    case 'image_choice': {
      const config = question.config as ImageChoiceQuestionConfig | undefined
      const isMulti = config?.mode === 'multi'
      return isMulti ? multiChoiceOperators : singleChoiceOperators
    }

    case 'yes_no':
      return yesNoOperators

    case 'opinion_scale':
    case 'nps':
    case 'slider':
      return numericOperators

    case 'single_line_text':
    case 'multi_line_text': {
      // Context-aware operators based on inputType
      const config = question.config as TextQuestionConfig | undefined
      const inputType = config?.inputType || 'text'

      switch (inputType) {
        case 'numerical':
          return numericalTextOperators
        case 'date':
          return dateTextOperators
        case 'email':
          return emailTextOperators
        default:
          return textOperators
      }
    }

    case 'matrix':
      return matrixOperators

    case 'ranking':
      return rankingOperators

    case 'constant_sum':
      return constantSumOperators

    case 'semantic_differential':
      return semanticDiffOperators

    case 'audio_response':
      return audioOperators

    default:
      // Unknown type - return universal operators only
      return universalOperators
  }
}

export function getDefaultOperator(question: StudyFlowQuestion): string {
  const operators = getOperatorsForQuestion(question)
  return operators[0]?.value || 'is_answered'
}

export function getQuestionOptions(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question) return []

  switch (question.question_type) {
    case 'multiple_choice': {
      const config = question.config as MultipleChoiceQuestionConfig | undefined
      return config?.options || []
    }

    case 'image_choice': {
      const config = question.config as ImageChoiceQuestionConfig | undefined
      return config?.options?.map(opt => ({
        id: opt.id,
        label: opt.label,
      })) || []
    }

    case 'yes_no': {
      const config = question.config as YesNoQuestionConfig | undefined
      return [
        { id: 'yes', label: config?.yesLabel || 'Yes' },
        { id: 'no', label: config?.noLabel || 'No' },
      ]
    }

    case 'opinion_scale': {
      const config = question.config as OpinionScaleQuestionConfig | undefined
      const scalePoints = config?.scalePoints || 5
      const startValue = config?.startAtZero ? 0 : 1
      const endValue = startValue + scalePoints - 1
      const middleValue = Math.floor((startValue + endValue) / 2)

      return Array.from({ length: scalePoints }, (_, i) => {
        const value = startValue + i
        let label = String(value)
        if (value === startValue && config?.leftLabel) label = `${value} - ${config.leftLabel}`
        else if (value === endValue && config?.rightLabel) label = `${value} - ${config.rightLabel}`
        else if (value === middleValue && config?.middleLabel) label = `${value} - ${config.middleLabel}`
        return { id: String(value), label }
      })
    }

    case 'nps': {
      return Array.from({ length: 11 }, (_, i) => ({
        id: String(i),
        label: String(i),
      }))
    }

    default:
      return []
  }
}

export function getMatrixRows(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question || question.question_type !== 'matrix') return []
  const config = question.config as MatrixQuestionConfig | undefined
  return config?.rows?.map(row => ({ id: row.id, label: row.label })) || []
}

export function getMatrixColumns(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question || question.question_type !== 'matrix') return []
  const config = question.config as MatrixQuestionConfig | undefined
  return config?.columns?.map(col => ({ id: col.id, label: col.label })) || []
}

export function getRankingItems(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question || question.question_type !== 'ranking') return []
  const config = question.config as RankingQuestionConfig | undefined
  return config?.items?.map(item => ({ id: item.id, label: item.label })) || []
}

export function getConstantSumItems(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question || question.question_type !== 'constant_sum') return []
  const config = question.config as ConstantSumQuestionConfig | undefined
  return config?.items?.map(item => ({ id: item.id, label: item.label })) || []
}

export function getSemanticScales(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question || question.question_type !== 'semantic_differential') return []
  const config = question.config as SemanticDifferentialQuestionConfig | undefined
  return config?.scales?.map(scale => ({
    id: scale.id,
    label: `${scale.leftLabel} ↔ ${scale.rightLabel}`,
  })) || []
}

export function getScaleRange(question: StudyFlowQuestion | undefined): { min: number; max: number } | null {
  if (!question) return null

  switch (question.question_type) {
    case 'opinion_scale': {
      const config = question.config as OpinionScaleQuestionConfig | undefined
      const scalePoints = config?.scalePoints || 5
      const startValue = config?.startAtZero ? 0 : 1
      return { min: startValue, max: startValue + scalePoints - 1 }
    }

    case 'nps':
      return { min: 0, max: 10 }

    case 'slider': {
      const config = question.config as { minValue?: number; maxValue?: number } | undefined
      return { min: config?.minValue || 0, max: config?.maxValue || 100 }
    }

    case 'semantic_differential': {
      const config = question.config as SemanticDifferentialQuestionConfig | undefined
      const scalePoints = config?.scalePoints || 7
      const halfRange = Math.floor(scalePoints / 2)
      return { min: -halfRange, max: halfRange }
    }

    default:
      return null
  }
}

export function getMaxRankPosition(question: StudyFlowQuestion | undefined): number {
  if (!question || question.question_type !== 'ranking') return 1
  const config = question.config as RankingQuestionConfig | undefined
  return config?.items?.length || 1
}

export function getTotalPoints(question: StudyFlowQuestion | undefined): number {
  if (!question || question.question_type !== 'constant_sum') return 100
  const config = question.config as ConstantSumQuestionConfig | undefined
  return config?.totalPoints || 100
}
