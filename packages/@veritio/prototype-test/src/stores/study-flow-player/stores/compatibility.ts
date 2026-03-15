/**
 * Compatibility Layer for Split Player Stores
 *
 * This module provides a compatibility hook that combines all split stores
 * into a single interface matching the original useStudyFlowPlayerStore.
 *
 * MIGRATION STRATEGY:
 * 1. New components should import from './stores' directly for granular subscriptions
 * 2. Existing components can continue using useStudyFlowPlayerStore (unchanged)
 * 3. This compatibility layer enables gradual migration without breaking changes
 *
 * PERFORMANCE NOTE:
 * Using usePlayerStoreCompat() will subscribe to ALL split stores, causing
 * re-renders whenever ANY store changes. For better performance, use individual
 * store hooks directly.
 *
 * @example
 * // Gradual migration path:
 *
 * // Step 1: Component uses monolithic store (current)
 * const { currentStep, responses, setResponse } = useStudyFlowPlayerStore()
 *
 * // Step 2: Component uses compatibility layer (intermediate)
 * const { currentStep, responses, setResponse } = usePlayerStoreCompat()
 *
 * // Step 3: Component uses split stores (optimal)
 * const currentStep = useCurrentStep()
 * const responses = useResponses()
 * const setResponse = usePlayerResponsesStore((s) => s.setResponse)
 */

import type { FlowStep, ResponseValue, StudyFlowResponseInsert } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SurveyRule } from '../../../lib/supabase/survey-rules-types'
import type { QuestionResponse, StudyMeta } from '../types'
import {
  evaluateRulesAfterAnswer as evaluateRules,
} from '../rules-engine'
import {
  determineStartStep,
  findNextStep,
  findPreviousStep,
  isStepEnabled as checkStepEnabled,
  canProceed as checkCanProceed,
} from '../navigation'
import {
  getQuestionsForStep,
  getVisibleQuestions as computeVisibleQuestions,
} from '../display-logic'
import {
  isProgressiveMode as checkProgressiveMode,
  initializeProgressiveReveal as initReveal,
  revealQuestion as doRevealQuestion,
  revealNextQuestion as doRevealNextQuestion,
} from '../progressive-reveal'

// Import split stores
import { usePlayerContextStore, type PlayerContextConfig } from './context-store'
import { usePlayerNavigationStore } from './navigation-store'
import { usePlayerResponsesStore } from './responses-store'
import { usePlayerRulesStore } from './rules-store'
import { usePlayerProgressiveStore } from './progressive-store'
export function initializePlayerStores(
  config: PlayerContextConfig & {
    initialRules?: SurveyRule[]
  }
) {
  // 1. Initialize context store
  usePlayerContextStore.getState().initialize(config)

  // 2. Determine start step and initialize navigation
  const startStep = determineStartStep(
    config.flowSettings,
    config.studyType,
    config.screeningQuestions,
    config.preStudyQuestions,
    config.surveyQuestions || []
  )
  usePlayerNavigationStore.getState().setStep(startStep)

  // 3. Reset responses
  usePlayerResponsesStore.getState().reset()

  // 4. Initialize rules if provided
  if (config.initialRules?.length) {
    usePlayerRulesStore.getState().setRules(config.initialRules)
  } else if (config.studyType === 'survey') {
    // Load rules for survey studies
    usePlayerRulesStore.getState().loadRules(config.studyId)
  }

  // 5. Reset progressive reveal
  usePlayerProgressiveStore.getState().reset()
}
export function resetPlayerStores() {
  usePlayerContextStore.getState().reset()
  usePlayerNavigationStore.getState().reset()
  usePlayerResponsesStore.getState().reset()
  usePlayerRulesStore.getState().reset()
  usePlayerProgressiveStore.getState().reset()
}

/**
 * Compatibility hook that combines all split stores.
 *
 * WARNING: This causes re-renders on ANY store change.
 * For new components, use individual store hooks instead.
 *
 * @deprecated Use individual store hooks for better performance
 */
