/**
 * Branching Logic Evaluator
 *
 * Evaluates branching logic for screening questions to determine
 * where the participant should be directed next.
 */

import type {
  BranchingLogic,
  ScaleBranchingLogic,
  BranchTarget,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
  QuestionType,
  StudyFlowQuestion,
  BranchingRule,
  ScaleBranchingRule,
  SurveyBranchingLogic,
  SurveyBranchingRule,
  SurveyBranchTarget,
  AdvancedCondition,
  SurveyBranchingLogicUnion,
  EnhancedSurveyBranchingLogic,
} from '../supabase/study-flow-types'
import { evaluateConditions, advancedConditionsToScreening } from './condition-evaluator'
import {
  evaluateEnhancedBranching,
  isEnhancedBranchingLogic,
  type EnhancedBranchingResult,
} from './enhanced-branching-evaluator'
import type { QuestionResponse } from '../../stores/study-flow-player/types'
function areRuleConditionsSatisfied(
  rule: BranchingRule | ScaleBranchingRule,
  allResponses: Map<string, ResponseValue>,
  allQuestions: StudyFlowQuestion[]
): boolean {
  // ScaleBranchingRule doesn't have conditions - always satisfied
  if (!('conditions' in rule)) {
    return true
  }

  // No conditions = always satisfied (backward compatible)
  if (!rule.conditions || rule.conditions.length === 0) {
    return true
  }

  // matchAll defaults to true (AND logic)
  const matchAll = rule.matchAll !== false
  return evaluateConditions(rule.conditions, matchAll, allResponses, allQuestions)
}
export function evaluateChoiceBranching(
  logic: BranchingLogic,
  response: SingleChoiceResponseValue | MultiChoiceResponseValue,
  allResponses?: Map<string, ResponseValue>,
  allQuestions?: StudyFlowQuestion[]
): BranchTarget {
  const { rules, defaultTarget } = logic
  const responses = allResponses ?? new Map()
  const questions = allQuestions ?? []

  // For single choice (radio/dropdown)
  if ('optionId' in response) {
    // Find matching rule AND check compound conditions
    const matchingRule = rules.find((r) => {
      if (r.optionId !== response.optionId) return false
      // Check compound conditions if present
      return areRuleConditionsSatisfied(r, responses, questions)
    })
    return matchingRule?.target ?? defaultTarget
  }

  // For multi choice (checkbox)
  if ('optionIds' in response) {
    // Find the first rule that matches any selected option AND satisfies conditions
    // Priority: reject > go_to_study > next
    const targetPriority: BranchTarget[] = ['reject', 'go_to_study', 'next']

    for (const priority of targetPriority) {
      const matchingRule = rules.find((r) => {
        if (!response.optionIds.includes(r.optionId)) return false
        if (r.target !== priority) return false
        // Check compound conditions if present
        return areRuleConditionsSatisfied(r, responses, questions)
      })
      if (matchingRule) {
        return matchingRule.target
      }
    }

    return defaultTarget
  }

  return defaultTarget
}
export function evaluateScaleBranching(
  logic: ScaleBranchingLogic,
  response: ScaleResponseValue,
  allResponses?: Map<string, ResponseValue>,
  allQuestions?: StudyFlowQuestion[]
): BranchTarget {
  const { rules, defaultTarget } = logic
  const value = response.value
  const responses = allResponses ?? new Map()
  const questions = allQuestions ?? []

  // Find the first matching rule (order matters for priority)
  for (const rule of rules) {
    let matches = false

    switch (rule.comparison) {
      case 'equals':
        matches = value === rule.scaleValue
        break
      case 'less_than':
        matches = value < rule.scaleValue
        break
      case 'greater_than':
        matches = value > rule.scaleValue
        break
    }

    // Check compound conditions if the comparison matches
    if (matches && areRuleConditionsSatisfied(rule, responses, questions)) {
      return rule.target
    }
  }

  return defaultTarget
}
function isScaleBranchingLogic(
  logic: BranchingLogic | ScaleBranchingLogic
): logic is ScaleBranchingLogic {
  return (
    Array.isArray((logic as ScaleBranchingLogic).rules) &&
    (logic as ScaleBranchingLogic).rules.length > 0 &&
    'scaleValue' in (logic as ScaleBranchingLogic).rules[0] &&
    'comparison' in (logic as ScaleBranchingLogic).rules[0]
  )
}

/**
 * Evaluates branching logic for any question type
 * Extended to support compound conditions by passing all responses and questions
 *
 * @param logic - The branching logic configuration
 * @param response - The participant's response
 * @param questionType - The type of question
 * @param allResponses - All responses for compound condition evaluation (optional for backward compat)
 * @param allQuestions - All questions in the section for compound condition evaluation (optional for backward compat)
 * @returns The target destination (next, reject, or go_to_study)
 */
