/**
 * Display Logic Evaluator
 *
 * Evaluates display logic conditions to determine if a question should be shown
 * based on previous responses.
 */

import type {
  DisplayLogic,
  DisplayLogicCondition,
  DisplayLogicOperator,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
  TaskMetricsContext,
} from '../supabase/study-flow-types'

import {
  TASK_RESULT_QUESTION_ID,
  TASK_DIRECT_SUCCESS_QUESTION_ID,
  getTaskMetricQuestionId,
} from '../supabase/study-flow-types'

type ResponseMap = Map<string, ResponseValue>
export function evaluateCondition(
  condition: DisplayLogicCondition,
  response: ResponseValue | undefined
): boolean {
  const { operator, values = [] } = condition

  // Handle "is answered" checks
  if (operator === 'is_answered') {
    return response !== undefined
  }
  if (operator === 'is_not_answered') {
    return response === undefined
  }

  // No response - other operators require a response
  if (response === undefined) {
    return false
  }

  // Handle different response types
  if (typeof response === 'string') {
    // Text response
    return evaluateTextCondition(operator, response, values)
  }

  if (typeof response === 'boolean') {
    // Yes/No question response - convert to string for comparison
    // Values should be ['true'] or ['false']
    const boolStr = response ? 'true' : 'false'
    return evaluateTextCondition(operator, boolStr, values)
  }

  if (typeof response === 'number') {
    // Slider response (raw number) - convert to ScaleResponseValue format
    return evaluateScaleCondition(operator, { value: response } as ScaleResponseValue, values)
  }

  if (Array.isArray(response)) {
    // Ranking response (array of item IDs)
    return evaluateArrayCondition(operator, response, values)
  }

  if (typeof response === 'object') {
    if ('optionId' in response) {
      // Single choice (radio/dropdown)
      return evaluateSingleChoiceCondition(
        operator,
        response as SingleChoiceResponseValue,
        values
      )
    }
    if ('optionIds' in response) {
      // Multi choice (checkbox)
      return evaluateMultiChoiceCondition(
        operator,
        response as MultiChoiceResponseValue,
        values
      )
    }
    if ('value' in response && typeof response.value === 'number') {
      // Scale response (likert/nps)
      return evaluateScaleCondition(operator, response as ScaleResponseValue, values)
    }
    // Matrix response - treat as answered for now
    return true
  }

  return false
}

function evaluateTextCondition(
  operator: DisplayLogicOperator,
  response: string,
  values: string[]
): boolean {
  const normalizedResponse = response.toLowerCase().trim()
  const normalizedValues = values.map((v) => v.toLowerCase().trim())

  switch (operator) {
    case 'equals':
      return normalizedValues.includes(normalizedResponse)
    case 'not_equals':
      return !normalizedValues.includes(normalizedResponse)
    case 'contains':
      return normalizedValues.some((v) => normalizedResponse.includes(v))
    case 'not_contains':
      return !normalizedValues.some((v) => normalizedResponse.includes(v))
    default:
      return false
  }
}

function evaluateSingleChoiceCondition(
  operator: DisplayLogicOperator,
  response: SingleChoiceResponseValue,
  values: string[]
): boolean {
  const selectedId = response.optionId

  switch (operator) {
    case 'equals':
      return values.includes(selectedId)
    case 'not_equals':
      return !values.includes(selectedId)
    case 'contains':
      return values.includes(selectedId)
    case 'not_contains':
      return !values.includes(selectedId)
    default:
      return false
  }
}

function evaluateMultiChoiceCondition(
  operator: DisplayLogicOperator,
  response: MultiChoiceResponseValue,
  values: string[]
): boolean {
  const selectedIds = response.optionIds

  switch (operator) {
    case 'equals':
      // All specified values are selected and no others
      return (
        values.length === selectedIds.length &&
        values.every((v) => selectedIds.includes(v))
      )
    case 'not_equals':
      return !(
        values.length === selectedIds.length &&
        values.every((v) => selectedIds.includes(v))
      )
    case 'contains':
      // At least one of the specified values is selected
      return values.some((v) => selectedIds.includes(v))
    case 'not_contains':
      // None of the specified values are selected
      return !values.some((v) => selectedIds.includes(v))
    default:
      return false
  }
}

function evaluateScaleCondition(
  operator: DisplayLogicOperator,
  response: ScaleResponseValue,
  values: string[]
): boolean {
  const scaleValue = response.value
  const comparisonValue = Number(values[0])

  if (isNaN(comparisonValue)) return false

  switch (operator) {
    case 'equals':
      return scaleValue === comparisonValue
    case 'not_equals':
      return scaleValue !== comparisonValue
    case 'greater_than':
      return scaleValue > comparisonValue
    case 'less_than':
      return scaleValue < comparisonValue
    default:
      return false
  }
}

