import { useMemo } from 'react'
import { castJson } from '@/lib/supabase/json-utils'
import type { StudyFlowQuestionRow, Json } from '@veritio/study-types'
import type {
  QuestionType,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
  OpinionScaleQuestionConfig,
  NPSQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  SliderQuestionConfig,
  TextQuestionConfig,
  ChoiceOption,
} from '@veritio/study-types/study-flow-types'

// Single mode: { optionId, otherText? } / Multi mode: { optionIds[], otherText? }
export interface SingleChoiceResponse {
  optionId: string
  otherText?: string
}

export interface MultiChoiceResponse {
  optionIds: string[]
  otherText?: string
}

/** New format: simple number / Legacy format: { value: number } */
export type OpinionScaleResponse = number | { value: number }

/** New format: simple number (0-10) / Legacy format: { value: number } */
export type NPSResponse = number | { value: number }

/** Stored as boolean: true = yes, false = no */
export type YesNoResponse = boolean

/** { [rowId]: columnId | columnId[] } */
export type MatrixResponse = Record<string, string | string[]>

/** Array of item IDs in ranked order */
export type RankingResponse = string[]

export type SliderResponse = number

export type TextResponse = string

export interface ChoiceOptionStats extends ChoiceOption {
  count: number
  percentage: number
}

export interface ScalePointData {
  value: number // 1-indexed display value (1, 2, 3, 4, 5)
  label: string
  count: number
  percentage: number
}

/** Get normalized choice options for multiple_choice and yes_no question types. */
export function getChoiceOptions(question: StudyFlowQuestionRow): ChoiceOption[] {
  const questionType = question.question_type as QuestionType

  if (questionType === 'yes_no') {
    const config = castJson<YesNoQuestionConfig>(question.config, { styleType: 'buttons' })
    return [
      { id: 'yes', label: config?.yesLabel || 'Yes' },
      { id: 'no', label: config?.noLabel || 'No' },
    ]
  }

  if (questionType === 'multiple_choice') {
    const config = castJson<MultipleChoiceQuestionConfig>(question.config, { options: [], mode: 'single' })
    return config?.options || []
  }

  return []
}

/** Aggregate choice question responses into option counts and percentages. */
export function aggregateChoiceResponses(
  question: StudyFlowQuestionRow,
  responses: Array<{ response_value: unknown }>
): ChoiceStatsResult {
  const questionType = question.question_type as QuestionType
  const options = getChoiceOptions(question)
  const counts = new Map<string, number>()
  const isYesNo = questionType === 'yes_no'
  const choiceConfig = castJson<MultipleChoiceQuestionConfig>(question.config, { options: [], mode: 'single' })
  const mode = isYesNo ? 'single' : (choiceConfig?.mode || 'single')

  // Initialize counts
  for (const opt of options) {
    counts.set(opt.id, 0)
  }

  // Count responses
  for (const response of responses) {
    const value = response.response_value

    if (isYesNo) {
      // Boolean response: true = yes, false = no
      const boolValue = value === true || value === 'true'
      const optionId = boolValue ? 'yes' : 'no'
      counts.set(optionId, (counts.get(optionId) || 0) + 1)
    } else if (mode === 'multi') {
      // Multi-choice
      const parsed = castJson<MultiChoiceResponse>(value as Json, { optionIds: [] })
      if (parsed?.optionIds) {
        for (const optionId of parsed.optionIds) {
          counts.set(optionId, (counts.get(optionId) || 0) + 1)
        }
      }
    } else {
      // Single-choice
      const parsed = castJson<SingleChoiceResponse>(value as Json, { optionId: '' })
      if (parsed?.optionId) {
        counts.set(parsed.optionId, (counts.get(parsed.optionId) || 0) + 1)
      }
    }
  }

  const totalResponses = responses.length
  const optionsWithStats: ChoiceOptionStats[] = options.map(opt => ({
    ...opt,
    count: counts.get(opt.id) || 0,
    percentage: totalResponses > 0
      ? Math.round(((counts.get(opt.id) || 0) / totalResponses) * 100)
      : 0,
  }))

  return {
    options: optionsWithStats,
    totalResponses,
    mode,
  }
}

