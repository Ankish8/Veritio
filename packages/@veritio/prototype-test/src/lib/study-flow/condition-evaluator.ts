// DUPLICATION NOTE: This is a monolithic version of the condition evaluator.
// The app version at apps/veritio/src/lib/study-flow/condition-evaluator.ts has been
// split into screening-evaluator.ts, condition-converters.ts, and question-reference-utils.ts.
// Consider importing from the split modules when resolving pre-existing type errors.

import type {
  ScreeningCondition,
  ScreeningConditionOperator,
  AdvancedCondition,
  AdvancedConditionOperator,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
  SemanticDifferentialResponseValue,
  ConstantSumResponseValue,
  StudyFlowQuestion,
  QuestionType,
} from '../supabase/study-flow-types'
function getSelectedOptionIds(response: ResponseValue): string[] {
  if (typeof response === 'object' && response !== null) {
    if ('optionId' in response) {
      return [(response as SingleChoiceResponseValue).optionId]
    }
    if ('optionIds' in response) {
      return (response as MultiChoiceResponseValue).optionIds
    }
  }
  return []
}
function getNumericValue(response: ResponseValue): number | null {
  if (typeof response === 'object' && response !== null && 'value' in response) {
    const value = (response as ScaleResponseValue).value
    return typeof value === 'number' ? value : null
  }
  if (typeof response === 'number') {
    return response
  }
  return null
}
export function evaluateCondition(
  condition: ScreeningCondition,
  responses: Map<string, ResponseValue>,
  questions: StudyFlowQuestion[]
): boolean {
  const response = responses.get(condition.questionId)

  // If the referenced question hasn't been answered, condition evaluates to false
  if (response === undefined || response === null) {
    return false
  }

  // Find the question type for proper evaluation
  const question = questions.find((q) => q.id === condition.questionId)
  const questionType = question?.question_type

  // Handle numeric question types (opinion_scale, nps, slider)
  if (questionType === 'opinion_scale' || questionType === 'nps' || questionType === 'slider') {
    return evaluateNumericCondition(condition, response)
  }

  // Handle semantic differential (evaluates average of all scales)
  if (questionType === 'semantic_differential') {
    return evaluateSemanticDifferentialCondition(condition, response)
  }

  // Handle constant sum (evaluates total allocated points)
  if (questionType === 'constant_sum') {
    return evaluateConstantSumCondition(condition, response)
  }

  // Handle choice question types (multiple_choice, yes_no)
  if (['multiple_choice', 'yes_no'].includes(questionType || '')) {
    return evaluateChoiceCondition(condition, response)
  }

  // Handle text question types (basic string comparison)
  if (questionType === 'single_line_text' || questionType === 'multi_line_text') {
    return evaluateTextCondition(condition, response)
  }

  // Unknown type - default to false
  return false
}
function evaluateNumericCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const responseValue = getNumericValue(response)
  if (responseValue === null) return false

  const conditionValue = typeof condition.value === 'number'
    ? condition.value
    : parseFloat(String(condition.value))

  if (isNaN(conditionValue)) return false

  switch (condition.operator) {
    case 'is':
      return responseValue === conditionValue
    case 'is_not':
      return responseValue !== conditionValue
    case 'greater_than':
      return responseValue > conditionValue
    case 'less_than':
      return responseValue < conditionValue
    case 'contains':
      // 'contains' doesn't make sense for numeric, treat as 'is'
      return responseValue === conditionValue
    default:
      return false
  }
}
function evaluateSemanticDifferentialCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  // Semantic differential response is { [scaleId]: number }
  if (typeof response !== 'object' || response === null) return false

  const sdResponse = response as SemanticDifferentialResponseValue
  const values = Object.values(sdResponse).filter((v): v is number => typeof v === 'number')

  if (values.length === 0) return false

  // Calculate average value for aggregate comparison
  const average = values.reduce((sum, v) => sum + v, 0) / values.length

  const conditionValue = typeof condition.value === 'number'
    ? condition.value
    : parseFloat(String(condition.value))

  if (isNaN(conditionValue)) return false

  switch (condition.operator) {
    case 'is':
      // Average equals condition value (with small tolerance)
      return Math.abs(average - conditionValue) < 0.5
    case 'is_not':
      return Math.abs(average - conditionValue) >= 0.5
    case 'greater_than':
      return average > conditionValue
    case 'less_than':
      return average < conditionValue
    case 'contains':
      // Check if any scale has this exact value
      return values.some((v) => v === conditionValue)
    default:
      return false
  }
}
function evaluateConstantSumCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  // Constant sum response is { [itemId]: number }
  if (typeof response !== 'object' || response === null) return false

  const csResponse = response as ConstantSumResponseValue
  const values = Object.values(csResponse).filter((v): v is number => typeof v === 'number')

  if (values.length === 0) return false

  // Calculate total allocated points for comparison
  const total = values.reduce((sum, v) => sum + v, 0)

  const conditionValue = typeof condition.value === 'number'
    ? condition.value
    : parseFloat(String(condition.value))

  if (isNaN(conditionValue)) return false

  switch (condition.operator) {
    case 'is':
      return total === conditionValue
    case 'is_not':
      return total !== conditionValue
    case 'greater_than':
      return total > conditionValue
    case 'less_than':
      return total < conditionValue
    case 'contains':
      // Check if any item has this exact allocation
      return values.some((v) => v === conditionValue)
    default:
      return false
  }
}
function evaluateChoiceCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const selectedIds = getSelectedOptionIds(response)
  if (selectedIds.length === 0) return false

  // Normalize condition value to array
  const conditionValues: string[] = Array.isArray(condition.value)
    ? condition.value
    : [String(condition.value)]

  switch (condition.operator) {
    case 'is':
      // For single choice: selected option must be in condition values
      // For checkbox: at least one selected must be in condition values
      return selectedIds.some((id) => conditionValues.includes(id))

    case 'is_not':
      // None of the selected options should be in condition values
      return !selectedIds.some((id) => conditionValues.includes(id))

    case 'contains':
      // All condition values must be selected (for checkbox)
      return conditionValues.every((val) => selectedIds.includes(val))

    case 'greater_than':
    case 'less_than':
      // These don't make sense for choice questions
      return false

    default:
      return false
  }
}
function evaluateTextCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const text = typeof response === 'string' ? response.toLowerCase() : ''
  const conditionValue = String(condition.value).toLowerCase()

  switch (condition.operator) {
    case 'is':
      return text === conditionValue
    case 'is_not':
      return text !== conditionValue
    case 'contains':
      return text.includes(conditionValue)
    case 'greater_than':
    case 'less_than':
      // These don't make sense for text
      return false
    default:
      return false
  }
}
export function evaluateConditions(
  conditions: ScreeningCondition[],
  matchAll: boolean,
  responses: Map<string, ResponseValue>,
  questions: StudyFlowQuestion[]
): boolean {
  if (conditions.length === 0) {
    return true // No conditions = always satisfied
  }

  const results = conditions.map((cond) =>
    evaluateCondition(cond, responses, questions)
  )

  if (matchAll) {
    // AND logic: all conditions must be true
    return results.every((r) => r)
  } else {
    // OR logic: at least one condition must be true
    return results.some((r) => r)
  }
}
export function getOperatorsForQuestionType(
  questionType: QuestionType
): { value: ScreeningConditionOperator; label: string }[] {
  const baseOperators: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ]

  const numericOperators: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ]

  const containsOperator: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'contains', label: 'contains' },
  ]

  switch (questionType) {
    case 'opinion_scale':
    case 'nps':
    case 'slider':
      return [...baseOperators, ...numericOperators]

    case 'semantic_differential':
      // Semantic differential uses average of all scales for comparison
      // Also supports 'contains' to check if any scale matches a specific value
      return [...baseOperators, ...numericOperators, ...containsOperator]

    case 'constant_sum':
      // Constant sum uses total allocated points for comparison
      // Also supports 'contains' to check if any item has a specific allocation
      return [...baseOperators, ...numericOperators, ...containsOperator]

    case 'multiple_choice':
      // multiple_choice includes single, multi, and dropdown modes
      // contains operator is useful for multi-select mode
      return [...baseOperators, ...containsOperator]

    case 'yes_no':
      return baseOperators

    case 'single_line_text':
    case 'multi_line_text':
      return [...baseOperators, ...containsOperator]

    default:
      return baseOperators
  }
}
// Conversion Utilities: ScreeningCondition ↔ AdvancedCondition
// These allow the unified CompoundConditionBuilder to work with both types
const operatorToAdvanced: Record<ScreeningConditionOperator, AdvancedConditionOperator> = {
  is: 'equals',
  is_not: 'not_equals',
  contains: 'contains',
  greater_than: 'greater_than',
  less_than: 'less_than',
}