export function evaluateBranchingLogic(
  logic: BranchingLogic | ScaleBranchingLogic | null | undefined,
  response: ResponseValue | undefined,
  questionType: QuestionType,
  allResponses?: Map<string, ResponseValue>,
  allQuestions?: StudyFlowQuestion[]
): BranchTarget {
  // No logic or no response = proceed to next
  if (!logic || response === undefined) {
    return 'next'
  }

  // Handle scale questions (opinion_scale, nps, slider)
  if ((questionType === 'opinion_scale' || questionType === 'nps' || questionType === 'slider') && isScaleBranchingLogic(logic)) {
    // opinion_scale and nps store { value: number }, slider stores raw number
    if (typeof response === 'number') {
      // Slider response - convert to ScaleResponseValue format
      return evaluateScaleBranching(
        logic,
        { value: response } as ScaleResponseValue,
        allResponses,
        allQuestions
      )
    } else if (typeof response === 'object' && 'value' in response) {
      return evaluateScaleBranching(
        logic,
        response as ScaleResponseValue,
        allResponses,
        allQuestions
      )
    }
  }

  // Handle choice questions (multiple_choice covers single, multi, dropdown modes)
  if (['multiple_choice', 'radio', 'dropdown', 'checkbox'].includes(questionType)) {
    const choiceLogic = logic as BranchingLogic
    if (
      typeof response === 'object' &&
      ('optionId' in response || 'optionIds' in response)
    ) {
      return evaluateChoiceBranching(
        choiceLogic,
        response as SingleChoiceResponseValue | MultiChoiceResponseValue,
        allResponses,
        allQuestions
      )
    }
  }

  // Handle yes/no questions (boolean response)
  if (questionType === 'yes_no' && typeof response === 'boolean') {
    const choiceLogic = logic as BranchingLogic
    // Convert boolean to optionId: true = 'yes', false = 'no'
    const optionId = response ? 'yes' : 'no'
    return evaluateChoiceBranching(
      choiceLogic,
      { optionId } as SingleChoiceResponseValue,
      allResponses,
      allQuestions
    )
  }

  // Default: continue to next
  return 'next'
}
export function evaluateScreeningResult(
  questions: Array<StudyFlowQuestion> | Array<{
    id: string
    question_type: QuestionType
    branching_logic?: BranchingLogic | ScaleBranchingLogic | null
  }>,
  responses: Map<string, ResponseValue>
): 'passed' | 'rejected' {
  // Cast to StudyFlowQuestion[] for compound condition evaluation
  const allQuestions = questions as StudyFlowQuestion[]

  for (const question of questions) {
    const response = responses.get(question.id)
    const target = evaluateBranchingLogic(
      question.branching_logic,
      response,
      question.question_type,
      responses,    // Pass all responses for compound conditions
      allQuestions  // Pass all questions for compound conditions
    )

    if (target === 'reject') {
      return 'rejected'
    }

    // 'go_to_study' means skip remaining screening questions
    if (target === 'go_to_study') {
      return 'passed'
    }
  }

  return 'passed'
}
// Survey Branching Evaluation
// For survey questions with SurveyBranchingLogic and AdvancedCondition support
function areSurveyRuleConditionsSatisfied(
  rule: SurveyBranchingRule,
  allResponses: Map<string, ResponseValue>,
  allQuestions: StudyFlowQuestion[]
): boolean {
  // No conditions = always satisfied (backward compatible)
  if (!rule.conditions || rule.conditions.length === 0) {
    return true
  }

  // Convert AdvancedCondition[] to ScreeningCondition[] for evaluation
  const screeningConditions = advancedConditionsToScreening(rule.conditions)

  // If no conditions could be converted, treat as satisfied (graceful fallback)
  if (screeningConditions.length === 0) {
    return true
  }

  // matchAll defaults to true (AND logic)
  const matchAll = rule.matchAll !== false
  return evaluateConditions(screeningConditions, matchAll, allResponses, allQuestions)
}
export function evaluateSurveyBranching(
  logic: SurveyBranchingLogic | null | undefined,
  response: SingleChoiceResponseValue | MultiChoiceResponseValue | undefined,
  allResponses?: Map<string, ResponseValue>,
  allQuestions?: StudyFlowQuestion[]
): { target: SurveyBranchTarget; targetId?: string } {
  // No logic or no response = continue
  if (!logic || !response) {
    return { target: 'continue' }
  }

  const { rules, defaultTarget, defaultTargetId } = logic
  const responses = allResponses ?? new Map()
  const questions = allQuestions ?? []

  // For single choice (radio/dropdown)
  if ('optionId' in response) {
    // Find matching rule AND check compound conditions
    const matchingRule = rules.find((r) => {
      if (r.optionId !== response.optionId) return false
      // Check compound conditions if present
      return areSurveyRuleConditionsSatisfied(r, responses, questions)
    })

    if (matchingRule) {
      return { target: matchingRule.target, targetId: matchingRule.targetId }
    }
    return { target: defaultTarget, targetId: defaultTargetId }
  }

  // For multi choice (checkbox)
  if ('optionIds' in response) {
    // Priority order for survey branching: end_survey > skip_to_section > skip_to_question > continue
    const targetPriority: SurveyBranchTarget[] = [
      'end_survey',
      'skip_to_section',
      'skip_to_question',
      'continue',
    ]

    for (const priority of targetPriority) {
      const matchingRule = rules.find((r) => {
        if (!response.optionIds.includes(r.optionId)) return false
        if (r.target !== priority) return false
        // Check compound conditions if present
        return areSurveyRuleConditionsSatisfied(r, responses, questions)
      })
      if (matchingRule) {
        return { target: matchingRule.target, targetId: matchingRule.targetId }
      }
    }

    return { target: defaultTarget, targetId: defaultTargetId }
  }

  return { target: defaultTarget, targetId: defaultTargetId }
}
// Unified Survey Branching Evaluation
// Handles all survey branching logic types including enhanced branching
export function evaluateUnifiedSurveyBranching(
  logic: SurveyBranchingLogicUnion | null | undefined,
  response: QuestionResponse | undefined,
  allResponses?: Map<string, QuestionResponse>,
  allQuestions?: StudyFlowQuestion[]
): { target: SurveyBranchTarget; targetId?: string } {
  // No logic = continue
  if (!logic) {
    return { target: 'continue' }
  }

  // Check for enhanced branching logic first
  if (isEnhancedBranchingLogic(logic)) {
    return evaluateEnhancedBranching(logic, response)
  }

  // Check for type field to determine logic variant
  if ('type' in logic) {
    switch (logic.type) {
      case 'numeric': {
        // Numeric branching (NPS, Likert, etc.)
        if (!response) return { target: logic.defaultTarget, targetId: logic.defaultTargetId }

        const numValue = typeof response.value === 'number'
          ? response.value
          : (typeof response.value === 'object' && response.value !== null && 'value' in response.value)
            ? (response.value as { value: number }).value
            : null

        if (numValue === null) return { target: logic.defaultTarget, targetId: logic.defaultTargetId }

        // Evaluate rules in order
        for (const rule of logic.rules) {
          let matches = false
          switch (rule.comparison) {
            case 'equals':
              matches = numValue === rule.value
              break
            case 'less_than':
              matches = numValue < rule.value
              break
            case 'greater_than':
              matches = numValue > rule.value
              break
            case 'less_than_or_equals':
              matches = numValue <= rule.value
              break
            case 'greater_than_or_equals':
              matches = numValue >= rule.value
              break
          }
          if (matches) {
            return { target: rule.target, targetId: rule.targetId }
          }
        }
        return { target: logic.defaultTarget, targetId: logic.defaultTargetId }
      }

      case 'text': {
        // Text branching (is_answered / is_empty)
        if (!response) {
          // No response - check for is_empty rule
          const emptyRule = logic.rules.find(r => r.condition === 'is_empty')
          if (emptyRule) {
            return { target: emptyRule.target, targetId: emptyRule.targetId }
          }
          return { target: logic.defaultTarget, targetId: logic.defaultTargetId }
        }

        // Has response - find is_answered rule
        const answeredRule = logic.rules.find(r => r.condition === 'is_answered')
        if (answeredRule) {
          return { target: answeredRule.target, targetId: answeredRule.targetId }
        }
        return { target: logic.defaultTarget, targetId: logic.defaultTargetId }
      }

      case 'grouped': {
        // Grouped checkbox branching
        if (!response) return { target: logic.defaultTarget, targetId: logic.defaultTargetId }

        const selectedIds = (typeof response.value === 'object' && response.value !== null && 'optionIds' in response.value)
          ? (response.value as { optionIds: string[] }).optionIds
          : []

        // Check groups first
        for (const group of logic.groups) {
          const selectedInGroup = group.optionIds.filter(id => selectedIds.includes(id))
          const matches = group.matchMode === 'any'
            ? selectedInGroup.length > 0
            : selectedInGroup.length === group.optionIds.length

          if (matches) {
            return { target: group.target, targetId: group.targetId }
          }
        }

        // Check individual rules
        for (const rule of logic.individualRules) {
          if (selectedIds.includes(rule.optionId)) {
            return { target: rule.target, targetId: rule.targetId }
          }
        }

        return { target: logic.defaultTarget, targetId: logic.defaultTargetId }
      }
    }
  }

  // Default: legacy SurveyBranchingLogic (choice-based)
  if (!response) return { target: 'continue' }

  const choiceResponse = response.value as SingleChoiceResponseValue | MultiChoiceResponseValue | undefined
  if (!choiceResponse) return { target: 'continue' }

  // Convert to Map<string, ResponseValue> for legacy function
  const responsesMap = new Map<string, ResponseValue>()
  if (allResponses) {
    allResponses.forEach((r, key) => {
      responsesMap.set(key, r.value)
    })
  }

  return evaluateSurveyBranching(
    logic as SurveyBranchingLogic,
    choiceResponse,
    responsesMap,
    allQuestions
  )
}

// Re-export for convenience
export { evaluateEnhancedBranching, isEnhancedBranchingLogic }
