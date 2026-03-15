import type { DataType as CorrelationDataType } from '@/lib/algorithms/correlation-statistics'
import type { StudyFlowQuestionRow } from '@veritio/study-types'
import type { DataType, QuestionCorrelationInfo } from '../types'
import { truncateText } from '../types'
import { stripPipingHtml } from '@/lib/utils'
import { isBinaryData } from './data-extraction'

export function getDataTypeFromQuestionType(questionType: string): DataType {
  switch (questionType) {
    // Numeric/ordinal types - can use Pearson or Spearman
    case 'nps':
    case 'opinion_scale':
    case 'linear_scale':
    case 'rating':
    case 'slider':
    case 'semantic_differential':  // Average score across scales
    case 'constant_sum':  // Variance/entropy in point allocation
      return 'ordinal'

    // Binary types - use point-biserial
    case 'yes_no':
      return 'binary'

    // Categorical types - use Cramer's V
    case 'multiple_choice':
    case 'image_choice':  // Visual choice treated as categorical
    case 'checkboxes':
    case 'dropdown':
      return 'categorical'

    // Unsupported types
    case 'text':
    case 'textarea':
    case 'long_text':
    case 'single_line_text':
    case 'multi_line_text':
    case 'audio_response':
    case 'matrix':
    case 'ranking':
    case 'file_upload':
    case 'date':
    case 'email':
    case 'phone':
      return 'unsupported'

    default:
      return 'unsupported'
  }
}

export function isQuestionCompatible(questionType: string): boolean {
  return getDataTypeFromQuestionType(questionType) !== 'unsupported'
}

export function getCompatibleQuestions(
  flowQuestions: StudyFlowQuestionRow[]
): QuestionCorrelationInfo[] {
  return flowQuestions
    .filter(q => q.section === 'survey' && isQuestionCompatible(q.question_type))
    .map(q => {
      const cleanText = stripPipingHtml(q.question_text)
      return {
        id: q.id,
        text: cleanText,
        shortText: truncateText(cleanText, 35),
        type: q.question_type,
        dataType: getDataTypeFromQuestionType(q.question_type),
        section: q.section,
        options: extractOptionsFromConfig(q.config),
      }
    })
    .sort((a, b) => a.text.localeCompare(b.text))
}

export function mapToCorrelationDataType(
  dataType: DataType,
  data: number[]
): CorrelationDataType {
  if (isBinaryData(data)) return 'binary'
  if (dataType === 'unsupported') return 'ordinal'
  return dataType
}

function extractOptionsFromConfig(
  config: unknown
): string[] | undefined {
  if (!config || typeof config !== 'object') return undefined

  const cfg = config as { options?: Array<{ label?: string; value?: string }> }
  if (!cfg.options || !Array.isArray(cfg.options)) return undefined

  return cfg.options.map(o => o.label || o.value || '').filter(Boolean)
}