const operatorToScreening: Partial<Record<AdvancedConditionOperator, ScreeningConditionOperator>> = {
  equals: 'is',
  not_equals: 'is_not',
  contains: 'contains',
  greater_than: 'greater_than',
  less_than: 'less_than',
}
export function screeningToAdvanced(condition: ScreeningCondition): AdvancedCondition {
  const advancedOperator = operatorToAdvanced[condition.operator]

  return {
    id: condition.id,
    source: 'question',
    questionId: condition.questionId,
    operator: advancedOperator,
    // Handle array values (for checkbox 'contains')
    ...(Array.isArray(condition.value)
      ? { values: condition.value.map(String) }
      : { value: condition.value }),
  }
}
export function advancedToScreening(condition: AdvancedCondition): ScreeningCondition | null {
  // Only support question-based conditions
  if (condition.source !== 'question' || !condition.questionId) {
    return null
  }

  const screeningOperator = operatorToScreening[condition.operator]
  if (!screeningOperator) {
    // Unsupported operator (e.g., 'is_answered', 'not_contains')
    return null
  }

  // Determine value - prefer values array for multi-select
  let value: string | number | string[]
  if (condition.values && condition.values.length > 0) {
    value = condition.values
  } else if (condition.value !== undefined) {
    value = condition.value
  } else {
    value = ''
  }

  return {
    id: condition.id,
    questionId: condition.questionId,
    operator: screeningOperator,
    value,
  }
}

