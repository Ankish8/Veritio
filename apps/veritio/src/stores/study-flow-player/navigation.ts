import type { FlowStep, FlowSection, StudyFlowSettings, StudyFlowQuestion } from '@veritio/study-types/study-flow-types'
import { getStepOrder } from './types'

// =============================================================================
// STEP NAVIGATION
// =============================================================================

/**
 * Determines the starting step based on flow settings.
 */
export function determineStartStep(
  settings: StudyFlowSettings,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test',
  screeningQuestions: StudyFlowQuestion[],
  preStudyQuestions: StudyFlowQuestion[],
  surveyQuestions: StudyFlowQuestion[]
): FlowStep {
  if (settings.welcome.enabled) {
    return 'welcome'
  }

  if (settings.participantAgreement.enabled) {
    return 'agreement'
  }

  if (settings.screening.enabled && screeningQuestions.length > 0) {
    return 'screening'
  }

  if (settings.participantIdentifier.type !== 'anonymous') {
    return 'identifier'
  }

  if (studyType === 'survey') {
    return (surveyQuestions && surveyQuestions.length > 0) ? 'survey' : 'thank_you'
  }

  // Card sort / Tree test
  if (settings.preStudyQuestions.enabled && preStudyQuestions.length > 0) {
    return 'pre_study'
  }

  if (settings.activityInstructions.enabled) {
    return 'instructions'
  }

  return 'activity'
}

/**
 * Finds the next enabled step in the flow.
 */
export function findNextStep(
  currentStep: FlowStep,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null,
  isStepEnabled: (step: FlowStep) => boolean
): FlowStep {
  const stepOrder = getStepOrder(studyType)
  const currentIndex = stepOrder.indexOf(currentStep)

  if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
    return 'thank_you'
  }

  // Find next enabled step
  for (let i = currentIndex + 1; i < stepOrder.length; i++) {
    const candidateStep = stepOrder[i]
    const enabled = isStepEnabled(candidateStep)
    if (enabled) {
      return candidateStep
    }
  }

  return 'thank_you'
}

/**
 * Finds the previous enabled step in the flow.
 */
export function findPreviousStep(
  currentStep: FlowStep,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null,
  isStepEnabled: (step: FlowStep) => boolean
): FlowStep | null {
  const stepOrder = getStepOrder(studyType)
  const currentIndex = stepOrder.indexOf(currentStep)

  if (currentIndex <= 0) {
    return null
  }

  // Find previous enabled step
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevStep = stepOrder[i]
    if (isStepEnabled(prevStep)) {
      return prevStep
    }
  }

  return null
}

// =============================================================================
// STEP ENABLED LOGIC
// =============================================================================

/**
 * Determines if a step is enabled based on settings, questions, and rules.
 */
export function isStepEnabled(
  step: FlowStep,
  flowSettings: StudyFlowSettings,
  screeningQuestions: StudyFlowQuestion[],
  preStudyQuestions: StudyFlowQuestion[],
  postStudyQuestions: StudyFlowQuestion[],
  surveyQuestions: StudyFlowQuestion[],
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null,
  hiddenSections: Set<FlowSection>
): boolean {
  switch (step) {
    case 'welcome':
      return flowSettings.welcome.enabled

    case 'agreement':
      return flowSettings.participantAgreement.enabled

    case 'screening':
      return flowSettings.screening.enabled &&
        screeningQuestions.length > 0 &&
        !hiddenSections.has('screening')

    case 'identifier':
      return flowSettings.participantIdentifier.type !== 'anonymous'

    case 'pre_study':
      return studyType !== 'survey' &&
        flowSettings.preStudyQuestions.enabled &&
        preStudyQuestions.length > 0 &&
        !hiddenSections.has('pre_study')

    case 'instructions':
      // Always show instructions for tree_test/card_sort
      if (studyType === 'tree_test' || studyType === 'card_sort') {
        return true
      }
      return studyType !== 'survey' && flowSettings.activityInstructions.enabled

    case 'activity':
      return studyType !== 'survey'

    case 'post_study':
      return studyType !== 'survey' &&
        flowSettings.postStudyQuestions.enabled &&
        postStudyQuestions.length > 0 &&
        !hiddenSections.has('post_study')

    case 'survey':
      return studyType === 'survey' &&
        surveyQuestions.length > 0 &&
        !hiddenSections.has('survey')

    case 'thank_you':
      return flowSettings.thankYou.enabled

    case 'rejected':
    case 'closed':
    case 'early_end':
      return true // Always available as targets

    default:
      return false
  }
}

// =============================================================================
// CAN PROCEED LOGIC
// =============================================================================

interface CanProceedContext {
  currentStep: FlowStep
  agreedToTerms: boolean
  participantDemographicData: object | null
  flowSettings: StudyFlowSettings
  responses: Map<string, { value: unknown }>
  currentQuestionIndex: number
  activityComplete: boolean
  getVisibleQuestions: () => StudyFlowQuestion[]
}

/**
 * Determines if the user can proceed from the current step.
 */
export function canProceed(context: CanProceedContext): boolean {
  const {
    currentStep,
    agreedToTerms,
    participantDemographicData,
    flowSettings,
    responses,
    currentQuestionIndex,
    activityComplete,
    getVisibleQuestions,
  } = context

  switch (currentStep) {
    case 'welcome':
      return true

    case 'agreement':
      return agreedToTerms

    case 'identifier':
      if (flowSettings.participantIdentifier.type === 'anonymous') return true
      if (flowSettings.participantIdentifier.type === 'demographic_profile') {
        return !!participantDemographicData && Object.keys(participantDemographicData).length > 0
      }
      return true

    case 'screening':
    case 'pre_study':
    case 'post_study':
    case 'survey': {
      const visibleQuestions = getVisibleQuestions()
      const currentQ = visibleQuestions[currentQuestionIndex]

      if (!currentQ) return true // No question, can proceed
      if (currentQ.is_required === false) return true

      const response = responses.get(currentQ.id)
      if (!response) return false

      const val = response.value
      if (val === undefined || val === null) return false
      if (typeof val === 'string' && val.trim() === '') return false
      if (Array.isArray(val) && val.length === 0) return false
      if (typeof val === 'object' && 'optionIds' in val && Array.isArray((val as { optionIds: string[] }).optionIds) && (val as { optionIds: string[] }).optionIds.length === 0) return false
      if (typeof val === 'object' && 'optionId' in val && !(val as { optionId: string }).optionId) return false

      return true
    }

    case 'instructions':
      return true

    case 'activity':
      return activityComplete

    case 'thank_you':
      return true

    default:
      return true
  }
}
