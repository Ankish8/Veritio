/**
 * Shared question validation utilities for study flow player steps.
 * Used by questions-step, screening-step, and survey-questions-step
 * to determine if a question has a valid response.
 */

import type {
  StudyFlowQuestion,
  ResponseValue,
  ConstantSumQuestionConfig,
  ConstantSumResponseValue,
  SemanticDifferentialQuestionConfig,
  SemanticDifferentialResponseValue,
  MultipleChoiceQuestionConfig,
} from '@veritio/study-types/study-flow-types'

/**
 * Checks if a response value is empty/missing for validation purposes.
 * Handles strings, arrays, and object-based response shapes.
 */
function isEmptyResponse(val: ResponseValue): boolean {
  if (val === undefined || val === null) return true
  if (typeof val === 'string' && val.trim() === '') return true
  if (Array.isArray(val) && val.length === 0) return true
  if (typeof val === 'object' && 'optionIds' in val && Array.isArray((val as any).optionIds) && (val as any).optionIds.length === 0) return true
  if (typeof val === 'object' && 'optionId' in val && !(val as any).optionId) return true
  return false
}

/**
 * Validates question-type-specific constraints beyond basic presence checks.
 * Returns false if the response is invalid for the given question type.
 */
function isValidForQuestionType(question: StudyFlowQuestion, val: ResponseValue): boolean {
  // Constant sum: must allocate exactly totalPoints
  if (question.question_type === 'constant_sum') {
    const config = question.config as ConstantSumQuestionConfig
    const totalPoints = config.totalPoints ?? 100
    const allocation = val as ConstantSumResponseValue
    const currentTotal = Object.values(allocation).reduce((sum, v) => sum + (v || 0), 0)
    if (currentTotal !== totalPoints) return false
  }

  // Semantic differential: all scales must be answered
  if (question.question_type === 'semantic_differential') {
    const config = question.config as SemanticDifferentialQuestionConfig
    const scaleResponses = val as SemanticDifferentialResponseValue
    const allScalesAnswered = config.scales.every((scale) => scaleResponses[scale.id] !== undefined)
    if (!allScalesAnswered) return false
  }

  return true
}

/**
 * Determines if a question has a valid response, considering
 * whether it's required and any question-type-specific validation.
 */
export function hasValidResponse(
  question: StudyFlowQuestion,
  responses: Map<string, { value: ResponseValue }>,
  allowSkip = false,
): boolean {
  if (question.is_required === false || allowSkip) return true

  const response = responses.get(question.id)
  if (!response) return false

  const val = response.value
  if (isEmptyResponse(val)) return false

  return isValidForQuestionType(question, val)
}

/**
 * Checks if a multiple_choice question is in single-select mode
 * (used for auto-advance logic).
 */
export function isSingleSelectChoice(question: StudyFlowQuestion): boolean {
  if (question.question_type !== 'multiple_choice') return false
  const config = question.config as MultipleChoiceQuestionConfig
  return config.mode === 'single' || !config.mode
}

/** Question types that should auto-advance in screening steps (includes rating types). */
const SCREENING_AUTO_ADVANCE_TYPES = new Set(['opinion_scale', 'yes_no', 'nps', 'matrix'])

/** Question types that should auto-advance in survey steps (excludes rating types that need review time). */
const SURVEY_AUTO_ADVANCE_TYPES = new Set(['yes_no', 'matrix'])

/**
 * Determines if a question should trigger auto-advance after selection
 * in the screening step (includes opinion_scale, nps, etc.).
 */
export function shouldAutoAdvanceScreening(question: StudyFlowQuestion): boolean {
  return SCREENING_AUTO_ADVANCE_TYPES.has(question.question_type) || isSingleSelectChoice(question)
}

/**
 * Determines if a question should trigger auto-advance after selection
 * in the survey step (excludes rating types which need review time).
 */
export function shouldAutoAdvanceSurvey(question: StudyFlowQuestion): boolean {
  return SURVEY_AUTO_ADVANCE_TYPES.has(question.question_type) || isSingleSelectChoice(question)
}