export function screeningConditionsToAdvanced(
  conditions: ScreeningCondition[]
): AdvancedCondition[] {
  return conditions.map(screeningToAdvanced)
}

export function advancedConditionsToScreening(
  conditions: AdvancedCondition[]
): ScreeningCondition[] {
  return conditions
    .map(advancedToScreening)
    .filter((c): c is ScreeningCondition => c !== null)
}
// Reference Detection Utilities
// For finding which questions reference a given question in their conditions
export function findQuestionsReferencingId(
  questionIdToCheck: string,
  allQuestions: StudyFlowQuestion[]
): string[] {
  const referencingIds: string[] = []

  for (const question of allQuestions) {
    // Skip the question itself
    if (question.id === questionIdToCheck) continue

    // Check screening branching logic
    const branchingLogic = question.branching_logic as {
      rules?: Array<{ conditions?: ScreeningCondition[] }>
    } | null

    if (branchingLogic?.rules) {
      for (const rule of branchingLogic.rules) {
        if (rule.conditions) {
          const referencesQuestion = rule.conditions.some(
            (c) => c.questionId === questionIdToCheck
          )
          if (referencesQuestion) {
            referencingIds.push(question.id)
            break // Only add once per question
          }
        }
      }
    }

    // Check survey branching logic (has AdvancedCondition[])
    const surveyBranchingLogic = question.survey_branching_logic as {
      rules?: Array<{ conditions?: AdvancedCondition[] }>
    } | null

    if (surveyBranchingLogic?.rules && !referencingIds.includes(question.id)) {
      for (const rule of surveyBranchingLogic.rules) {
        if (rule.conditions) {
          const referencesQuestion = rule.conditions.some(
            (c) => c.questionId === questionIdToCheck
          )
          if (referencesQuestion) {
            referencingIds.push(question.id)
            break
          }
        }
      }
    }
  }

  return referencingIds
}
export function removeConditionReferences(
  question: StudyFlowQuestion,
  referencedQuestionId: string
): StudyFlowQuestion {
  const updated = { ...question }

  // Clean screening branching logic
  if (updated.branching_logic) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logic = updated.branching_logic as any
    if (logic.rules && Array.isArray(logic.rules)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanedRules = logic.rules.map((rule: any) => {
        if (!rule.conditions) return rule
        const cleanedConditions = rule.conditions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.questionId !== referencedQuestionId
        )
        return {
          ...rule,
          conditions: cleanedConditions.length > 0 ? cleanedConditions : undefined,
          matchAll: cleanedConditions.length > 0 ? rule.matchAll : undefined,
        }
      })

      updated.branching_logic = {
        ...logic,
        rules: cleanedRules,
      }
    }
  }

  // Clean survey branching logic
  if (updated.survey_branching_logic) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logic = updated.survey_branching_logic as any
    if (logic.rules && Array.isArray(logic.rules)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanedRules = logic.rules.map((rule: any) => {
        if (!rule.conditions) return rule
        const cleanedConditions = rule.conditions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c.questionId !== referencedQuestionId
        )
        return {
          ...rule,
          conditions: cleanedConditions.length > 0 ? cleanedConditions : undefined,
          matchAll: cleanedConditions.length > 0 ? rule.matchAll : undefined,
        }
      })

      updated.survey_branching_logic = {
        ...logic,
        rules: cleanedRules,
      }
    }
  }

  return updated
}
