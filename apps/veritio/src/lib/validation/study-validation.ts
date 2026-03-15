import type {
  StudyValidationInput,
  ValidationResult,
  ValidationIssue,
  ValidationSectionId,
} from './types'
import { validateFlowSettings } from './section-validators'
import { validateQuestionSection } from './question-validators'
import {
  validateCardSortContent,
  validateTreeTestContent,
  validateSurveyContent,
  validatePrototypeTestContent,
  validateFirstClickContent,
  validateFirstImpressionContent,
  validateLiveWebsiteContent,
} from './content-validators'
import { resetIssueCounter } from './utils'

export function validateStudy(input: StudyValidationInput): ValidationResult {
  resetIssueCounter()

  const issues: ValidationIssue[] = []

  issues.push(
    ...validateFlowSettings(
      input.flowSettings,
      input.studyType,
      input.screeningQuestions,
      input.preStudyQuestions,
      input.postStudyQuestions
    )
  )

  if (input.flowSettings.screening.enabled) {
    issues.push(...validateQuestionSection('screening', input.screeningQuestions, input.abTests))
  }

  if (input.flowSettings.preStudyQuestions.enabled) {
    issues.push(...validateQuestionSection('pre_study', input.preStudyQuestions, input.abTests))
  }

  if (input.flowSettings.postStudyQuestions.enabled) {
    issues.push(...validateQuestionSection('post_study', input.postStudyQuestions, input.abTests))
  }

  if (input.studyType === 'card_sort') {
    issues.push(
      ...validateCardSortContent(
        input.cards || [],
        input.categories || [],
        input.cardSortSettings || {
          mode: 'open',
          randomizeCards: true,
          randomizeCategories: false,
          allowSkip: false,
          showProgress: true,
        }
      )
    )
  } else if (input.studyType === 'tree_test') {
    issues.push(
      ...validateTreeTestContent(
        input.nodes || [],
        input.tasks || []
      )
    )
  } else if (input.studyType === 'survey') {
    issues.push(
      ...validateSurveyContent(input.surveyQuestions || [], input.customSections)
    )
    if ((input.surveyQuestions || []).length > 0) {
      issues.push(...validateQuestionSection('survey', input.surveyQuestions || [], input.abTests))
    }
  } else if (input.studyType === 'prototype_test') {
    issues.push(
      ...validatePrototypeTestContent(
        input.prototype || null,
        input.prototypeTasks || []
      )
    )
  } else if (input.studyType === 'first_click') {
    issues.push(
      ...validateFirstClickContent(input.firstClickTasks || [])
    )
  } else if (input.studyType === 'first_impression') {
    issues.push(
      ...validateFirstImpressionContent(input.firstImpressionDesigns || [])
    )
  } else if (input.studyType === 'live_website_test') {
    issues.push(
      ...validateLiveWebsiteContent(
        input.liveWebsiteTasks || [],
        input.liveWebsiteSettings || {
          websiteUrl: '',
          mode: 'url_only',
          snippetId: null,
          snippetVerified: false,
          recordScreen: true,
          recordWebcam: false,
          recordMicrophone: true,
          trackClickEvents: true,
          trackScrollDepth: true,
          allowMobile: false,
          allowSkipTasks: true,
          showTaskProgress: true,
          defaultTimeLimitSeconds: null,
          authInstructions: '',
          widgetPosition: 'bottom-right',
          blockBeforeStart: true,
        }
      )
    )
  }

  const bySection: Partial<Record<ValidationSectionId, ValidationIssue[]>> = {}
  for (const issue of issues) {
    if (!bySection[issue.section]) {
      bySection[issue.section] = []
    }
    bySection[issue.section]!.push(issue)
  }

  return {
    isValid: issues.length === 0,
    issues,
    bySection,
    issueCount: issues.length,
  }
}

export function hasValidationIssues(input: StudyValidationInput): boolean {
  return !validateStudy(input).isValid
}

export function getValidationIssueCount(input: StudyValidationInput): number {
  return validateStudy(input).issueCount
}
