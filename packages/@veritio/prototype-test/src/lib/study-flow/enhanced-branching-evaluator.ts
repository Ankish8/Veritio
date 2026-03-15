/**
 * Enhanced Branching Logic Evaluator
 *
 * Evaluates enhanced branching rules using the same condition evaluation
 * logic as display logic, but returns navigation targets instead of visibility.
 */

import type {
  StudyFlowQuestion,
  EnhancedSurveyBranchingLogic,
  EnhancedBranchingRule,
  SurveyBranchTarget,
  DisplayLogicCondition,
} from '../supabase/study-flow-types'
import type { QuestionResponse } from '../../stores/study-flow-player/types'
// HELPER FUNCTIONS
function getNumericValue(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const v = (value as { value: unknown }).value
    if (typeof v === 'number') return v
  }
  return null
}
function getSelectedOptionIds(value: unknown): string[] {
  if (typeof value === 'object' && value !== null) {
    if ('optionId' in value) {
      return [(value as { optionId: string }).optionId]
    }
    if ('optionIds' in value) {
      return (value as { optionIds: string[] }).optionIds
    }
  }
  return []
}
function getTextValue(value: unknown): string {
  if (typeof value === 'string') return value
  return ''
}
function getBooleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  return null
}
// CONDITION EVALUATION
function evaluateRuleCondition(
  rule: EnhancedBranchingRule,
  response: QuestionResponse | undefined
): boolean {
  // Handle "not answered" check first
  if (!response) {
    return rule.operator === 'is_not_answered'
  }

  const value = response.value

  // Route to appropriate evaluator based on operator
  switch (rule.operator) {
    // UNIVERSAL OPERATORS
    case 'is_answered':
      return true

    case 'is_not_answered':
      return false
    // YES/NO OPERATORS
    case 'is_yes':
      return getBooleanValue(value) === true

    case 'is_no':
      return getBooleanValue(value) === false
    // SINGLE CHOICE OPERATORS
    case 'is': {
      const selectedIds = getSelectedOptionIds(value)
      const targetId = rule.values?.[0]
      return targetId ? selectedIds.includes(targetId) : false
    }

    case 'is_not': {
      const selectedIds = getSelectedOptionIds(value)
      const targetId = rule.values?.[0]
      return targetId ? !selectedIds.includes(targetId) : true
    }
    // MULTI CHOICE OPERATORS
    case 'includes_any': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = rule.values || []
      return targetIds.some(id => selectedIds.includes(id))
    }

    case 'includes_all': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = rule.values || []
      return targetIds.every(id => selectedIds.includes(id))
    }

    case 'includes_none': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = rule.values || []
      return !targetIds.some(id => selectedIds.includes(id))
    }

    case 'selected_count_equals': {
      const selectedIds = getSelectedOptionIds(value)
      const targetCount = typeof rule.value === 'number' ? rule.value : 0
      return selectedIds.length === targetCount
    }

    case 'selected_count_gte': {
      const selectedIds = getSelectedOptionIds(value)
      const targetCount = typeof rule.value === 'number' ? rule.value : 0
      return selectedIds.length >= targetCount
    }
    // NUMERIC OPERATORS
    case 'equals': {
      // Handle both numeric and text equals
      const numValue = getNumericValue(value)
      if (numValue !== null && typeof rule.value === 'number') {
        return numValue === rule.value
      }
      // Fall back to text comparison
      const textValue = getTextValue(value)
      const targetText = typeof rule.value === 'string' ? rule.value : ''
      return textValue.toLowerCase() === targetText.toLowerCase()
    }

    case 'not_equals': {
      const numValue = getNumericValue(value)
      if (numValue !== null && typeof rule.value === 'number') {
        return numValue !== rule.value
      }
      const textValue = getTextValue(value)
      const targetText = typeof rule.value === 'string' ? rule.value : ''
      return textValue.toLowerCase() !== targetText.toLowerCase()
    }

    case 'greater_than': {
      const numValue = getNumericValue(value)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (numValue === null || threshold === null) return false
      return numValue > threshold
    }

    case 'less_than': {
      const numValue = getNumericValue(value)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (numValue === null || threshold === null) return false
      return numValue < threshold
    }

    case 'greater_than_or_equals': {
      const numValue = getNumericValue(value)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (numValue === null || threshold === null) return false
      return numValue >= threshold
    }

    case 'less_than_or_equals': {
      const numValue = getNumericValue(value)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (numValue === null || threshold === null) return false
      return numValue <= threshold
    }

    case 'between': {
      const numValue = getNumericValue(value)
      const min = rule.minValue
      const max = rule.maxValue
      if (numValue === null || min === undefined || max === undefined) return false
      return numValue >= min && numValue <= max
    }
    // TEXT OPERATORS
    case 'contains': {
      const textValue = getTextValue(value)
      const searchText = typeof rule.value === 'string' ? rule.value : ''
      return textValue.toLowerCase().includes(searchText.toLowerCase())
    }

    case 'not_contains': {
      const textValue = getTextValue(value)
      const searchText = typeof rule.value === 'string' ? rule.value : ''
      return !textValue.toLowerCase().includes(searchText.toLowerCase())
    }

    case 'is_empty': {
      const textValue = getTextValue(value)
      return textValue.trim() === ''
    }

    case 'is_not_empty': {
      const textValue = getTextValue(value)
      return textValue.trim() !== ''
    }
    // NUMERICAL TEXT OPERATORS
    case 'number_equals': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const targetNum = typeof rule.value === 'number' ? rule.value : null
      if (isNaN(numValue) || targetNum === null) return false
      return numValue === targetNum
    }

    case 'number_not_equals': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const targetNum = typeof rule.value === 'number' ? rule.value : null
      if (isNaN(numValue) || targetNum === null) return false
      return numValue !== targetNum
    }

    case 'number_greater_than': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (isNaN(numValue) || threshold === null) return false
      return numValue > threshold
    }

    case 'number_less_than': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const threshold = typeof rule.value === 'number' ? rule.value : null
      if (isNaN(numValue) || threshold === null) return false
      return numValue < threshold
    }

    case 'number_between': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const min = typeof rule.value === 'number' ? rule.value : rule.minValue
      const max = rule.maxValue
      if (isNaN(numValue) || min === undefined || max === undefined) return false
      return numValue >= min && numValue <= max
    }
    // DATE TEXT OPERATORS
    case 'date_is': {
      const textValue = getTextValue(value)
      const targetDate = typeof rule.value === 'string' ? rule.value : ''
      if (!textValue || !targetDate) return false
      return textValue === targetDate
    }

    case 'date_before': {
      const textValue = getTextValue(value)
      const targetDate = typeof rule.value === 'string' ? rule.value : ''
      if (!textValue || !targetDate) return false
      return textValue < targetDate // ISO date strings can be compared lexicographically
    }

    case 'date_after': {
      const textValue = getTextValue(value)
      const targetDate = typeof rule.value === 'string' ? rule.value : ''
      if (!textValue || !targetDate) return false
      return textValue > targetDate
    }

    case 'date_between': {
      const textValue = getTextValue(value)
      const minDate = typeof rule.value === 'string' ? rule.value : ''
      const maxDate = typeof (rule as any).maxValue === 'string' ? (rule as any).maxValue as string : ''
      if (!textValue || !minDate || !maxDate) return false
      return textValue >= minDate && textValue <= maxDate
    }
    // EMAIL TEXT OPERATORS
    case 'email_domain_is': {
      const textValue = getTextValue(value).toLowerCase()
      const targetDomain = typeof rule.value === 'string' ? rule.value.toLowerCase() : ''
      if (!textValue || !targetDomain) return false
      const emailParts = textValue.split('@')
      if (emailParts.length !== 2) return false
      return emailParts[1] === targetDomain
    }

    case 'email_domain_contains': {
      const textValue = getTextValue(value).toLowerCase()
      const searchText = typeof rule.value === 'string' ? rule.value.toLowerCase() : ''
      if (!textValue || !searchText) return false
      const emailParts = textValue.split('@')
      if (emailParts.length !== 2) return false
      return emailParts[1].includes(searchText)
    }
    // MATRIX OPERATORS
    case 'row_equals': {
      if (!rule.rowId || !rule.columnId) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      const rowValue = matrixValue[rule.rowId]
      if (Array.isArray(rowValue)) {
        return rowValue.includes(rule.columnId)
      }
      return rowValue === rule.columnId
    }

    case 'row_includes': {
      if (!rule.rowId || !rule.columnIds?.length) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      const rowValue = matrixValue[rule.rowId]
      const selectedCols = Array.isArray(rowValue) ? rowValue : rowValue ? [rowValue] : []
      return rule.columnIds.every(colId => selectedCols.includes(colId))
    }

    case 'any_row_equals': {
      if (!rule.columnId) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      return Object.values(matrixValue).some(rowValue => {
        if (Array.isArray(rowValue)) {
          return rowValue.includes(rule.columnId!)
        }
        return rowValue === rule.columnId
      })
    }
    // RANKING OPERATORS
    case 'item_ranked_at': {
      if (!rule.itemId || rule.position === undefined) return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const actualPosition = ranking.indexOf(rule.itemId) + 1 // 1-based
      return actualPosition === rule.position
    }

    case 'item_in_top': {
      if (!rule.itemId || typeof rule.value !== 'number') return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const actualPosition = ranking.indexOf(rule.itemId) + 1 // 1-based
      return actualPosition > 0 && actualPosition <= rule.value
    }

    case 'item_ranked_above': {
      if (!rule.itemId || !rule.secondItemId) return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const pos1 = ranking.indexOf(rule.itemId)
      const pos2 = ranking.indexOf(rule.secondItemId)
      return pos1 !== -1 && pos2 !== -1 && pos1 < pos2
    }
    // CONSTANT SUM OPERATORS
    case 'item_equals': {
      if (!rule.itemId || typeof rule.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return allocation[rule.itemId] === rule.value
    }

    case 'item_greater_than': {
      if (!rule.itemId || typeof rule.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return (allocation[rule.itemId] ?? 0) > rule.value
    }

    case 'item_less_than': {
      if (!rule.itemId || typeof rule.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return (allocation[rule.itemId] ?? 0) < rule.value
    }
    // SEMANTIC DIFF OPERATORS
    case 'scale_equals': {
      if (!rule.scaleId || typeof rule.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return scales[rule.scaleId] === rule.value
    }

    case 'scale_greater_than': {
      if (!rule.scaleId || typeof rule.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return (scales[rule.scaleId] ?? -Infinity) > rule.value
    }

    case 'scale_less_than': {
      if (!rule.scaleId || typeof rule.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return (scales[rule.scaleId] ?? Infinity) < rule.value
    }

    case 'average_greater_than': {
      if (typeof rule.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      const values = Object.values(scales).filter((v): v is number => typeof v === 'number')
      if (values.length === 0) return false
      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      return average > rule.value
    }

    case 'average_less_than': {
      if (typeof rule.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      const values = Object.values(scales).filter((v): v is number => typeof v === 'number')
      if (values.length === 0) return false
      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      return average < rule.value
    }

    default:
      // Unknown operator - default to false (don't match)
      return false
  }
}
// MAIN EVALUATOR

export interface EnhancedBranchingResult {
  target: SurveyBranchTarget
  targetId?: string
}
export function evaluateEnhancedBranching(
  logic: EnhancedSurveyBranchingLogic,
  response: QuestionResponse | undefined
): EnhancedBranchingResult {
  // Evaluate rules in order, first match wins
  for (const rule of logic.rules) {
    const conditionMet = evaluateRuleCondition(rule, response)
    if (conditionMet) {
      return {
        target: rule.target,
        targetId: rule.targetId,
      }
    }
  }

  // No rule matched, return default target
  return {
    target: logic.defaultTarget,
    targetId: logic.defaultTargetId,
  }
}
export function isEnhancedBranchingLogic(
  logic: unknown
): logic is EnhancedSurveyBranchingLogic {
  return (
    typeof logic === 'object' &&
    logic !== null &&
    'type' in logic &&
    (logic as EnhancedSurveyBranchingLogic).type === 'enhanced'
  )
}