export function usePlayerStoreCompat() {
  // Subscribe to all stores (this is intentionally inefficient for compatibility)
  const context = usePlayerContextStore()
  const navigation = usePlayerNavigationStore()
  const responses = usePlayerResponsesStore()
  const rules = usePlayerRulesStore()
  const progressive = usePlayerProgressiveStore()

  // Build compatibility interface
  return {
    // === Context ===
    studyId: context.studyId,
    participantId: context.participantId,
    studyType: context.studyType,
    flowSettings: context.flowSettings,
    screeningQuestions: context.screeningQuestions,
    preStudyQuestions: context.preStudyQuestions,
    postStudyQuestions: context.postStudyQuestions,
    surveyQuestions: context.surveyQuestions,
    customSections: context.customSections,
    studyMeta: context.studyMeta,
    branding: context.branding,

    // === Navigation ===
    currentStep: navigation.currentStep,
    currentQuestionIndex: navigation.currentQuestionIndex,
    questionStartTime: navigation.questionStartTime,

    // === Responses ===
    responses: responses.responses,
    participantIdentifier: responses.participantIdentifier,
    identifierType: responses.identifierType,
    participantDemographicData: responses.participantDemographicData,
    agreedToTerms: responses.agreedToTerms,
    screeningResult: responses.screeningResult,
    activityComplete: responses.activityComplete,

    // === Rules ===
    surveyRules: rules.surveyRules,
    ruleIndex: rules.ruleIndex,
    earlyEndConfig: rules.earlyEndConfig,
    skipTarget: rules.skipTarget,
    skipSectionTarget: rules.skipSectionTarget,
    skipCustomSectionTarget: rules.skipCustomSectionTarget,
    hiddenSections: rules.hiddenSections,
    hiddenCustomSections: rules.hiddenCustomSections,

    // === Progressive ===
    revealedQuestionIds: progressive.revealedQuestionIds,
    activeQuestionId: progressive.activeQuestionId,

    // === Actions (delegating to split stores) ===
    setResponse: (questionId: string, value: ResponseValue) => {
      const timeSpentMs = navigation.questionStartTime
        ? Date.now() - navigation.questionStartTime
        : undefined
      responses.setResponse(questionId, value, timeSpentMs)
    },

    setParticipantIdentifier: responses.setParticipantIdentifier,
    setParticipantDemographicData: responses.setParticipantDemographicData,
    setAgreedToTerms: responses.setAgreedToTerms,
    setScreeningResult: responses.setScreeningResult,
    setActivityComplete: responses.setActivityComplete,
    startQuestionTimer: navigation.startQuestionTimer,
    getScreeningResponses: responses.getAllResponses,
    getResponse: responses.getResponse,

    goToStep: navigation.goToStep,
    loadRules: rules.loadRules,

    revealQuestion: progressive.revealQuestion,
    revealNextQuestion: () => {
      const visibleQuestions = computeVisibleQuestions(
        getQuestionsForStep(
          navigation.currentStep,
          context.screeningQuestions,
          context.preStudyQuestions,
          context.postStudyQuestions,
          context.surveyQuestions
        ),
        responses.responses,
        rules.hiddenCustomSections
      )
      const state = doRevealNextQuestion(
        {
          revealedQuestionIds: progressive.revealedQuestionIds,
          activeQuestionId: progressive.activeQuestionId,
        },
        visibleQuestions
      )
      if (state.activeQuestionId !== progressive.activeQuestionId) {
        progressive.setActiveQuestion(state.activeQuestionId)
      }
      // Reveal new questions
      for (const id of state.revealedQuestionIds) {
        if (!progressive.revealedQuestionIds.has(id)) {
          progressive.revealQuestion(id)
        }
      }
    },

    setActiveQuestion: progressive.setActiveQuestion,

    // === Computed Values ===
    getCurrentQuestions: () => {
      return getQuestionsForStep(
        navigation.currentStep,
        context.screeningQuestions,
        context.preStudyQuestions,
        context.postStudyQuestions,
        context.surveyQuestions
      )
    },

    getVisibleQuestions: () => {
      const questions = getQuestionsForStep(
        navigation.currentStep,
        context.screeningQuestions,
        context.preStudyQuestions,
        context.postStudyQuestions,
        context.surveyQuestions
      )
      return computeVisibleQuestions(questions, responses.responses, rules.hiddenCustomSections)
    },

    getCurrentQuestion: () => {
      const questions = getQuestionsForStep(
        navigation.currentStep,
        context.screeningQuestions,
        context.preStudyQuestions,
        context.postStudyQuestions,
        context.surveyQuestions
      )
      const visible = computeVisibleQuestions(questions, responses.responses, rules.hiddenCustomSections)
      return visible[navigation.currentQuestionIndex] ?? null
    },

    isStepEnabled: (step: FlowStep) => {
      return checkStepEnabled(
        step,
        context.flowSettings,
        context.screeningQuestions,
        context.preStudyQuestions,
        context.postStudyQuestions,
        context.surveyQuestions,
        context.studyType,
        rules.hiddenSections
      )
    },

    canProceed: () => {
      const visibleQuestions = computeVisibleQuestions(
        getQuestionsForStep(
          navigation.currentStep,
          context.screeningQuestions,
          context.preStudyQuestions,
          context.postStudyQuestions,
          context.surveyQuestions
        ),
        responses.responses,
        rules.hiddenCustomSections
      )
      return checkCanProceed({
        currentStep: navigation.currentStep,
        agreedToTerms: responses.agreedToTerms,
        participantDemographicData: responses.participantDemographicData,
        flowSettings: context.flowSettings,
        responses: responses.responses,
        currentQuestionIndex: navigation.currentQuestionIndex,
        activityComplete: responses.activityComplete,
        getVisibleQuestions: () => visibleQuestions,
      })
    },

    isProgressiveMode: () => {
      return checkProgressiveMode(context.flowSettings, context.studyType)
    },

    initializeProgressiveReveal: () => {
      const visibleQuestions = computeVisibleQuestions(
        getQuestionsForStep(
          navigation.currentStep,
          context.screeningQuestions,
          context.preStudyQuestions,
          context.postStudyQuestions,
          context.surveyQuestions
        ),
        responses.responses,
        rules.hiddenCustomSections
      )
      const state = initReveal(visibleQuestions)
      if (state.activeQuestionId) {
        progressive.initializeWithFirstQuestion(state.activeQuestionId)
      }
    },

    getResponsesForSubmission: (): StudyFlowResponseInsert[] => {
      if (!context.studyId || !context.participantId) return []
      return Array.from(responses.responses.values()).map((r) => ({
        study_id: context.studyId!,
        participant_id: context.participantId!,
        question_id: r.questionId,
        response_value: r.value,
        response_time_ms: r.timeSpentMs,
      }))
    },
  }
}
