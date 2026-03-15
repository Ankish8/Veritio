import type { FlowSection, StudyFlowQuestion, ResponseValue } from '@veritio/study-types/study-flow-types'
import type { SurveyRule, EndSurveyAction } from '@/lib/supabase/survey-rules-types'
import type { QuestionResponse, SurveyCustomSection } from './types'
import { evaluateAllRules } from '@/lib/study-flow/rules-engine'
import { evaluateUnifiedSurveyBranching } from '@veritio/prototype-test/lib/study-flow/branching-logic-evaluator'

// =============================================================================
// RULE INDEXING (Performance Optimization)
// =============================================================================

/**
 * Index structure for quick rule lookup by question ID.
 * Instead of evaluating ALL rules on every answer (O(n)),
 * we can find relevant rules in O(1) using this index.
 */
export interface RuleIndex {
  /** Rules triggered by specific question answers (trigger_type: 'on_question') */
  byTriggerQuestion: Map<string, SurveyRule[]>
  /** Rules whose conditions reference specific questions (trigger_type: 'on_answer') */
  byConditionQuestion: Map<string, SurveyRule[]>
  /** Rules with 'on_answer' trigger that have no question-specific conditions (must always evaluate) */
  globalOnAnswer: SurveyRule[]
}

/**
 * Extract all question IDs referenced in a rule's conditions.
 * This includes questions in condition sources and trigger configs.
 */
function extractConditionQuestionIds(rule: SurveyRule): Set<string> {
  const questionIds = new Set<string>()

  for (const group of rule.conditions.groups) {
    for (const condition of group.conditions) {
      if (condition.source.type === 'question' && condition.source.questionId) {
        questionIds.add(condition.source.questionId)
      }
    }
  }

  return questionIds
}

/**
 * Build an index of rules by the questions they depend on.
 * This enables O(1) lookup instead of O(n) iteration on each answer.
 */
export function buildRuleIndex(rules: SurveyRule[]): RuleIndex {
  const byTriggerQuestion = new Map<string, SurveyRule[]>()
  const byConditionQuestion = new Map<string, SurveyRule[]>()
  const globalOnAnswer: SurveyRule[] = []

  for (const rule of rules) {
    if (!rule.is_enabled) continue

    if (rule.trigger_type === 'on_question') {
      // Rules triggered by specific question
      const config = rule.trigger_config as { questionId: string }
      if (config.questionId) {
        const existing = byTriggerQuestion.get(config.questionId) || []
        existing.push(rule)
        byTriggerQuestion.set(config.questionId, existing)
      }
    } else if (rule.trigger_type === 'on_answer') {
      // Rules triggered on any answer - index by conditions
      const conditionQuestionIds = extractConditionQuestionIds(rule)

      if (conditionQuestionIds.size > 0) {
        // Rule has question-specific conditions
        for (const qId of conditionQuestionIds) {
          const existing = byConditionQuestion.get(qId) || []
          existing.push(rule)
          byConditionQuestion.set(qId, existing)
        }
      } else {
        // Rule has no question-specific conditions (e.g., variable-based)
        // Must evaluate on every answer
        globalOnAnswer.push(rule)
      }
    }
    // on_section_complete rules are not indexed by question
  }

  return { byTriggerQuestion, byConditionQuestion, globalOnAnswer }
}

/**
 * Get rules relevant to a specific question being answered.
 * This is the core optimization - instead of filtering all rules,
 * we do O(1) map lookups.
 */
export function getRulesForQuestion(
  questionId: string,
  index: RuleIndex | null,
  allRules: SurveyRule[]
): SurveyRule[] {
  // Fallback to all rules if no index
  if (!index) {
    return allRules.filter(r => r.is_enabled)
  }

  // Collect relevant rules using the index
  const relevantRules = new Map<string, SurveyRule>() // Use Map for deduplication

  // 1. Rules with trigger_type: 'on_question' for this question
  const triggerRules = index.byTriggerQuestion.get(questionId) || []
  for (const rule of triggerRules) {
    relevantRules.set(rule.id, rule)
  }

  // 2. Rules with trigger_type: 'on_answer' whose conditions reference this question
  const conditionRules = index.byConditionQuestion.get(questionId) || []
  for (const rule of conditionRules) {
    relevantRules.set(rule.id, rule)
  }

  // 3. Global 'on_answer' rules (no question-specific conditions)
  for (const rule of index.globalOnAnswer) {
    relevantRules.set(rule.id, rule)
  }

  // Return sorted by position for consistent evaluation order
  return Array.from(relevantRules.values()).sort((a, b) => a.position - b.position)
}