/** Aggregate opinion scale responses into distribution, average, and counts. */
export function aggregateOpinionScaleResponses(
  question: StudyFlowQuestionRow,
  responses: Array<{ response_value: unknown }>
): OpinionScaleStatsResult {
  const config = castJson<OpinionScaleQuestionConfig>(question.config, {
    scalePoints: 5,
    scaleType: 'numerical',
    startAtZero: false,
  })

  const scalePoints = config?.scalePoints || 5
  const startAtZero = config?.startAtZero || false
  const counts = new Array(scalePoints).fill(0)
  let totalResponses = 0
  let sum = 0

  // Parse all responses
  for (const response of responses) {
    const rawValue = response.response_value
    let scaleValue: number | null = null

    // Handle different formats
    if (typeof rawValue === 'number') {
      // Simple number (1-indexed): convert to 0-indexed
      scaleValue = rawValue - 1
    } else if (typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue) {
      // Object format (0-indexed)
      scaleValue = (rawValue as { value: number }).value
    }

    if (scaleValue !== null && scaleValue >= 0 && scaleValue < scalePoints) {
      counts[scaleValue]++
      totalResponses++
      sum += scaleValue + 1 // 1-based for average calculation
    }
  }

  const average = totalResponses > 0 ? sum / totalResponses : 0

  // Build distribution with labels
  const distribution: ScalePointData[] = counts.map((count, index) => {
    const displayValue = startAtZero ? index : index + 1
    let label = String(displayValue)

    // Apply config labels
    if (index === 0 && config?.leftLabel) {
      label = config.leftLabel
    } else if (index === scalePoints - 1 && config?.rightLabel) {
      label = config.rightLabel
    } else if (index === Math.floor(scalePoints / 2) && config?.middleLabel) {
      label = config.middleLabel
    }

    return {
      value: displayValue,
      label,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
    }
  })

  return {
    distribution,
    totalResponses,
    average,
    scalePoints,
  }
}

export interface UseQuestionConfigResult<T = unknown> {
  config: T
  questionType: QuestionType
  getOptions: () => ChoiceOption[]
  parseResponse: (responseValue: unknown) => ParsedResponseValue
}

export type ParsedResponseValue =
  | { type: 'choice'; value: SingleChoiceResponse | MultiChoiceResponse }
  | { type: 'yes_no'; value: boolean }
  | { type: 'opinion_scale'; value: number }
  | { type: 'nps'; value: number }
  | { type: 'text'; value: string }
  | { type: 'slider'; value: number }
  | { type: 'matrix'; value: MatrixResponse }
  | { type: 'ranking'; value: RankingResponse }
  | { type: 'unknown'; value: unknown }

