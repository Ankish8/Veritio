/**
 * Response Extraction Utilities
 *
 * Functions for extracting and categorizing survey response values
 * for cross-tabulation analysis.
 */

import type { StudyFlowQuestionRow } from '@veritio/study-types'
import type {
  MultipleChoiceQuestionConfig,
  OpinionScaleQuestionConfig,
  ImageChoiceQuestionConfig,
  SliderQuestionConfig,
  SemanticDifferentialQuestionConfig,
  ConstantSumQuestionConfig,
} from '@veritio/study-types/study-flow-types'
import { castJson } from '@/lib/supabase/json-utils'

// =============================================================================
// Response Value Types
// =============================================================================

interface SingleChoiceValue {
  optionId: string
  otherText?: string
}

interface MultiChoiceValue {
  optionIds: string[]
  otherText?: string
}

interface ScaleValue {
  value: number
}

// =============================================================================
// Shared Helpers
// =============================================================================

const SLIDER_BUCKET_COUNT = 5

function getSliderBuckets(question: StudyFlowQuestionRow): string[] {
  const config = castJson<SliderQuestionConfig>(question.config, { minValue: 0, maxValue: 100, step: 1, displayMode: 'inputs' } as any)
  const minValue = config?.minValue || 0
  const maxValue = config?.maxValue || 100
  const rangeSize = (maxValue - minValue) / SLIDER_BUCKET_COUNT

  const buckets: string[] = []
  for (let i = 0; i < SLIDER_BUCKET_COUNT; i++) {
    const bucketMin = Math.round(minValue + i * rangeSize)
    const bucketMax = Math.round(minValue + (i + 1) * rangeSize)
    buckets.push(`${bucketMin}-${bucketMax}`)
  }
  return buckets
}

function extractNumericValue(responseValue: unknown): number | null {
  const val = responseValue as ScaleValue
  if (typeof val?.value === 'number') return val.value
  if (typeof responseValue === 'number') return responseValue
  return null
}

function getChoiceConfig(question: StudyFlowQuestionRow) {
  if (question.question_type === 'multiple_choice') {
    return castJson<MultipleChoiceQuestionConfig>(question.config, { options: [], mode: 'single' })
  }
  return castJson<ImageChoiceQuestionConfig>(question.config, { options: [], mode: 'single', gridColumns: 3, showLabels: true })
}

const NPS_CATEGORIES = ['Detractor (0-6)', 'Passive (7-8)', 'Promoter (9-10)'] as const
const SENTIMENT_CATEGORIES = ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'] as const

function classifyNpsScore(score: number): string {
  if (score <= 6) return NPS_CATEGORIES[0]
  if (score <= 8) return NPS_CATEGORIES[1]
  return NPS_CATEGORIES[2]
}

// =============================================================================
// Response Value Extraction
// =============================================================================

/**
 * Extract category values from a response based on question type
 * Returns an array because multi-select can have multiple values
 */
