/**
 * Split Player Stores
 *
 * Domain-specific stores that replace the monolithic useStudyFlowPlayerStore.
 * Each store manages a single concern:
 *
 * - Context Store: Study configuration and metadata
 * - Navigation Store: Current position in the flow
 * - Responses Store: Participant data and responses
 * - Rules Store: Survey rules engine state
 * - Progressive Store: Progressive question reveal
 *
 * @example
 * // Before (monolithic - all consumers re-render on any change)
 * const { currentStep, responses, surveyRules } = useStudyFlowPlayerStore()
 *
 * // After (granular - only re-render when specific state changes)
 * const currentStep = useCurrentStep()
 * const responses = useResponses()
 * const surveyRules = useSurveyRules()
 */

// Context Store
export {
  usePlayerContextStore,
  useStudyId,
  useParticipantId,
  useStudyType,
  useFlowSettings,
  useStudyMeta,
  useBranding,
  useQuestionsForSection,
  type PlayerContextState,
  type PlayerContextConfig,
  type StudyType,
} from './context-store'

// Navigation Store
export {
  usePlayerNavigationStore,
  useCurrentStep,
  useCurrentQuestionIndex,
  useQuestionStartTime,
  useIsFirstQuestion,
  type PlayerNavigationState,
} from './navigation-store'

// Responses Store
export {
  usePlayerResponsesStore,
  useResponses,
  useParticipantIdentifier,
  useIdentifierType,
  useAgreedToTerms,
  useScreeningResult,
  useActivityComplete,
  useHasResponse,
  useResponseCount,
  type PlayerResponsesState,
  type IdentifierType,
  type ScreeningResult,
} from './responses-store'

// Rules Store
export {
  usePlayerRulesStore,
  useSurveyRules,
  useRuleIndex,
  useEarlyEndConfig,
  useSkipTarget,
  useSkipSectionTarget,
  useHiddenSections,
  useHiddenCustomSections,
  useIsSectionHidden,
  useIsCustomSectionHidden,
  useHasEarlyEnd,
  type PlayerRulesState,
  type SkipTarget,
  type SkipSectionTarget,
  type SkipCustomSectionTarget,
} from './rules-store'

// Progressive Store
export {
  usePlayerProgressiveStore,
  useRevealedQuestionIds,
  useActiveQuestionId,
  useIsQuestionRevealed,
  useIsActiveQuestion,
  useRevealedCount,
  type PlayerProgressiveState,
} from './progressive-store'

// Compatibility Layer
export {
  initializePlayerStores,
  resetPlayerStores,
  usePlayerStoreCompat,
} from './compatibility'
