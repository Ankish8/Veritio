import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlowStep, ResponseValue, StudyFlowResponseInsert } from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Import types and initial state
import {
  type StudyFlowPlayerState,
  type InitializeConfig,
  type QuestionResponse,
  initialState,
} from './types'

// Import utility functions
import {
  determineStartStep,
  findNextStep,
  findPreviousStep,
  isStepEnabled as checkStepEnabled,
  canProceed as checkCanProceed,
} from './navigation'

import {
  getQuestionsForStep,
  getVisibleQuestions as computeVisibleQuestions,
} from './display-logic'

import {
  evaluateRulesAfterAnswer as evaluateRules,
  loadRulesFromApi,
  buildRuleIndex,
} from './rules-engine'

import {
  isProgressiveMode as checkProgressiveMode,
  initializeProgressiveReveal as initReveal,
  revealQuestion as doRevealQuestion,
  revealNextQuestion as doRevealNextQuestion,
} from './progressive-reveal'

// =============================================================================
// HELPERS
// =============================================================================

/** Navigate to a step, resetting question index and timer */
function navigateToStep(
  set: (state: Partial<StudyFlowPlayerState>) => void,
  step: FlowStep
): void {
  set({ currentStep: step, currentQuestionIndex: 0, questionStartTime: null })
}

// =============================================================================
// STORE
// =============================================================================

