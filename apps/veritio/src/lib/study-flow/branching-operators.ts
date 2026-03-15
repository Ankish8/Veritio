/**
 * Branching Logic Operators
 *
 * Extends display logic operators for branching context.
 * Key feature: Filters out "empty" conditions when question is required.
 */

import type { StudyFlowQuestion } from '../supabase/study-flow-types'
import {
  getOperatorsForQuestion,
  type DisplayLogicOperatorDef,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'

// Re-export everything from display-logic-operators for convenience
export * from '@veritio/prototype-test/lib/study-flow/display-logic-operators'

/**
 * Operators that check for "empty" or "not answered" state.
 * These should be hidden when a question is required since they can never be true.
 */
const EMPTY_STATE_OPERATORS = [
  'is_empty',
  'is_not_empty',
  'is_not_answered',
]

/**
 * Get available operators for branching, with smart filtering.
 * When a question is required, operators that check for "empty" state are removed
 * since they can never evaluate to true for a required question.
 *
 * @param question - The question to get operators for
 * @param isRequired - Whether the question is required
 * @returns Array of operator definitions, filtered based on required state
 *
 * @example
 * // For a required text question, 'is_empty' and 'is_not_empty' are hidden
 * const ops = getBranchingOperatorsForQuestion(textQuestion, true)
 * // Returns: [contains, not_contains, equals, is_answered] (no is_empty, is_not_empty)
 *
 * @example
 * // For an optional text question, all operators are available
 * const ops = getBranchingOperatorsForQuestion(textQuestion, false)
 * // Returns: [contains, not_contains, equals, is_empty, is_not_empty, is_answered]
 */
export function getBranchingOperatorsForQuestion(
  question: StudyFlowQuestion,
  isRequired: boolean
): DisplayLogicOperatorDef[] {
  let operators = getOperatorsForQuestion(question)

  if (isRequired) {
    // Filter out operators that check for empty/unanswered state
    operators = operators.filter(
      (op) => !EMPTY_STATE_OPERATORS.includes(op.value)
    )
  }

  return operators
}

/**
 * Get the default operator for branching based on question type.
 * For required questions, ensures we don't return an empty-state operator.
 *
 * @param question - The question to get default operator for
 * @param isRequired - Whether the question is required
 * @returns The default operator value
 */
export function getDefaultBranchingOperator(
  question: StudyFlowQuestion,
  isRequired: boolean
): string {
  const operators = getBranchingOperatorsForQuestion(question, isRequired)
  return operators[0]?.value || 'is_answered'
}
