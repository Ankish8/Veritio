import type {
  FlowStep,
  FlowSection,
  StudyFlowQuestion,
  StudyFlowSettings,
  ResponseValue,
  StudyFlowResponseInsert,
  SurveyCustomSection,
  ParticipantDemographicData,
} from '@veritio/study-types/study-flow-types'

// Re-export SurveyCustomSection for use in other store modules
export type { SurveyCustomSection }
import type { BrandingSettings } from '@/components/builders/shared/types'
import type { SurveyRule, EndSurveyAction } from '@/lib/supabase/survey-rules-types'
import { defaultStudyFlowSettings } from '@/lib/study-flow/defaults'
import type { RuleIndex } from './rules-engine'

// =============================================================================
// TYPES
// =============================================================================

export interface QuestionResponse {
  questionId: string
  value: ResponseValue
  timestamp: number
  timeSpentMs?: number
}

export interface StudyMeta {
  title: string
  description: string | null
  purpose: string | null
  participantRequirements: string | null
}

/** Configuration object for initializing the study flow player */
export interface InitializeConfig {
  studyId: string
  participantId: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  settings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  branding?: BrandingSettings | null
  surveyQuestions?: StudyFlowQuestion[]
  customSections?: SurveyCustomSection[]
  studyMeta?: StudyMeta | null
  /** Pre-loaded survey rules (eliminates client-side API call) */
  initialRules?: SurveyRule[]
}

export interface StudyFlowPlayerState {
  // Study context
  studyId: string | null
  participantId: string | null
  sessionToken: string | null  // For audio recording authentication
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null

  // Flow configuration
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]

  // Study meta (for welcome screen)
  studyMeta: StudyMeta | null

  // Branding (for UI customization)
  branding: BrandingSettings | null

  // Current state
  currentStep: FlowStep
  currentQuestionIndex: number
  questionStartTime: number | null

  // User data
  responses: Map<string, QuestionResponse>
  participantIdentifier: string | null
  identifierType: 'anonymous' | 'email' | 'custom' | 'demographic_profile' | null
  participantDemographicData: ParticipantDemographicData | null
  agreedToTerms: boolean
  screeningResult: 'passed' | 'rejected' | null

  // Activity status
  activityComplete: boolean

  // Custom sections (for survey studies)
  customSections: SurveyCustomSection[]

  // Rules engine state
  surveyRules: SurveyRule[]
  /** Pre-built index for O(1) rule lookup by question ID */
  ruleIndex: RuleIndex | null
  earlyEndConfig: EndSurveyAction['config'] | null
  skipTarget: { questionId: string } | null
  skipSectionTarget: { section: FlowSection } | null
  skipCustomSectionTarget: { sectionId: string } | null
  hiddenSections: Set<FlowSection>
  hiddenCustomSections: Set<string>

  // Progressive reveal state
  revealedQuestionIds: Set<string>
  activeQuestionId: string | null

  // Actions
  restoreFromSaved: (
    currentStep: FlowStep,
    currentQuestionIndex: number,
    responses: Array<{ questionId: string; value: ResponseValue }>
  ) => void
  initialize: (config: InitializeConfig) => void
  reset: () => void

  // Navigation
  nextStep: () => void
  previousStep: () => void
  goToStep: (step: FlowStep) => void

  // Question navigation
  nextQuestion: () => void
  previousQuestion: () => void

  // Actions
  setResponse: (questionId: string, value: ResponseValue) => void
  setParticipantIdentifier: (value: string, type: 'email' | 'custom') => void
  setSessionToken: (token: string) => void  // For audio recording authentication
  setParticipantId: (id: string) => void  // Sync participant ID from session hook
  setParticipantDemographicData: (data: ParticipantDemographicData) => void
  getScreeningResponses: () => QuestionResponse[]
  setAgreedToTerms: (agreed: boolean) => void
  setScreeningResult: (result: 'passed' | 'rejected') => void
  setActivityComplete: (complete: boolean) => void
  startQuestionTimer: () => void

  // Rules engine actions
  loadRules: (studyId: string) => Promise<void>
  evaluateRulesAfterAnswer: (questionId: string) => void

  // Progressive reveal actions
  revealQuestion: (questionId: string) => void
  revealNextQuestion: () => void
  setActiveQuestion: (questionId: string | null) => void
  initializeProgressiveReveal: () => void
  isProgressiveMode: () => boolean

  // Selectors
  getCurrentQuestions: () => StudyFlowQuestion[]
  getVisibleQuestions: () => StudyFlowQuestion[]
  getCurrentQuestion: () => StudyFlowQuestion | null
  getResponse: (questionId: string) => ResponseValue | undefined
  isStepEnabled: (step: FlowStep) => boolean
  canProceed: () => boolean
  getResponsesForSubmission: () => StudyFlowResponseInsert[]
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialState = {
  studyId: null,
  participantId: null,
  sessionToken: null,
  studyType: null,
  flowSettings: defaultStudyFlowSettings,
  screeningQuestions: [],
  preStudyQuestions: [],
  postStudyQuestions: [],
  surveyQuestions: [] as StudyFlowQuestion[],
  customSections: [] as SurveyCustomSection[],
  studyMeta: null as StudyMeta | null,
  branding: null as BrandingSettings | null,
  currentStep: 'welcome' as FlowStep,
  currentQuestionIndex: 0,
  questionStartTime: null,
  responses: new Map<string, QuestionResponse>(),
  participantIdentifier: null,
  identifierType: null,
  participantDemographicData: null,
  agreedToTerms: false,
  screeningResult: null,
  activityComplete: false,
  surveyRules: [] as SurveyRule[],
  ruleIndex: null as RuleIndex | null,
  earlyEndConfig: null as EndSurveyAction['config'] | null,
  skipTarget: null as { questionId: string } | null,
  skipSectionTarget: null as { section: FlowSection } | null,
  skipCustomSectionTarget: null as { sectionId: string } | null,
  hiddenSections: new Set<FlowSection>(),
  hiddenCustomSections: new Set<string>(),
  revealedQuestionIds: new Set<string>(),
  activeQuestionId: null as string | null,
}

// =============================================================================
// STEP ORDER
// =============================================================================

/**
 * The canonical order of steps in the flow for card sort and tree test.
 * Not all steps are always enabled - we skip disabled ones.
 */
export const ACTIVITY_STEP_ORDER: FlowStep[] = [
  'welcome',
  'agreement',
  'screening',
  'identifier',
  'pre_study',
  'instructions',
  'activity',
  'post_study',
  'thank_you',
]

/**
 * The canonical order of steps for survey studies.
 * Survey has 'survey' step instead of pre_study/instructions/activity/post_study.
 */
export const SURVEY_STEP_ORDER: FlowStep[] = [
  'welcome',
  'agreement',
  'screening',
  'identifier',
  'survey',
  'thank_you',
]

/**
 * Get the step order based on study type
 */
export function getStepOrder(studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null): FlowStep[] {
  if (studyType === 'survey') return SURVEY_STEP_ORDER
  return ACTIVITY_STEP_ORDER
}
