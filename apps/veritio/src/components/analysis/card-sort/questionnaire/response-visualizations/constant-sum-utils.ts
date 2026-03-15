import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type {
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
} from '@veritio/study-types/study-flow-types'
import { castJson } from '@/lib/supabase/json-utils'

export interface ConstantSumItemAllocation {
  itemId: string
  label: string
  description?: string
  mean: number
  percentage: number
}

const DEFAULT_CONFIG = { items: [], totalPoints: 100, displayMode: 'inputs' as const, showBars: true }

/**
 * Parse constant sum config from a question.
 * Used by constant-sum-visualization, constant-sum-bar-chart, constant-sum-pie-chart.
 */
export function parseConstantSumConfig(question: StudyFlowQuestionRow) {
  const config = castJson<ConstantSumQuestionConfig>(question.config, DEFAULT_CONFIG)
  return {
    items: config.items || [],
    totalPoints: config.totalPoints ?? 100,
  }
}

/**
 * Calculate mean allocations for each item across all responses.
 * Shared between the three constant sum visualization variants.
 */
export function calculateConstantSumAllocations(
  responses: StudyFlowResponseRow[],
  items: ConstantSumQuestionConfig['items'],
  totalPoints: number
): ConstantSumItemAllocation[] {
  const allocations: ConstantSumItemAllocation[] = []

  // Build label→id lookup for handling legacy responses stored with label keys
  const labelToId = new Map<string, string>()
  for (const item of items) {
    labelToId.set(item.label.toLowerCase(), item.id)
  }

  for (const item of items) {
    const values: number[] = []

    for (const response of responses) {
      const value = response.response_value as ConstantSumResponseValue
      // Try direct ID match first, then label match for legacy data
      const allocation = value?.[item.id] ?? value?.[item.label] ?? 0
      values.push(typeof allocation === 'number' ? allocation : 0)
    }

    const mean = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0

    const percentage = totalPoints > 0 ? (mean / totalPoints) * 100 : 0

    allocations.push({
      itemId: item.id,
      label: item.label || 'Untitled item',
      description: item.description,
      mean,
      percentage,
    })
  }

  return allocations
}