export const useStudyFlowPlayerStore = create<StudyFlowPlayerState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // INITIALIZATION
      // =========================================================================

      initialize: (config: InitializeConfig) => {
        const {
          studyId, participantId, studyType, settings,
          screeningQuestions, preStudyQuestions, postStudyQuestions,
          branding, surveyQuestions, customSections, studyMeta, initialRules,
        } = config

        const startStep = determineStartStep(
          settings,
          studyType,
          screeningQuestions,
          preStudyQuestions,
          surveyQuestions || []
        )

        // Build rule index for O(1) lookup if rules are pre-loaded
        const rules = initialRules || []
        const ruleIndex = rules.length > 0 ? buildRuleIndex(rules) : null

        set({
          studyId,
          participantId,
          studyType,
          flowSettings: settings,
          screeningQuestions,
          preStudyQuestions,
          postStudyQuestions,
          surveyQuestions: surveyQuestions || [],
          customSections: customSections || [],
          studyMeta: studyMeta || null,
          branding: branding || null,
          currentStep: startStep,
          currentQuestionIndex: 0,
          responses: new Map(),
          participantIdentifier: null,
          identifierType: settings.participantIdentifier.type !== 'anonymous' ? settings.participantIdentifier.type : 'anonymous',
          agreedToTerms: false,
          screeningResult: null,
          activityComplete: false,
          questionStartTime: null,
          surveyRules: rules,
          ruleIndex,
          earlyEndConfig: null,
          skipTarget: null,
          skipSectionTarget: null,
          skipCustomSectionTarget: null,
          hiddenSections: new Set(),
          hiddenCustomSections: new Set(),
        })

        // Only load rules for survey studies if not pre-loaded
        if (studyType === 'survey' && !initialRules?.length) {
          get().loadRules(studyId)
        }
      },

      reset: () => set(initialState),

      restoreFromSaved: (currentStep, currentQuestionIndex, responses) => {
        const responsesMap = new Map<string, QuestionResponse>()
        for (const r of responses) {
          responsesMap.set(r.questionId, {
            questionId: r.questionId,
            value: r.value,
            timestamp: Date.now(),
          })
        }
        set({ currentStep, currentQuestionIndex, responses: responsesMap })
      },

      // =========================================================================
      // NAVIGATION
      // =========================================================================

      nextStep: () => {
        const { currentStep, studyType, screeningResult } = get()

        if (screeningResult === 'rejected') {
          set({ currentStep: 'rejected' })
          return
        }

        const nextStep = findNextStep(currentStep, studyType, get().isStepEnabled)
        navigateToStep(set, nextStep)
      },

      previousStep: () => {
        const { currentStep, studyType } = get()
        const prevStep = findPreviousStep(currentStep, studyType, get().isStepEnabled)
        if (prevStep) {
          navigateToStep(set, prevStep)
        }
      },

      goToStep: (step) => {
        navigateToStep(set, step)
      },

      // =========================================================================
      // QUESTION NAVIGATION
      // =========================================================================

      nextQuestion: () => {
        const { currentQuestionIndex } = get()
        const visibleQuestions = get().getVisibleQuestions()
        const currentQuestion = visibleQuestions[currentQuestionIndex]

        // Evaluate rules after answering
        if (currentQuestion) {
          get().evaluateRulesAfterAnswer(currentQuestion.id)
        }

        // Check if rules triggered an early end
        if (get().earlyEndConfig) return

        // Handle skip targets
        const { skipSectionTarget, skipCustomSectionTarget, skipTarget } = get()

        if (skipSectionTarget) {
          navigateToStep(set, skipSectionTarget.section)
          set({ skipSectionTarget: null })
          return
        }

        if (skipCustomSectionTarget) {
          const targetIndex = visibleQuestions.findIndex(
            q => q.custom_section_id === skipCustomSectionTarget.sectionId
          )
          if (targetIndex !== -1) {
            set({
              currentQuestionIndex: targetIndex,
              skipCustomSectionTarget: null,
              questionStartTime: null,
            })
            return
          }
          set({ skipCustomSectionTarget: null })
        }

        if (skipTarget) {
          const targetIndex = visibleQuestions.findIndex(q => q.id === skipTarget.questionId)
          if (targetIndex !== -1 && targetIndex > currentQuestionIndex) {
            set({
              currentQuestionIndex: targetIndex,
              skipTarget: null,
              questionStartTime: null,
            })
            return
          }
          set({ skipTarget: null })
        }

        if (currentQuestionIndex < visibleQuestions.length - 1) {
          set({ currentQuestionIndex: currentQuestionIndex + 1, questionStartTime: null })
        } else {
          get().nextStep()
        }
      },

      previousQuestion: () => {
        const { currentQuestionIndex } = get()
        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1, questionStartTime: null })
        } else {
          get().previousStep()
        }
      },

      // =========================================================================
      // ACTIONS
      // =========================================================================

      setResponse: (questionId, value) => {
        const { responses, questionStartTime } = get()
        const newResponses = new Map(responses)
        newResponses.set(questionId, {
          questionId,
          value,
          timestamp: Date.now(),
          timeSpentMs: questionStartTime ? Date.now() - questionStartTime : undefined,
        })
        set({ responses: newResponses })
      },

      setParticipantIdentifier: (value, type) => {
        set({ participantIdentifier: value, identifierType: type })
      },

      setSessionToken: (token) => {
        set({ sessionToken: token })
      },

      setParticipantDemographicData: (data) => {
        set({
          participantDemographicData: data,
          identifierType: 'demographic_profile',
          participantIdentifier: data.email || null,
        })
      },

      getScreeningResponses: () => Array.from(get().responses.values()),

      setAgreedToTerms: (agreed) => set({ agreedToTerms: agreed }),

      setScreeningResult: (result) => set({ screeningResult: result }),

      setActivityComplete: (complete) => set({ activityComplete: complete }),

      startQuestionTimer: () => set({ questionStartTime: Date.now() }),

      // =========================================================================
      // RULES ENGINE
      // =========================================================================

      loadRules: async (studyId) => {
        // Deduplication handled at module level in rules-engine.ts
        const rules = await loadRulesFromApi(studyId)
        // PERFORMANCE: Build index for O(1) rule lookup by question
        const ruleIndex = rules.length > 0 ? buildRuleIndex(rules) : null
        set({ surveyRules: rules, ruleIndex })
      },

      evaluateRulesAfterAnswer: (questionId) => {
        const state = get()
        const result = evaluateRules(questionId, {
          surveyRules: state.surveyRules,
          ruleIndex: state.ruleIndex, // PERFORMANCE: Use pre-built index for O(1) lookup
          responses: state.responses,
          screeningQuestions: state.screeningQuestions,
          preStudyQuestions: state.preStudyQuestions,
          surveyQuestions: state.surveyQuestions,
          postStudyQuestions: state.postStudyQuestions,
          customSections: state.customSections,
          hiddenSections: state.hiddenSections,
          hiddenCustomSections: state.hiddenCustomSections,
        })

        if (result.earlyEndConfig) {
          set({ earlyEndConfig: result.earlyEndConfig, currentStep: 'early_end' })
          return
        }

        set({
          skipTarget: result.skipTarget,
          skipSectionTarget: result.skipSectionTarget,
          skipCustomSectionTarget: result.skipCustomSectionTarget,
          hiddenSections: result.hiddenSections,
          hiddenCustomSections: result.hiddenCustomSections,
        })
      },

      // =========================================================================
      // PROGRESSIVE REVEAL
      // =========================================================================

      isProgressiveMode: () => {
        const { flowSettings, studyType } = get()
        return checkProgressiveMode(flowSettings, studyType)
      },

      initializeProgressiveReveal: () => {
        const visibleQuestions = get().getVisibleQuestions()
        const state = initReveal(visibleQuestions)
        set({
          revealedQuestionIds: state.revealedQuestionIds,
          activeQuestionId: state.activeQuestionId,
        })
      },

      revealQuestion: (questionId) => {
        const { revealedQuestionIds, activeQuestionId } = get()
        const state = doRevealQuestion({ revealedQuestionIds, activeQuestionId }, questionId)
        set({
          revealedQuestionIds: state.revealedQuestionIds,
          activeQuestionId: state.activeQuestionId,
        })
      },

      revealNextQuestion: () => {
        const { revealedQuestionIds, activeQuestionId } = get()
        const visibleQuestions = get().getVisibleQuestions()
        const state = doRevealNextQuestion({ revealedQuestionIds, activeQuestionId }, visibleQuestions)
        set({
          revealedQuestionIds: state.revealedQuestionIds,
          activeQuestionId: state.activeQuestionId,
        })
      },

      setActiveQuestion: (questionId) => set({ activeQuestionId: questionId }),

      // =========================================================================
      // SELECTORS
      // =========================================================================

      getCurrentQuestions: () => {
        const { currentStep, screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions } = get()
        return getQuestionsForStep(currentStep, screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions)
      },

      getVisibleQuestions: () => {
        const { responses, hiddenCustomSections } = get()
        const questions = get().getCurrentQuestions()
        return computeVisibleQuestions(questions, responses, hiddenCustomSections)
      },

      getCurrentQuestion: () => {
        const { currentQuestionIndex } = get()
        const visibleQuestions = get().getVisibleQuestions()
        return visibleQuestions[currentQuestionIndex] ?? null
      },

      getResponse: (questionId) => get().responses.get(questionId)?.value,

      isStepEnabled: (step) => {
        const { flowSettings, screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions, studyType, hiddenSections } = get()
        return checkStepEnabled(
          step,
          flowSettings,
          screeningQuestions,
          preStudyQuestions,
          postStudyQuestions,
          surveyQuestions,
          studyType,
          hiddenSections
        )
      },

      canProceed: () => {
        const state = get()
        return checkCanProceed({
          currentStep: state.currentStep,
          agreedToTerms: state.agreedToTerms,
          participantDemographicData: state.participantDemographicData,
          flowSettings: state.flowSettings,
          responses: state.responses,
          currentQuestionIndex: state.currentQuestionIndex,
          activityComplete: state.activityComplete,
          getVisibleQuestions: state.getVisibleQuestions,
        })
      },

      getResponsesForSubmission: (): StudyFlowResponseInsert[] => {
        const { studyId, participantId, responses } = get()
        if (!studyId || !participantId) return []

        return Array.from(responses.values()).map(r => ({
          study_id: studyId,
          participant_id: participantId,
          question_id: r.questionId,
          response_value: r.value,
          response_time_ms: r.timeSpentMs,
        }))
      },
    }),
    {
      name: 'study-flow-player',
      // FRAGILE ORDERING: partialize serializes Map -> Array, merge deserializes
      // Array -> Map. These must stay in sync -- if partialize changes the
      // `responses` shape, merge must be updated to match (and vice versa).
      partialize: (state) => ({
        studyId: state.studyId,
        participantId: state.participantId,
        studyType: state.studyType,
        currentStep: state.currentStep,
        currentQuestionIndex: state.currentQuestionIndex,
        responses: Array.from(state.responses.entries()),
        participantIdentifier: state.participantIdentifier,
        identifierType: state.identifierType,
        agreedToTerms: state.agreedToTerms,
        screeningResult: state.screeningResult,
        activityComplete: state.activityComplete,
      }),
      merge: (persisted: unknown, current) => ({
        ...current,
        ...(persisted as Partial<StudyFlowPlayerState>),
        studyType: (persisted as { studyType?: StudyFlowPlayerState['studyType'] })?.studyType ?? current.studyType,
        responses: new Map((persisted as { responses?: [string, QuestionResponse][] })?.responses ?? []),
      }),
      // SSR-safe hydration: skip automatic hydration, trigger manually on client
      skipHydration: true,
    }
  )
)