// =============================================================================
// TYPES
// =============================================================================

export interface RulesEvaluationResult {
  earlyEndConfig: EndSurveyAction['config'] | null
  skipTarget: { questionId: string } | null
  skipSectionTarget: { section: FlowSection } | null
  skipCustomSectionTarget: { sectionId: string } | null
  hiddenSections: Set<FlowSection>
  hiddenCustomSections: Set<string>
}

interface RulesContext {
  surveyRules: SurveyRule[]
  /** Pre-built index for O(1) rule lookup (optional, falls back to all rules) */
  ruleIndex?: RuleIndex | null
  responses: Map<string, QuestionResponse>
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]
  hiddenSections: Set<FlowSection>
  hiddenCustomSections: Set<string>
}

// =============================================================================
// INLINE BRANCHING EVALUATION
// =============================================================================

/**
 * Evaluates inline branching logic (survey_branching_logic) for a question.
 * This runs BEFORE the rules engine and handles simple per-question branching.
 *
 * @returns Partial result with skip targets if branching logic triggers navigation
 */
function evaluateInlineBranching(
  question: StudyFlowQuestion,
  responses: Map<string, QuestionResponse>,
  allQuestions: StudyFlowQuestion[]
): Partial<RulesEvaluationResult> {
  // Check if question has inline branching configured
  if (!question.survey_branching_logic) {
    return {}
  }

  // Get the response for this question
  const response = responses.get(question.id)

  // Evaluate the branching logic
  const result = evaluateUnifiedSurveyBranching(
    question.survey_branching_logic,
    response,
    responses,
    allQuestions
  )

  // Convert result to skip targets
  switch (result.target) {
    case 'continue':
      return {} // No skip, continue normally

    case 'end_survey':
      return {
        earlyEndConfig: {
          title: 'Survey Complete',
          message: 'Thank you for your responses.',
        },
      }

    case 'skip_to_question':
      return {
        skipTarget: result.targetId ? { questionId: result.targetId } : null,
      }

    case 'skip_to_section':
      return {
        skipCustomSectionTarget: result.targetId ? { sectionId: result.targetId } : null,
      }

    default:
      return {}
  }
}

// =============================================================================
// RULES EVALUATION
// =============================================================================

/**
 * Evaluates all rules after a question is answered.
 * Returns updated state for skip targets and hidden sections.
 *
 * Now includes inline branching evaluation before running the rules engine.
 */
