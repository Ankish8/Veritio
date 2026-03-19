import type { StudyFlowQuestion, SurveyCustomSection } from '../../supabase/study-flow-types'
import type { ValidationIssue, ValidationNavigationPath } from '../types'
import { createIssue, truncateText, findDuplicateLabels } from '../utils'

function validateCustomSections(
  sections: SurveyCustomSection[],
  surveyQuestions: StudyFlowQuestion[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'survey',
  }

  if (sections.length === 0) {
    return issues
  }

  const emptySections = sections.filter(s => !s.name || s.name.trim().length === 0)
  for (const section of emptySections) {
    issues.push(
      createIssue(
        'survey_content',
        'A section is missing a name',
        { ...navPath, questionId: section.id },
        { itemId: section.id, rule: 'empty-section-name' }
      )
    )
  }

  // Use findDuplicateLabels-style detection for section names
  const namedSections = sections.filter(s => s.name && s.name.trim().length > 0)
  const sectionItems = namedSections.map(s => ({ label: s.name, id: s.id }))
  const duplicates = findDuplicateLabels(sectionItems)
  for (const name of duplicates) {
    const originalSection = sections.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase())
    issues.push(
      createIssue(
        'survey_content',
        `Duplicate section name "${truncateText(originalSection?.name || name, 25)}"`,
        navPath,
        { rule: 'duplicate-section-name' }
      )
    )
  }

  for (const section of sections) {
    const questionsInSection = surveyQuestions.filter(q => q.custom_section_id === section.id)
    if (questionsInSection.length === 0) {
      issues.push(
        createIssue(
          'survey_content',
          `Section "${truncateText(section.name, 25)}" has no questions`,
          { ...navPath, questionId: section.id },
          { itemId: section.id, itemLabel: section.name, rule: 'empty-section' }
        )
      )
    }
  }

  return issues
}

export function validateSurveyContent(
  surveyQuestions: StudyFlowQuestion[],
  customSections?: SurveyCustomSection[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const navPath: ValidationNavigationPath = {
    tab: 'study-flow',
    sectionId: 'survey',
  }

  if (surveyQuestions.length === 0) {
    issues.push(
      createIssue(
        'survey_content',
        'At least one survey question is required',
        navPath,
        { rule: 'min-survey-questions' }
      )
    )
    return issues
  }

  if (customSections && customSections.length > 0) {
    issues.push(...validateCustomSections(customSections, surveyQuestions))
  }

  return issues
}