/** Type-safe hook for parsing question configs and responses. */
export function useQuestionConfig<T = unknown>(
  question: StudyFlowQuestionRow
): UseQuestionConfigResult<T> {
  const questionType = question.question_type as QuestionType

  // Parse config based on question type
  const config = useMemo(() => {
    switch (questionType) {
      case 'multiple_choice':
        return castJson<MultipleChoiceQuestionConfig>(question.config, {
          options: [],
          mode: 'single',
        })

      case 'yes_no':
        return castJson<YesNoQuestionConfig>(question.config, {
          styleType: 'buttons',
          yesLabel: 'Yes',
          noLabel: 'No',
        })

      case 'opinion_scale':
        return castJson<OpinionScaleQuestionConfig>(question.config, {
          scalePoints: 5,
          scaleType: 'numerical',
          startAtZero: false,
        })

      case 'nps':
        return castJson<NPSQuestionConfig>(question.config, {
          leftLabel: 'Not at all likely',
          rightLabel: 'Extremely likely',
        })

      case 'matrix':
        return castJson<MatrixQuestionConfig>(question.config, {
          rows: [],
          columns: [],
          allowMultiplePerRow: false,
        })

      case 'ranking':
        return castJson<RankingQuestionConfig>(question.config, {
          items: [],
          randomOrder: false,
        })

      case 'slider':
        return castJson<SliderQuestionConfig>(question.config, {
          minValue: 0,
          maxValue: 100,
          step: 1,
        })

      case 'single_line_text':
      case 'multi_line_text':
        return castJson<TextQuestionConfig>(question.config, {
          inputType: 'text',
        })

      default:
        return question.config as T
    }
  }, [question.config, questionType])

  // Get normalized choice options (handles both multiple_choice and yes_no)
  const getOptions = useMemo(() => {
    return (): ChoiceOption[] => {
      if (questionType === 'yes_no') {
        const yesNoConfig = config as unknown as YesNoQuestionConfig
        return [
          { id: 'yes', label: yesNoConfig?.yesLabel || 'Yes' },
          { id: 'no', label: yesNoConfig?.noLabel || 'No' },
        ]
      }

      if (questionType === 'multiple_choice') {
        const choiceConfig = config as unknown as MultipleChoiceQuestionConfig
        return choiceConfig?.options || []
      }

      return []
    }
  }, [config, questionType])

  // Parse response value to typed format
  const parseResponse = useMemo(() => {
    return (responseValue: unknown): ParsedResponseValue => {
      switch (questionType) {
        case 'yes_no':
          // Handle boolean: true = yes, false = no
          const boolValue = responseValue === true || responseValue === 'true'
          return { type: 'yes_no', value: boolValue }

        case 'opinion_scale':
        case 'nps':
          // Handle both simple number and { value: number } formats
          let numValue: number
          if (typeof responseValue === 'number') {
            numValue = responseValue
          } else if (
            typeof responseValue === 'object' &&
            responseValue !== null &&
            'value' in responseValue
          ) {
            const obj = responseValue as { value: number }
            numValue = obj.value
          } else {
            numValue = 0
          }
          return {
            type: questionType,
            value: numValue,
          }

        case 'multiple_choice':
          // Handle { optionId } or { optionIds } format
          return {
            type: 'choice',
            value: responseValue as SingleChoiceResponse | MultiChoiceResponse,
          }

        case 'single_line_text':
        case 'multi_line_text':
          return { type: 'text', value: String(responseValue || '') }

        case 'slider':
          return { type: 'slider', value: Number(responseValue || 0) }

        case 'matrix':
          return { type: 'matrix', value: responseValue as MatrixResponse }

        case 'ranking':
          return { type: 'ranking', value: responseValue as RankingResponse }

        default:
          return { type: 'unknown', value: responseValue }
      }
    }
  }, [questionType])

  return {
    config: config as T,
    questionType,
    getOptions,
    parseResponse,
  }
}

export interface UseChoiceStatsOptions {
  question: StudyFlowQuestionRow
  responses: Array<{ response_value: unknown }>
}

export interface ChoiceStatsResult {
  options: ChoiceOptionStats[]
  totalResponses: number
  mode: 'single' | 'multi' | 'dropdown'
}

/** Memoized wrapper around aggregateChoiceResponses(). */
export function useChoiceStats({
  question,
  responses,
}: UseChoiceStatsOptions): ChoiceStatsResult {
  return useMemo(
    () => aggregateChoiceResponses(question, responses),
    [question, responses]
  )
}

export interface UseOpinionScaleStatsOptions {
  question: StudyFlowQuestionRow
  responses: Array<{ response_value: unknown }>
}

export interface OpinionScaleStatsResult {
  distribution: ScalePointData[]
  totalResponses: number
  average: number
  scalePoints: number
}

/** Memoized wrapper around aggregateOpinionScaleResponses(). */
export function useOpinionScaleStats({
  question,
  responses,
}: UseOpinionScaleStatsOptions): OpinionScaleStatsResult {
  return useMemo(
    () => aggregateOpinionScaleResponses(question, responses),
    [question, responses]
  )
}
