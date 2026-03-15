import type {
  StudyFlowSettings,
  StudyFlowQuestion,
  ParticipantAgreementSettings,
  ParticipantIdentifierSettings,
  ScreeningSettings,
  QuestionsSectionSettings,
  ActivityInstructionsSettings,
  ThankYouSettings,
  WelcomeSettings,
  BranchingLogic,
} from '../supabase/study-flow-types'
import type { ValidationIssue, ValidationNavigationPath } from './types'
import { createIssue, isHtmlEmpty } from './utils'

export function validateWelcomeSection(
  settings: WelcomeSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'welcome',
  }

  if (isHtmlEmpty(settings.title)) {
    issues.push(
      createIssue(
        'welcome',
        'Welcome title is empty',
        navPath,
        { rule: 'empty-welcome-title' }
      )
    )
  }

  if (isHtmlEmpty(settings.message)) {
    issues.push(
      createIssue(
        'welcome',
        'Welcome message is empty',
        navPath,
        { rule: 'empty-welcome-message' }
      )
    )
  }

  return issues
}

export function validateAgreementSection(
  settings: ParticipantAgreementSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!settings.enabled) return issues

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'agreement',
  }

  if (isHtmlEmpty(settings.agreementText)) {
    issues.push(
      createIssue(
        'agreement',
        'Agreement text is empty',
        navPath,
        { rule: 'empty-agreement-text' }
      )
    )
  }

  return issues
}

// Screening questions only support multiple_choice and yes_no (standard BranchingLogic)
function hasRejectionTarget(question: StudyFlowQuestion): boolean {
  const branching = question.branching_logic as BranchingLogic | null

  if (!branching || !branching.rules) return false

  const hasRejectionRule = branching.rules.some(
    (rule) => rule.target === 'reject'
  )

  return hasRejectionRule || branching.defaultTarget === 'reject'
}

export function validateScreeningSection(
  settings: ScreeningSettings,
  questions: StudyFlowQuestion[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!settings.enabled) return issues

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'screening',
  }

  if (questions.length === 0) {
    issues.push(
      createIssue(
        'screening',
        'At least one screening question is required',
        navPath,
        { rule: 'min-questions' }
      )
    )
    return issues
  }

  const hasAnyRejection = questions.some(hasRejectionTarget)
  if (!hasAnyRejection) {
    issues.push(
      createIssue(
        'screening',
        'Requires at least one rejection option',
        { ...navPath, questionId: questions[0]?.id },
        { rule: 'no-rejection-path' }
      )
    )
  }

  return issues
}

export function validateIdentifierSection(
  settings: ParticipantIdentifierSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'identifier',
  }

  if (settings.type === 'anonymous') {
    return issues
  }

  if (settings.type === 'demographic_profile') {
    const demographicProfile = settings.demographicProfile

    if (!demographicProfile) {
      issues.push(
        createIssue(
          'identifier',
          'Demographic profile configuration is missing',
          navPath,
          { rule: 'missing-demographic-profile' }
        )
      )
      return issues
    }

    if (!demographicProfile.sections || demographicProfile.sections.length === 0) {
      issues.push(
        createIssue(
          'identifier',
          'At least one demographic section is required',
          navPath,
          { rule: 'no-sections' }
        )
      )
      return issues
    }

    const hasEnabledFields = demographicProfile.sections.some(section =>
      section.fields && section.fields.some(field => field.enabled)
    )

    if (!hasEnabledFields) {
      issues.push(
        createIssue(
          'identifier',
          'At least one demographic field must be enabled',
          navPath,
          { rule: 'no-enabled-fields' }
        )
      )
    }

    demographicProfile.sections.forEach(section => {
      const enabledFields = section.fields?.filter(f => f.enabled) || []

      if (enabledFields.length > 0) {
        if (section.id.startsWith('custom-section-') && !section.title && !section.name) {
          issues.push(
            createIssue(
              'identifier',
              'Custom section is missing a title',
              navPath,
              { rule: 'custom-section-no-title' }
            )
          )
        }

        enabledFields.forEach(field => {
          if (field.type === 'custom' && !field.questionText) {
            issues.push(
              createIssue(
                'identifier',
                'Custom field is missing question text',
                navPath,
                { rule: 'custom-field-no-question' }
              )
            )
          }
        })
      }
    })
  }

  return issues
}

export function validateQuestionsSectionSettings(
  sectionId: 'pre_study' | 'post_study',
  settings: QuestionsSectionSettings,
  questions: StudyFlowQuestion[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!settings.enabled) return issues

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId,
    questionId: 'intro',
  }

  if (settings.showIntro) {
    if (isHtmlEmpty(settings.introTitle)) {
      issues.push(
        createIssue(
          sectionId,
          'Intro title is empty',
          navPath,
          { rule: 'empty-intro-title' }
        )
      )
    }

    if (isHtmlEmpty(settings.introMessage)) {
      issues.push(
        createIssue(
          sectionId,
          'Intro message is empty',
          navPath,
          { rule: 'empty-intro-message' }
        )
      )
    }
  }

  if (questions.length === 0) {
    issues.push(
      createIssue(
        sectionId,
        'At least one question is required when section is enabled',
        { ...navPath, questionId: null },
        { rule: 'min-questions' }
      )
    )
  }

  return issues
}

export function validateInstructionsSection(
  settings: ActivityInstructionsSettings,
  _studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'instructions',
  }

  if (isHtmlEmpty(settings.part1)) {
    issues.push(
      createIssue(
        'instructions',
        'Activity instructions (Part 1) cannot be empty',
        navPath,
        { rule: 'empty-instructions-part1' }
      )
    )
  }

  return issues
}

export function validateThankYouSection(
  settings: ThankYouSettings
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'thank_you',
  }

  if (isHtmlEmpty(settings.message)) {
    issues.push(
      createIssue(
        'thank_you',
        'Thank you message cannot be empty',
        navPath,
        { rule: 'empty-thank-you-message' }
      )
    )
  }

  return issues
}

export function validateFlowSettings(
  flowSettings: StudyFlowSettings,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test',
  screeningQuestions: StudyFlowQuestion[],
  preStudyQuestions: StudyFlowQuestion[],
  postStudyQuestions: StudyFlowQuestion[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  issues.push(...validateWelcomeSection(flowSettings.welcome))
  issues.push(...validateAgreementSection(flowSettings.participantAgreement))
  issues.push(...validateScreeningSection(flowSettings.screening, screeningQuestions))
  issues.push(...validateIdentifierSection(flowSettings.participantIdentifier))

  if (studyType !== 'survey') {
    issues.push(...validateQuestionsSectionSettings('pre_study', flowSettings.preStudyQuestions, preStudyQuestions))
    issues.push(...validateInstructionsSection(flowSettings.activityInstructions, studyType))
    issues.push(...validateQuestionsSectionSettings('post_study', flowSettings.postStudyQuestions, postStudyQuestions))
  }

  issues.push(...validateThankYouSection(flowSettings.thankYou))

  return issues
}