// PERFORMANCE: Defer hydration to avoid blocking initial render
// Previously this ran synchronously at module load, blocking LCP for 10+ seconds
// Now we use requestIdleCallback to rehydrate when the browser is idle
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for non-blocking hydration, with setTimeout fallback
  const scheduleHydration = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
  scheduleHydration(() => {
    useStudyFlowPlayerStore.persist.rehydrate()
  })
}

// Re-export types for convenience
export type { StudyFlowPlayerState, InitializeConfig, QuestionResponse, StudyMeta } from './types'
export type { SurveyCustomSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Re-export selectors (granular subscriptions to monolithic store)
export {
  // Context
  useCurrentStep,
  useFlowSettings,
  useBranding,
  useStudyMeta,
  useStudyId,
  useParticipantId,
  useSessionToken,
  useStudyType,
  // Navigation
  useCurrentQuestionIndex,
  useQuestionStartTime,
  // Responses
  useResponses,
  useScreeningResult,
  useActivityComplete,
  useAgreedToTerms,
  useParticipantIdentifier,
  useIdentifierType,
  // Rules
  useSurveyRules,
  useEarlyEndConfig,
  useRuleIndex,
  useHiddenSections,
  useHiddenCustomSections,
  // Progressive reveal
  useRevealedQuestionIds,
  useActiveQuestionId,
  // Actions (stable references)
  usePlayerActions,
  // Computed
  useCanProceed,
  useCurrentQuestion,
  useVisibleQuestions,
  useAllQuestionsForPiping,
  useResponsesForPiping,
} from './selectors'

// =============================================================================
// DUAL STORE ARCHITECTURE
// =============================================================================
//
// SOURCE OF TRUTH: The monolithic useStudyFlowPlayerStore above is currently
// the source of truth. Most consumers still depend on it.
//
// SPLIT STORES (below) are domain-specific stores intended to eventually
// replace the monolith. They are NOT synchronized with the monolith --
// each operates independently. Do NOT mix reads from both in the same
// component, as they will diverge.
//
// Split stores provide granular subscriptions per domain:
// - usePlayerContextStore: Study configuration and metadata
// - usePlayerNavigationStore: Current position in the flow
// - usePlayerResponsesStore: Participant data and responses
// - usePlayerRulesStore: Survey rules engine state
// - usePlayerProgressiveStore: Progressive question reveal
//
// MIGRATION PATH:
// 1. New components should use the split stores via initializePlayerStores()
// 2. Existing components continue using useStudyFlowPlayerStore (unchanged)
// 3. Once all consumers are migrated, delete the monolithic store
// 4. The compatibility layer (usePlayerStoreCompat) bridges the two APIs
//
// @example
// // Instead of:
// const { currentStep, responses } = useStudyFlowPlayerStore()
//
// // Use:
// import { useCurrentStep } from './stores'
// import { useResponses } from './stores'
// const currentStep = useCurrentStep()
// const responses = useResponses()

export {
  // Context Store (direct access to split store)
  usePlayerContextStore,
  useQuestionsForSection,
  type PlayerContextState,
  type PlayerContextConfig,

  // Navigation Store (direct access to split store)
  usePlayerNavigationStore,
  useIsFirstQuestion,
  type PlayerNavigationState,

  // Responses Store (direct access to split store)
  usePlayerResponsesStore,
  useHasResponse,
  useResponseCount,
  type PlayerResponsesState,
  type IdentifierType,

  // Rules Store (direct access to split store)
  usePlayerRulesStore,
  useSkipTarget,
  useSkipSectionTarget,
  useIsSectionHidden,
  useIsCustomSectionHidden,
  useHasEarlyEnd,
  type PlayerRulesState,

  // Progressive Store (direct access to split store)
  usePlayerProgressiveStore,
  useIsQuestionRevealed,
  useIsActiveQuestion,
  useRevealedCount,
  type PlayerProgressiveState,

  // Compatibility Layer
  initializePlayerStores,
  resetPlayerStores,
  usePlayerStoreCompat,
} from './stores'
