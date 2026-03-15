import type {
  FlowStep,
  StudyFlowQuestion,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
  MatrixQuestionConfig,
  RankingQuestionConfig,
  ConstantSumQuestionConfig,
  SemanticDifferentialQuestionConfig,
  ChoiceOption,
  DisplayLogicCondition,
  DisplayLogic,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { QuestionResponse } from './types'
// HELPER FUNCTIONS
function getQuestionOptions(question: StudyFlowQuestion | undefined): ChoiceOption[] {
  if (!question) return []

  if (question.question_type === 'multiple_choice' || question.question_type === 'image_choice') {
    const config = question.config as MultipleChoiceQuestionConfig | undefined
    return config?.options || []
  }

  if (question.question_type === 'yes_no') {
    const config = question.config as YesNoQuestionConfig | undefined
    return [
      { id: 'yes', label: config?.yesLabel || 'Yes' },
      { id: 'no', label: config?.noLabel || 'No' },
    ]
  }

  return []
}
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
function evaluateCondition(
  condition: DisplayLogicCondition,
  responses: Map<string, QuestionResponse>,
  allQuestions: StudyFlowQuestion[]
): boolean {
  const response = responses.get(condition.questionId)
  const sourceQuestion = allQuestions.find(q => q.id === condition.questionId)

  // Handle "not answered" check first
  if (!response) {
    return condition.operator === 'is_not_answered'
  }

  const value = response.value

  // Route to appropriate evaluator based on operator
  switch (condition.operator) {
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
      const targetId = condition.values?.[0]
      return targetId ? selectedIds.includes(targetId) : false
    }

    case 'is_not': {
      const selectedIds = getSelectedOptionIds(value)
      const targetId = condition.values?.[0]
      return targetId ? !selectedIds.includes(targetId) : true
    }
    // MULTI CHOICE OPERATORS
    case 'includes_any': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = condition.values || []
      return targetIds.some(id => selectedIds.includes(id))
    }

    case 'includes_all': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = condition.values || []
      return targetIds.every(id => selectedIds.includes(id))
    }

    case 'includes_none': {
      const selectedIds = getSelectedOptionIds(value)
      const targetIds = condition.values || []
      return !targetIds.some(id => selectedIds.includes(id))
    }

    case 'selected_count_equals': {
      const selectedIds = getSelectedOptionIds(value)
      const targetCount = typeof condition.value === 'number' ? condition.value : 0
      return selectedIds.length === targetCount
    }

    case 'selected_count_gte': {
      const selectedIds = getSelectedOptionIds(value)
      const targetCount = typeof condition.value === 'number' ? condition.value : 0
      return selectedIds.length >= targetCount
    }
    // NUMERIC OPERATORS
    case 'equals': {
      // Handle both numeric and text equals
      const numValue = getNumericValue(value)
      if (numValue !== null && typeof condition.value === 'number') {
        return numValue === condition.value
      }
      // Fall back to text comparison
      const textValue = getTextValue(value)
      const targetText = typeof condition.value === 'string' ? condition.value : ''
      return textValue.toLowerCase() === targetText.toLowerCase()
    }

    case 'not_equals': {
      const numValue = getNumericValue(value)
      if (numValue !== null && typeof condition.value === 'number') {
        return numValue !== condition.value
      }
      const textValue = getTextValue(value)
      const targetText = typeof condition.value === 'string' ? condition.value : ''
      return textValue.toLowerCase() !== targetText.toLowerCase()
    }

    case 'greater_than': {
      const numValue = getNumericValue(value)
      const threshold = typeof condition.value === 'number' ? condition.value : null
      if (numValue === null || threshold === null) return false
      return numValue > threshold
    }

    case 'less_than': {
      const numValue = getNumericValue(value)
      const threshold = typeof condition.value === 'number' ? condition.value : null
      if (numValue === null || threshold === null) return false
      return numValue < threshold
    }

    case 'between': {
      const numValue = getNumericValue(value)
      const min = condition.minValue
      const max = condition.maxValue
      if (numValue === null || min === undefined || max === undefined) return false
      return numValue >= min && numValue <= max
    }
    // TEXT OPERATORS
    case 'contains': {
      const textValue = getTextValue(value)
      const searchText = typeof condition.value === 'string' ? condition.value : ''
      return textValue.toLowerCase().includes(searchText.toLowerCase())
    }

    case 'not_contains': {
      const textValue = getTextValue(value)
      const searchText = typeof condition.value === 'string' ? condition.value : ''
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
      const targetNum = typeof condition.value === 'number' ? condition.value : null
      if (isNaN(numValue) || targetNum === null) return false
      return numValue === targetNum
    }

    case 'number_not_equals': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const targetNum = typeof condition.value === 'number' ? condition.value : null
      if (isNaN(numValue) || targetNum === null) return false
      return numValue !== targetNum
    }

    case 'number_greater_than': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const threshold = typeof condition.value === 'number' ? condition.value : null
      if (isNaN(numValue) || threshold === null) return false
      return numValue > threshold
    }

    case 'number_less_than': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const threshold = typeof condition.value === 'number' ? condition.value : null
      if (isNaN(numValue) || threshold === null) return false
      return numValue < threshold
    }

    case 'number_between': {
      const textValue = getTextValue(value)
      const numValue = parseFloat(textValue)
      const min = typeof condition.value === 'number' ? condition.value : condition.minValue
      const max = condition.maxValue
      if (isNaN(numValue) || min === undefined || max === undefined) return false
      return numValue >= min && numValue <= max
    }
    // DATE TEXT OPERATORS
    case 'date_is': {
      const textValue = getTextValue(value)
      const targetDate = typeof condition.value === 'string' ? condition.value : ''
      if (!textValue || !targetDate) return false
      return textValue === targetDate
    }

    case 'date_before': {
      const textValue = getTextValue(value)
      const targetDate = typeof condition.value === 'string' ? condition.value : ''
      if (!textValue || !targetDate) return false
      return textValue < targetDate // ISO date strings can be compared lexicographically
    }

    case 'date_after': {
      const textValue = getTextValue(value)
      const targetDate = typeof condition.value === 'string' ? condition.value : ''
      if (!textValue || !targetDate) return false
      return textValue > targetDate
    }

    case 'date_between': {
      const textValue = getTextValue(value)
      const minDate = typeof condition.value === 'string' ? condition.value : ''
      const maxDate = typeof (condition as any).maxValue === 'string' ? (condition as any).maxValue as string : ''
      if (!textValue || !minDate || !maxDate) return false
      return textValue >= minDate && textValue <= maxDate
    }
    // EMAIL TEXT OPERATORS
    case 'email_domain_is': {
      const textValue = getTextValue(value).toLowerCase()
      const targetDomain = typeof condition.value === 'string' ? condition.value.toLowerCase() : ''
      if (!textValue || !targetDomain) return false
      const emailParts = textValue.split('@')
      if (emailParts.length !== 2) return false
      return emailParts[1] === targetDomain
    }

    case 'email_domain_contains': {
      const textValue = getTextValue(value).toLowerCase()
      const searchText = typeof condition.value === 'string' ? condition.value.toLowerCase() : ''
      if (!textValue || !searchText) return false
      const emailParts = textValue.split('@')
      if (emailParts.length !== 2) return false
      return emailParts[1].includes(searchText)
    }
    // MATRIX OPERATORS
    case 'row_equals': {
      // Matrix response: { [rowId]: columnId | columnId[] }
      if (!condition.rowId || !condition.columnId) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      const rowValue = matrixValue[condition.rowId]
      if (Array.isArray(rowValue)) {
        return rowValue.includes(condition.columnId)
      }
      return rowValue === condition.columnId
    }

    case 'row_includes': {
      // For multi-select matrix: check if row includes all specified columns
      if (!condition.rowId || !condition.columnIds?.length) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      const rowValue = matrixValue[condition.rowId]
      const selectedCols = Array.isArray(rowValue) ? rowValue : rowValue ? [rowValue] : []
      return condition.columnIds.every(colId => selectedCols.includes(colId))
    }

    case 'any_row_equals': {
      // Check if any row has the specified column selected
      if (!condition.columnId) return false
      const matrixValue = value as Record<string, string | string[]> | null
      if (!matrixValue) return false
      return Object.values(matrixValue).some(rowValue => {
        if (Array.isArray(rowValue)) {
          return rowValue.includes(condition.columnId!)
        }
        return rowValue === condition.columnId
      })
    }
    // RANKING OPERATORS
    case 'item_ranked_at': {
      // Ranking response: string[] (ordered item IDs)
      if (!condition.itemId || condition.position === undefined) return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const actualPosition = ranking.indexOf(condition.itemId) + 1 // 1-based
      return actualPosition === condition.position
    }

    case 'item_in_top': {
      // Check if item is in top N
      if (!condition.itemId || typeof condition.value !== 'number') return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const actualPosition = ranking.indexOf(condition.itemId) + 1 // 1-based
      return actualPosition > 0 && actualPosition <= condition.value
    }

    case 'item_ranked_above': {
      // Check if itemId is ranked above secondItemId
      if (!condition.itemId || !condition.secondItemId) return false
      const ranking = value as string[] | null
      if (!ranking || !Array.isArray(ranking)) return false
      const pos1 = ranking.indexOf(condition.itemId)
      const pos2 = ranking.indexOf(condition.secondItemId)
      // Lower index = higher rank
      return pos1 !== -1 && pos2 !== -1 && pos1 < pos2
    }
    // CONSTANT SUM OPERATORS
    case 'item_equals': {
      // Constant sum response: { [itemId]: number }
      if (!condition.itemId || typeof condition.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return allocation[condition.itemId] === condition.value
    }

    case 'item_greater_than': {
      if (!condition.itemId || typeof condition.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return (allocation[condition.itemId] ?? 0) > condition.value
    }

    case 'item_less_than': {
      if (!condition.itemId || typeof condition.value !== 'number') return false
      const allocation = value as Record<string, number> | null
      if (!allocation) return false
      return (allocation[condition.itemId] ?? 0) < condition.value
    }
    // SEMANTIC DIFF OPERATORS
    case 'scale_equals': {
      // Semantic diff response: { [scaleId]: number }
      if (!condition.scaleId || typeof condition.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return scales[condition.scaleId] === condition.value
    }

    case 'scale_greater_than': {
      if (!condition.scaleId || typeof condition.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return (scales[condition.scaleId] ?? -Infinity) > condition.value
    }

    case 'scale_less_than': {
      if (!condition.scaleId || typeof condition.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      return (scales[condition.scaleId] ?? Infinity) < condition.value
    }

    case 'average_greater_than': {
      if (typeof condition.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      const values = Object.values(scales).filter((v): v is number => typeof v === 'number')
      if (values.length === 0) return false
      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      return average > condition.value
    }

    case 'average_less_than': {
      if (typeof condition.value !== 'number') return false
      const scales = value as Record<string, number> | null
      if (!scales) return false
      const values = Object.values(scales).filter((v): v is number => typeof v === 'number')
      if (values.length === 0) return false
      const average = values.reduce((sum, v) => sum + v, 0) / values.length
      return average < condition.value
    }

    default:
      // Unknown operator - default to true (don't block)
      return true
  }
}
export function evaluateDisplayLogic(
  question: StudyFlowQuestion,
  responses: Map<string, QuestionResponse>,
  allQuestions: StudyFlowQuestion[]
): boolean {
  const displayLogic = question.display_logic as DisplayLogic | null | undefined

  if (!displayLogic) return true

  const { action, conditions, matchAll } = displayLogic

  if (conditions.length === 0) {
    return action === 'show'
  }

  const results = conditions.map(condition =>
    evaluateCondition(condition as DisplayLogicCondition, responses, allQuestions)
  )
  const conditionsMet = matchAll
    ? results.every(r => r)
    : results.some(r => r)

  // If action is 'show', show when conditions are met
  // If action is 'hide', hide when conditions are met (so show when not met)
  return action === 'show' ? conditionsMet : !conditionsMet
}
// QUESTION VISIBILITY
export function getQuestionsForStep(
  step: FlowStep,
  screeningQuestions: StudyFlowQuestion[],
  preStudyQuestions: StudyFlowQuestion[],
  postStudyQuestions: StudyFlowQuestion[],
  surveyQuestions: StudyFlowQuestion[]
): StudyFlowQuestion[] {
  switch (step) {
    case 'screening':
      return screeningQuestions
    case 'pre_study':
      return preStudyQuestions
    case 'post_study':
      return postStudyQuestions
    case 'survey':
      return surveyQuestions
    default:
      return []
  }
}
export function getVisibleQuestions(
  questions: StudyFlowQuestion[],
  responses: Map<string, QuestionResponse>,
  hiddenCustomSections: Set<string>
): StudyFlowQuestion[] {
  return questions.filter(q => {
    // Check if question is in a hidden custom section
    if (q.custom_section_id && hiddenCustomSections.has(q.custom_section_id)) {
      return false
    }

    // Evaluate display logic
    return evaluateDisplayLogic(q, responses, questions)
  })
}
