import type { FlowSection, StudyFlowQuestion, ResponseValue } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SurveyRule, EndSurveyAction } from '../../lib/supabase/survey-rules-types'
import type { QuestionResponse, SurveyCustomSection } from './types'
import { evaluateAllRules } from '../../lib/study-flow/rules-engine'
export interface RuleIndex {
  byTriggerQuestion: Map<string, SurveyRule[]>
  byConditionQuestion: Map<string, SurveyRule[]>
  globalOnAnswer: SurveyRule[]
}

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

export function buildRuleIndex(rules: SurveyRule[]): RuleIndex {
  const byTriggerQuestion = new Map<string, SurveyRule[]>()
  const byConditionQuestion = new Map<string, SurveyRule[]>()
  const globalOnAnswer: SurveyRule[] = []

  for (const rule of rules) {
    if (!rule.is_enabled) continue

    if (rule.trigger_type === 'on_question') {
      const config = rule.trigger_config as { questionId: string }
      if (config.questionId) {
        const existing = byTriggerQuestion.get(config.questionId) || []
        existing.push(rule)
        byTriggerQuestion.set(config.questionId, existing)
      }
    } else if (rule.trigger_type === 'on_answer') {
      const conditionQuestionIds = extractConditionQuestionIds(rule)

      if (conditionQuestionIds.size > 0) {
        for (const qId of conditionQuestionIds) {
          const existing = byConditionQuestion.get(qId) || []
          existing.push(rule)
          byConditionQuestion.set(qId, existing)
        }
      } else {
        globalOnAnswer.push(rule)
      }
    }
  }

  return { byTriggerQuestion, byConditionQuestion, globalOnAnswer }
}

export function getRulesForQuestion(
  questionId: string,
  index: RuleIndex | null,
  allRules: SurveyRule[]
): SurveyRule[] {
  if (!index) {
    return allRules.filter(r => r.is_enabled)
  }

  const relevantRules = new Map<string, SurveyRule>()

  const triggerRules = index.byTriggerQuestion.get(questionId) || []
  for (const rule of triggerRules) {
    relevantRules.set(rule.id, rule)
  }

  const conditionRules = index.byConditionQuestion.get(questionId) || []
  for (const rule of conditionRules) {
    relevantRules.set(rule.id, rule)
  }

  for (const rule of index.globalOnAnswer) {
    relevantRules.set(rule.id, rule)
  }

  // Return sorted by position for consistent evaluation order
  return Array.from(relevantRules.values()).sort((a, b) => a.position - b.position)
}

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

  const defaultResult: RulesEvaluationResult = {
    earlyEndConfig: null,
    skipTarget: null,
    skipSectionTarget: null,
    skipCustomSectionTarget: null,
    hiddenSections: new Set(hiddenSections),
    hiddenCustomSections: new Set(hiddenCustomSections),
  }

  if (surveyRules.length === 0) {
    return defaultResult
  }

  const relevantRules = getRulesForQuestion(questionId, ruleIndex || null, surveyRules)

  if (relevantRules.length === 0) {
    return defaultResult
  }

  const allQuestions = [
    ...screeningQuestions,
    ...preStudyQuestions,
    ...surveyQuestions,
    ...postStudyQuestions,
  ]

  const responsesMap = new Map<string, ResponseValue>()
  responses.forEach((resp, key) => {
    responsesMap.set(key, resp.value)
  })

  const currentQuestion = allQuestions.find(q => q.id === questionId)
  const currentSection: FlowSection = currentQuestion?.section || 'survey'
  const currentCustomSectionId = currentQuestion?.custom_section_id || null

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

  // Pass pre-filtered rules directly, bypassing filterRulesByTrigger in evaluateAllRules
  const result = evaluateAllRules(relevantRules, [], evalContext, 'on_answer', { questionId })

  const newHiddenSections = new Set(hiddenSections)
  const newHiddenCustomSections = new Set(hiddenCustomSections)

  for (const section of result.sectionsToShow) {
    newHiddenSections.delete(section)
  }

  for (const section of result.sectionsToHide) {
    newHiddenSections.add(section)
  }

  for (const sectionId of result.customSectionsToShow) {
    newHiddenCustomSections.delete(sectionId)
  }

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
const rulesCache = new Map<string, { promise: Promise<SurveyRule[]>; timestamp: number }>()
const CACHE_TTL = 5000

export async function loadRulesFromApi(studyId: string): Promise<SurveyRule[]> {
  const cached = rulesCache.get(studyId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.promise
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/studies/${studyId}/rules`)
      if (res.ok) {
        const rules = await res.json()
        return Array.isArray(rules) ? rules : []
      }
    } catch {
      // Non-critical — continue without rules
    }
    return []
  })()

  rulesCache.set(studyId, { promise, timestamp: Date.now() })
  return promise
}
