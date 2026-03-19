import { useShallow } from 'zustand/shallow'
import { useStudyFlowPlayerStore } from './index'
import { canProceed as checkCanProceed } from './navigation'

// =============================================================================
// BASIC SELECTORS
// =============================================================================

// Context
export const useCurrentStep = () => useStudyFlowPlayerStore(s => s.currentStep)
export const useFlowSettings = () => useStudyFlowPlayerStore(s => s.flowSettings)
export const useBranding = () => useStudyFlowPlayerStore(s => s.branding)
export const useStudyMeta = () => useStudyFlowPlayerStore(s => s.studyMeta)
export const useStudyId = () => useStudyFlowPlayerStore(s => s.studyId)
export const useParticipantId = () => useStudyFlowPlayerStore(s => s.participantId)
export const useSessionToken = () => useStudyFlowPlayerStore(s => s.sessionToken)
export const useStudyType = () => useStudyFlowPlayerStore(s => s.studyType)

// Navigation
export const useCurrentQuestionIndex = () => useStudyFlowPlayerStore(s => s.currentQuestionIndex)
export const useQuestionStartTime = () => useStudyFlowPlayerStore(s => s.questionStartTime)

// Responses
export const useResponses = () => useStudyFlowPlayerStore(s => s.responses)
export const useScreeningResult = () => useStudyFlowPlayerStore(s => s.screeningResult)
export const useActivityComplete = () => useStudyFlowPlayerStore(s => s.activityComplete)
export const useAgreedToTerms = () => useStudyFlowPlayerStore(s => s.agreedToTerms)
export const useParticipantIdentifier = () => useStudyFlowPlayerStore(s => s.participantIdentifier)
export const useIdentifierType = () => useStudyFlowPlayerStore(s => s.identifierType)

// Rules
export const useSurveyRules = () => useStudyFlowPlayerStore(s => s.surveyRules)
export const useEarlyEndConfig = () => useStudyFlowPlayerStore(s => s.earlyEndConfig)
export const useRuleIndex = () => useStudyFlowPlayerStore(s => s.ruleIndex)
export const useHiddenSections = () => useStudyFlowPlayerStore(s => s.hiddenSections)
export const useHiddenCustomSections = () => useStudyFlowPlayerStore(s => s.hiddenCustomSections)

// Progressive reveal
export const useRevealedQuestionIds = () => useStudyFlowPlayerStore(s => s.revealedQuestionIds)
export const useActiveQuestionId = () => useStudyFlowPlayerStore(s => s.activeQuestionId)

// =============================================================================
// ACTION SELECTORS (stable references - only subscribe to actions, not state)
// =============================================================================

/**
 * Returns stable action references that never change.
 * Use this to get actions without causing re-renders.
 */
export const usePlayerActions = () => useStudyFlowPlayerStore(
  useShallow(s => ({
    // Initialization
    reset: s.reset,
    restoreFromSaved: s.restoreFromSaved,
    // Navigation
    nextStep: s.nextStep,
    previousStep: s.previousStep,
    goToStep: s.goToStep,
    nextQuestion: s.nextQuestion,
    previousQuestion: s.previousQuestion,
    // Responses
    setResponse: s.setResponse,
    getResponse: s.getResponse,
    setParticipantIdentifier: s.setParticipantIdentifier,
    setParticipantId: s.setParticipantId,
    setSessionToken: s.setSessionToken,
    setParticipantDemographicData: s.setParticipantDemographicData,
    setAgreedToTerms: s.setAgreedToTerms,
    setScreeningResult: s.setScreeningResult,
    setActivityComplete: s.setActivityComplete,
    getScreeningResponses: s.getScreeningResponses,
    getResponsesForSubmission: s.getResponsesForSubmission,
    // Timer
    startQuestionTimer: s.startQuestionTimer,
    // Progressive reveal
    initializeProgressiveReveal: s.initializeProgressiveReveal,
    revealQuestion: s.revealQuestion,
    revealNextQuestion: s.revealNextQuestion,
    setActiveQuestion: s.setActiveQuestion,
    // Rules
    evaluateRulesAfterAnswer: s.evaluateRulesAfterAnswer,
    // Computed
    getVisibleQuestions: s.getVisibleQuestions,
    getCurrentQuestion: s.getCurrentQuestion,
    getCurrentQuestions: s.getCurrentQuestions,
    canProceed: s.canProceed,
    isStepEnabled: s.isStepEnabled,
    isProgressiveMode: s.isProgressiveMode,
  }))
)

// =============================================================================
// COMPUTED SELECTORS
// =============================================================================

/**
 * Pure selector for canProceed. Reads all dependency fields directly so Zustand
 * tracks them as subscriptions and re-evaluates when any dependency changes.
 */
export const useCanProceed = () => useStudyFlowPlayerStore(s => {
  return checkCanProceed({
    currentStep: s.currentStep,
    agreedToTerms: s.agreedToTerms,
    participantDemographicData: s.participantDemographicData,
    flowSettings: s.flowSettings,
    responses: s.responses,
    currentQuestionIndex: s.currentQuestionIndex,
    activityComplete: s.activityComplete,
    getVisibleQuestions: s.getVisibleQuestions,
  })
})

export const useCurrentQuestion = () => useStudyFlowPlayerStore(s => s.getCurrentQuestion())

export const useVisibleQuestions = () => useStudyFlowPlayerStore(s => s.getVisibleQuestions())

// =============================================================================
// ANSWER PIPING SELECTORS
// =============================================================================

/**
 * Returns all questions from all sections (for piping reference lookup).
 * Uses useShallow to prevent infinite re-renders when array contents are the same.
 */
export const useAllQuestionsForPiping = () => useStudyFlowPlayerStore(
  useShallow(s => [
    ...s.screeningQuestions,
    ...s.preStudyQuestions,
    ...s.surveyQuestions,
    ...s.postStudyQuestions,
  ])
)

/**
 * Returns responses map for piping.
 * Components should memoize any transformations.
 */
export const useResponsesForPiping = () => useStudyFlowPlayerStore(
  useShallow(s => s.responses)
)