function evaluateArrayCondition(
  operator: DisplayLogicOperator,
  response: string[],
  values: string[]
): boolean {
  switch (operator) {
    case 'contains':
      return values.some((v) => response.includes(v))
    case 'not_contains':
      return !values.some((v) => response.includes(v))
    default:
      return false
  }
}
export function evaluateDisplayLogic(
  logic: DisplayLogic | null | undefined,
  responses: ResponseMap
): boolean {
  // No logic = always show
  if (!logic) return true

  const { action, conditions, matchAll = true } = logic

  // No conditions = based on action
  if (conditions.length === 0) {
    return action === 'show'
  }

  // Evaluate each condition
  const results = conditions.map((condition) => {
    const response = responses.get(condition.questionId)
    return evaluateCondition(condition, response)
  })

  // Combine results based on matchAll (AND) or any (OR)
  const conditionsMet = matchAll
    ? results.every((r) => r)
    : results.some((r) => r)

  // Return visibility based on action
  // action: 'show' + conditionsMet -> show
  // action: 'show' + !conditionsMet -> hide
  // action: 'hide' + conditionsMet -> hide
  // action: 'hide' + !conditionsMet -> show
  return action === 'show' ? conditionsMet : !conditionsMet
}
export function filterVisibleQuestions<T extends { id: string; display_logic?: DisplayLogic | null }>(
  questions: T[],
  responses: ResponseMap
): T[] {
  return questions.filter((q) => evaluateDisplayLogic(q.display_logic, responses))
}
export function buildTaskMetricsResponseMap(
  responses: ResponseMap,
  taskContext: TaskMetricsContext
): ResponseMap {
  const enhanced = new Map(responses)

  // Task outcome (success/failure/abandoned/skipped)
  enhanced.set(TASK_RESULT_QUESTION_ID, taskContext.outcome)

  // Direct/indirect success flag
  if (taskContext.isDirect !== undefined) {
    enhanced.set(
      TASK_DIRECT_SUCCESS_QUESTION_ID,
      taskContext.isDirect ? 'direct' : 'indirect'
    )
  }

  // Numeric metrics - wrapped as ScaleResponseValue for greater_than/less_than operators
  enhanced.set(getTaskMetricQuestionId('clickCount'), { value: taskContext.clickCount })
  enhanced.set(getTaskMetricQuestionId('misclickCount'), { value: taskContext.misclickCount })
  enhanced.set(getTaskMetricQuestionId('backtrackCount'), { value: taskContext.backtrackCount })
  enhanced.set(getTaskMetricQuestionId('totalTimeMs'), { value: taskContext.totalTimeMs })
  enhanced.set(getTaskMetricQuestionId('timeToFirstClickMs'), { value: taskContext.timeToFirstClickMs })
  enhanced.set(getTaskMetricQuestionId('pathLength'), { value: taskContext.pathLength })

  // Path array - for 'contains' operator to check if specific frames were visited
  enhanced.set(getTaskMetricQuestionId('pathTaken'), taskContext.pathTaken)

  return enhanced
}

/**
 * Evaluates display logic with task metrics context.
 * Used for post-task questions in prototype testing where conditions can reference
 * task outcomes (success/failure) and performance metrics (misclicks, time, etc.).
 *
 * @param logic - The display logic configuration
 * @param responses - Map of previous question responses
 * @param taskContext - Optional task metrics from the prototype test task attempt
 * @returns true if the question should be displayed
 *
 * @example
 * // Show question only if user gave up
 * const logic = {
 *   action: 'show',
 *   conditions: [{ questionId: '__TASK_RESULT__', operator: 'equals', values: ['failure'] }]
 * }
 *
 * @example
 * // Show question if user had more than 3 misclicks
 * const logic = {
 *   action: 'show',
 *   conditions: [{ questionId: '__TASK_METRIC__misclickCount', operator: 'greater_than', values: ['3'] }]
 * }
 *
 * @example
 * // Show question if task took longer than 30 seconds
 * const logic = {
 *   action: 'show',
 *   conditions: [{ questionId: '__TASK_METRIC__totalTimeMs', operator: 'greater_than', values: ['30000'] }]
 * }
 */
export function evaluateDisplayLogicWithTaskContext(
  logic: DisplayLogic | null | undefined,
  responses: ResponseMap,
  taskContext?: TaskMetricsContext
): boolean {
  // No logic = always show
  if (!logic) return true

  // If no task context, use standard evaluation
  if (!taskContext) {
    return evaluateDisplayLogic(logic, responses)
  }

  // Build enhanced response map with task metrics
  const enhancedResponses = buildTaskMetricsResponseMap(responses, taskContext)

  // Use standard evaluation with enhanced responses
  return evaluateDisplayLogic(logic, enhancedResponses)
}
export function filterVisibleQuestionsWithTaskContext<
  T extends { id: string; display_logic?: DisplayLogic | null }
>(questions: T[], responses: ResponseMap, taskContext?: TaskMetricsContext): T[] {
  return questions.filter((q) =>
    evaluateDisplayLogicWithTaskContext(q.display_logic, responses, taskContext)
  )
}