export function evaluateRulesAfterAnswer(
  questionId: string,
  context: RulesContext
): RulesEvaluationResult {
  const {
    surveyRules,
    ruleIndex,
    responses,
    screeningQuestions,
    preStudyQuestions,
    surveyQuestions,
    postStudyQuestions,
    customSections,
    hiddenSections,
    hiddenCustomSections,
  } = context

  // Default result - no changes
  const defaultResult: RulesEvaluationResult = {
    earlyEndConfig: null,
    skipTarget: null,
    skipSectionTarget: null,
    skipCustomSectionTarget: null,
    hiddenSections: new Set(hiddenSections),
    hiddenCustomSections: new Set(hiddenCustomSections),
  }

  // Build all questions list for evaluation
  const allQuestions = [
    ...screeningQuestions,
    ...preStudyQuestions,
    ...surveyQuestions,
    ...postStudyQuestions,
  ]

  // Find the current question
  const currentQuestion = allQuestions.find(q => q.id === questionId)

  // =========================================================================
  // STEP 1: Evaluate inline branching first (takes priority)
  // =========================================================================
  if (currentQuestion) {
    const inlineBranchingResult = evaluateInlineBranching(currentQuestion, responses, allQuestions)

    // If inline branching triggers navigation, return immediately (highest priority)
    if (inlineBranchingResult.earlyEndConfig || inlineBranchingResult.skipTarget || inlineBranchingResult.skipCustomSectionTarget) {
      return {
        ...defaultResult,
        ...inlineBranchingResult,
      }
    }
  }

  // =========================================================================
  // STEP 2: Evaluate rules engine (if inline branching didn't trigger)
  // =========================================================================
  if (surveyRules.length === 0) {
    return defaultResult
  }

  // Get only rules relevant to this question (O(1) lookup with index)
  // Without index, falls back to all enabled rules
  const relevantRules = getRulesForQuestion(questionId, ruleIndex || null, surveyRules)

  if (relevantRules.length === 0) {
    return defaultResult
  }

  // Convert responses to Map<string, ResponseValue> for evaluation
  const responsesMap = new Map<string, ResponseValue>()
  responses.forEach((resp, key) => {
    responsesMap.set(key, resp.value)
  })

  // Determine current section from question (currentQuestion already found above)
  const currentSection: FlowSection = currentQuestion?.section || 'survey'
  const currentCustomSectionId = currentQuestion?.custom_section_id || null

  // Determine which custom sections are complete
  const completedCustomSections = new Set<string>()
  customSections.forEach(section => {
    const sectionQuestions = surveyQuestions.filter(q => q.custom_section_id === section.id)
    if (sectionQuestions.length > 0 && sectionQuestions.every(q => responses.has(q.id))) {
      completedCustomSections.add(section.id)
    }
  })

  const evalContext = {
    responses: responsesMap,
    variables: new Map<string, number | string>(),
    completedSections: new Set<FlowSection>(),
    completedCustomSections,
    currentSection,
    currentQuestionId: questionId,
    lastAnsweredQuestionId: questionId,
    currentCustomSectionId,
  }

  // Evaluate only relevant rules (optimized)
  // Note: We pass the filtered rules directly, bypassing filterRulesByTrigger in evaluateAllRules
  // since we've already done more precise filtering with our index
  const result = evaluateAllRules(relevantRules, [], evalContext, 'on_answer', { questionId })

  // Build result
  const newHiddenSections = new Set(hiddenSections)
  const newHiddenCustomSections = new Set(hiddenCustomSections)

  // Apply show rules (remove from hidden)
  for (const section of result.sectionsToShow) {
    newHiddenSections.delete(section)
  }

  // Apply hide rules (add to hidden)
  for (const section of result.sectionsToHide) {
    newHiddenSections.add(section)
  }

  // Apply custom section show rules
  for (const sectionId of result.customSectionsToShow) {
    newHiddenCustomSections.delete(sectionId)
  }

  // Apply custom section hide rules
  for (const sectionId of result.customSectionsToHide) {
    newHiddenCustomSections.add(sectionId)
  }

  return {
    earlyEndConfig: result.endSurvey || null,
    skipTarget: result.skipToQuestion ? { questionId: result.skipToQuestion.questionId } : null,
    skipSectionTarget: result.skipToSection ? { section: result.skipToSection } : null,
    skipCustomSectionTarget: result.skipToCustomSection ? { sectionId: result.skipToCustomSection.sectionId } : null,
    hiddenSections: newHiddenSections,
    hiddenCustomSections: newHiddenCustomSections,
  }
}

/**
 * Module-level cache to deduplicate rules API calls.
 * Prevents duplicate requests from React.StrictMode, hydration, etc.
 */
const rulesCache = new Map<string, { promise: Promise<SurveyRule[]>; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds - prevents duplicate calls during page load

/**
 * Loads rules from the API with request deduplication.
 */
export async function loadRulesFromApi(studyId: string): Promise<SurveyRule[]> {
  // Check for existing in-flight or recently cached request
  const cached = rulesCache.get(studyId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.promise
  }

  // Create new request and cache it
  const promise = (async () => {
    try {
      const res = await fetch(`/api/studies/${studyId}/rules`)
      if (res.ok) {
        const rules = await res.json()
        return Array.isArray(rules) ? rules : []
      }
    } catch {
      // Rules loading is non-critical, continue without them
    }
    return []
  })()

  rulesCache.set(studyId, { promise, timestamp: Date.now() })
  return promise
}
