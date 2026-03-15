import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type {
  QuestionType,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
  ChoiceOption,
} from '@veritio/study-types/study-flow-types'

interface SingleChoiceResponse {
  optionId: string
  otherText?: string
}

interface MultiChoiceResponse {
  optionIds: string[]
  otherText?: string
}

export interface ChoiceConfig {
  options: ChoiceOption[]
  mode: 'single' | 'multi' | 'dropdown'
  allowOther: boolean
  otherLabel: string
}

export interface ChoiceOptionCount {
  id: string
  label: string
  count: number
}

export function extractChoiceConfig(
  question: StudyFlowQuestionRow,
  questionType: QuestionType
): ChoiceConfig {
  if (questionType === 'yes_no') {
    const yesNoConfig = castJson<YesNoQuestionConfig>(question.config, { styleType: 'buttons' })
    return {
      options: [
        { id: 'yes', label: yesNoConfig?.yesLabel || 'Yes' },
        { id: 'no', label: yesNoConfig?.noLabel || 'No' },
      ] as ChoiceOption[],
      mode: 'single',
      allowOther: false,
      otherLabel: 'Other',
    }
  }

  const config = castJson<MultipleChoiceQuestionConfig>(question.config, { options: [], mode: 'single' })
  return {
    options: config?.options || [],
    mode: config?.mode || 'single',
    allowOther: Boolean(config?.mode !== 'dropdown' && config?.allowOther),
    otherLabel: config?.otherLabel || 'Other',
  }
}

export function countChoiceResponses(
  responses: StudyFlowResponseRow[],
  config: ChoiceConfig,
  isYesNo: boolean
): { counts: Map<string, number>; otherCount: number } {
  const counts = new Map<string, number>()
  let otherCount = 0

  for (const opt of config.options) {
    counts.set(opt.id, 0)
  }

  // Build label→id lookup for handling legacy responses stored as label strings
  const labelToId = new Map<string, string>()
  for (const opt of config.options) {
    labelToId.set(opt.label.toLowerCase(), opt.id)
  }

  for (const response of responses) {
    const value = response.response_value

    if (isYesNo) {
      const boolValue = value === true || value === 'true'
      const optionId = boolValue ? 'yes' : 'no'
      counts.set(optionId, (counts.get(optionId) || 0) + 1)
      continue
    }

    if (config.mode === 'multi') {
      // Handle correct format: { optionIds: string[] }
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'optionIds' in value) {
        const multiResponse = value as unknown as MultiChoiceResponse
        for (const optionId of multiResponse.optionIds || []) {
          counts.set(optionId, (counts.get(optionId) || 0) + 1)
        }
        if (multiResponse.otherText) otherCount++
      }
      // Handle legacy format: plain array of label strings (e.g. ["Social media", "News articles"])
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') {
            const matchedId = labelToId.get(item.toLowerCase()) || (counts.has(item) ? item : null)
            if (matchedId) {
              counts.set(matchedId, (counts.get(matchedId) || 0) + 1)
            } else {
              otherCount++
            }
          }
        }
      }
    } else {
      // Handle correct format: { optionId: string }
      if (typeof value === 'object' && value !== null && 'optionId' in value) {
        const singleResponse = value as unknown as SingleChoiceResponse
        if (singleResponse.optionId) {
          counts.set(singleResponse.optionId, (counts.get(singleResponse.optionId) || 0) + 1)
        }
        if (singleResponse.otherText) otherCount++
      }
      // Handle legacy format: plain string label (e.g. "Expert – I work in design professionally")
      else if (typeof value === 'string' && value) {
        const matchedId = labelToId.get(value.toLowerCase()) || (counts.has(value) ? value : null)
        if (matchedId) {
          counts.set(matchedId, (counts.get(matchedId) || 0) + 1)
        } else {
          otherCount++
        }
      }
    }
  }

  return { counts, otherCount }
}
