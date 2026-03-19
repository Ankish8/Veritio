/**
 * Screening Evaluator
 *
 * Evaluates screening and branching conditions against participant responses.
 * Supports numeric, choice, text, semantic differential, and constant sum questions.
 */

import {
  compareNumeric,
  compareStrings,
  compareOptionIds,
} from '@veritio/core/comparison-primitives';
import type {
  ScreeningCondition,
  ScreeningConditionOperator,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
  SemanticDifferentialResponseValue,
  ConstantSumResponseValue,
  StudyFlowQuestion,
  QuestionType,
} from '../supabase/study-flow-types';

function getSelectedOptionIds(response: ResponseValue): string[] {
  if (typeof response === 'object' && response !== null) {
    if ('optionId' in response) {
      return [(response as SingleChoiceResponseValue).optionId];
    }
    if ('optionIds' in response) {
      return (response as MultiChoiceResponseValue).optionIds;
    }
  }
  return [];
}

function getNumericValue(response: ResponseValue): number | null {
  if (typeof response === 'object' && response !== null && 'value' in response) {
    const value = (response as ScaleResponseValue).value;
    return typeof value === 'number' ? value : null;
  }
  if (typeof response === 'number') {
    return response;
  }
  return null;
}

/**
 * Parse a condition value to a number, returning null if not valid.
 */
function parseConditionNumeric(value: string | number | string[]): number | null {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? null : parsed;
}

/**
 * Build a Map from question ID to question for O(1) lookups.
 */
function buildQuestionMap(
  questions: StudyFlowQuestion[] | Map<string, StudyFlowQuestion>
): Map<string, StudyFlowQuestion> {
  if (questions instanceof Map) return questions;
  return new Map(questions.map((q) => [q.id, q]));
}

/**
 * Evaluate a single screening condition against responses.
 * Accepts either a question array or a pre-built Map for O(1) type resolution.
 */
export function evaluateCondition(
  condition: ScreeningCondition,
  responses: Map<string, ResponseValue>,
  questions: StudyFlowQuestion[] | Map<string, StudyFlowQuestion>
): boolean {
  const questionsByIds = buildQuestionMap(questions);
  const response = responses.get(condition.questionId);

  if (response === undefined || response === null) {
    return false;
  }

  const question = questionsByIds.get(condition.questionId);
  const questionType = question?.question_type;

  if (questionType === 'opinion_scale' || questionType === 'nps' || questionType === 'slider') {
    return evaluateNumericCondition(condition, response);
  }

  if (questionType === 'semantic_differential' || questionType === 'constant_sum') {
    return evaluateAggregatedNumericCondition(condition, response, questionType);
  }

  if (questionType === 'multiple_choice' || questionType === 'yes_no') {
    return evaluateChoiceCondition(condition, response);
  }

  if (questionType === 'single_line_text' || questionType === 'multi_line_text') {
    return evaluateTextCondition(condition, response);
  }

  return false;
}

function evaluateNumericCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const responseValue = getNumericValue(response);
  if (responseValue === null) return false;

  const conditionValue = parseConditionNumeric(condition.value);
  if (conditionValue === null) return false;

  return compareNumeric(responseValue, conditionValue, condition.operator);
}

/**
 * Evaluate conditions for aggregated numeric response types:
 * - semantic_differential: uses average of all scale values
 * - constant_sum: uses total of all allocated points
 *
 * Both also support 'contains' to check if any individual value matches.
 */
function evaluateAggregatedNumericCondition(
  condition: ScreeningCondition,
  response: ResponseValue,
  questionType: 'semantic_differential' | 'constant_sum'
): boolean {
  if (typeof response !== 'object' || response === null) return false;

  const values = Object.values(
    response as SemanticDifferentialResponseValue | ConstantSumResponseValue
  ).filter((v): v is number => typeof v === 'number');

  if (values.length === 0) return false;

  const conditionValue = parseConditionNumeric(condition.value);
  if (conditionValue === null) return false;

  // 'contains' checks individual values regardless of aggregation
  if (condition.operator === 'contains') {
    return values.some((v) => v === conditionValue);
  }

  const aggregatedValue = questionType === 'semantic_differential'
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : values.reduce((sum, v) => sum + v, 0);

  // Semantic differential uses tolerance for 'is'/'is_not' on the average
  if (questionType === 'semantic_differential') {
    if (condition.operator === 'is') {
      return Math.abs(aggregatedValue - conditionValue) < 0.5;
    }
    if (condition.operator === 'is_not') {
      return Math.abs(aggregatedValue - conditionValue) >= 0.5;
    }
  }

  return compareNumeric(aggregatedValue, conditionValue, condition.operator);
}

function evaluateChoiceCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const selectedIds = getSelectedOptionIds(response);
  if (selectedIds.length === 0) return false;

  const conditionValues: string[] = Array.isArray(condition.value)
    ? condition.value
    : [String(condition.value)];

  return compareOptionIds(selectedIds, conditionValues, condition.operator);
}

function evaluateTextCondition(
  condition: ScreeningCondition,
  response: ResponseValue
): boolean {
  const text = typeof response === 'string' ? response : '';
  return compareStrings(text, [String(condition.value)], condition.operator);
}

/**
 * Evaluate multiple screening conditions with AND/OR logic.
 */
export function evaluateConditions(
  conditions: ScreeningCondition[],
  matchAll: boolean,
  responses: Map<string, ResponseValue>,
  questions: StudyFlowQuestion[] | Map<string, StudyFlowQuestion>
): boolean {
  const questionsByIds = buildQuestionMap(questions);
  if (conditions.length === 0) {
    return true;
  }

  if (matchAll) {
    for (const condition of conditions) {
      if (!evaluateCondition(condition, responses, questionsByIds)) return false;
    }
    return true;
  }

  for (const condition of conditions) {
    if (evaluateCondition(condition, responses, questionsByIds)) return true;
  }
  return false;
}

/**
 * Get available operators for a given question type.
 */
export function getOperatorsForQuestionType(
  questionType: QuestionType
): { value: ScreeningConditionOperator; label: string }[] {
  const baseOperators: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
  ];

  const numericOperators: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ];

  const containsOperator: { value: ScreeningConditionOperator; label: string }[] = [
    { value: 'contains', label: 'contains' },
  ];

  switch (questionType) {
    case 'opinion_scale':
    case 'nps':
    case 'slider':
      return [...baseOperators, ...numericOperators];

    case 'semantic_differential':
    case 'constant_sum':
      return [...baseOperators, ...numericOperators, ...containsOperator];

    case 'multiple_choice':
      return [...baseOperators, ...containsOperator];

    case 'yes_no':
      return baseOperators;

    case 'single_line_text':
    case 'multi_line_text':
      return [...baseOperators, ...containsOperator];

    default:
      return baseOperators;
  }
}