export function extractResponseValues(
  responseValue: unknown,
  question: StudyFlowQuestionRow
): string[] {
  try {
    switch (question.question_type) {
      case 'multiple_choice':
      case 'image_choice': {
        const config = getChoiceConfig(question)
        const mode = config?.mode || 'single'

        if (mode === 'multi') {
          const val = responseValue as MultiChoiceValue
          if (val?.optionIds && Array.isArray(val.optionIds)) return val.optionIds
        } else {
          const val = responseValue as SingleChoiceValue
          if (val?.optionId) return [val.optionId]
          if (typeof responseValue === 'string') return [responseValue]
        }
        break
      }

      case 'yes_no': {
        if (typeof responseValue === 'boolean') return [responseValue ? 'yes' : 'no']
        const val = responseValue as { value?: boolean }
        if (typeof val?.value === 'boolean') return [val.value ? 'yes' : 'no']
        break
      }

      case 'opinion_scale': {
        const numValue = extractNumericValue(responseValue)
        if (numValue !== null) return [String(numValue)]
        break
      }

      case 'slider': {
        const numValue = extractNumericValue(responseValue)
        if (numValue !== null) {
          const buckets = getSliderBuckets(question)
          const config = castJson<SliderQuestionConfig>(question.config, { minValue: 0, maxValue: 100, step: 1, displayMode: 'inputs' } as any)
          const minValue = config?.minValue || 0
          const maxValue = config?.maxValue || 100
          const rangeSize = (maxValue - minValue) / SLIDER_BUCKET_COUNT

          for (let i = 0; i < SLIDER_BUCKET_COUNT; i++) {
            const bucketMin = Math.round(minValue + i * rangeSize)
            const bucketMax = Math.round(minValue + (i + 1) * rangeSize)
            if (numValue >= bucketMin && numValue <= bucketMax) return [buckets[i]]
          }
        }
        break
      }

      case 'nps': {
        const score = extractNumericValue(responseValue)
        if (score !== null) return [classifyNpsScore(score)]
        break
      }

      case 'semantic_differential': {
        const val = responseValue as Record<string, number>
        if (val && typeof val === 'object') {
          const semConfig = castJson<SemanticDifferentialQuestionConfig>(question.config, { scalePoints: 7, scales: [] })
          const scalePoints = semConfig?.scalePoints || 7
          const maxValue = Math.floor(scalePoints / 2)

          const values = Object.values(val).filter(v => typeof v === 'number') as number[]
          if (values.length > 0) {
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length
            const rangeSize = maxValue / 2
            if (avg <= -rangeSize * 1.5) return [SENTIMENT_CATEGORIES[0]]
            if (avg <= -rangeSize * 0.5) return [SENTIMENT_CATEGORIES[1]]
            if (avg <= rangeSize * 0.5) return [SENTIMENT_CATEGORIES[2]]
            if (avg <= rangeSize * 1.5) return [SENTIMENT_CATEGORIES[3]]
            return [SENTIMENT_CATEGORIES[4]]
          }
        }
        break
      }

      case 'constant_sum': {
        const val = responseValue as Record<string, number>
        if (val && typeof val === 'object') {
          let maxItemId = ''
          let maxPoints = -1
          for (const [itemId, points] of Object.entries(val)) {
            if (typeof points === 'number' && points > maxPoints) {
              maxPoints = points
              maxItemId = itemId
            }
          }
          if (maxItemId) return [maxItemId]
        }
        break
      }
    }
  } catch {
    // Invalid response format
  }

  return []
}

/**
 * Get category labels and values for a question based on its type and config
 */
export function getQuestionCategories(
  question: StudyFlowQuestionRow
): { labels: string[]; values: string[] } {
  switch (question.question_type) {
    case 'multiple_choice': {
      const config = castJson<MultipleChoiceQuestionConfig>(question.config, { options: [], mode: 'single' })
      const options = config?.options || []
      return { labels: options.map(o => o.label), values: options.map(o => o.id) }
    }

    case 'image_choice': {
      const config = castJson<ImageChoiceQuestionConfig>(question.config, { options: [], mode: 'single', gridColumns: 3, showLabels: true })
      const options = config?.options || []
      return { labels: options.map(o => o.label || `Image ${o.id}`), values: options.map(o => o.id) }
    }

    case 'yes_no':
      return { labels: ['Yes', 'No'], values: ['yes', 'no'] }

    case 'opinion_scale': {
      const config = castJson<OpinionScaleQuestionConfig>(question.config, { scalePoints: 5, scaleType: 'numerical' })
      const points = config?.scalePoints || 5
      const start = config?.startAtZero ? 0 : 1
      const labels: string[] = []
      const values: string[] = []

      for (let i = 0; i < points; i++) {
        const val = start + i
        labels.push(String(val))
        values.push(String(val))
      }

      if (config?.leftLabel) labels[0] = `${labels[0]} - ${config.leftLabel}`
      if (config?.rightLabel) labels[labels.length - 1] = `${labels[labels.length - 1]} - ${config.rightLabel}`

      return { labels, values }
    }

    case 'nps': {
      const cats = [...NPS_CATEGORIES]
      return { labels: cats, values: cats }
    }

    case 'slider': {
      const buckets = getSliderBuckets(question)
      return { labels: buckets, values: buckets }
    }

    case 'semantic_differential': {
      const cats = [...SENTIMENT_CATEGORIES]
      return { labels: cats, values: cats }
    }

    case 'constant_sum': {
      const config = castJson<ConstantSumQuestionConfig>(question.config, { items: [], totalPoints: 100, displayMode: 'inputs', showBars: true })
      const items = config?.items || []
      return { labels: items.map(item => item.label), values: items.map(item => item.id) }
    }

    default:
      return { labels: [], values: [] }
  }
}
