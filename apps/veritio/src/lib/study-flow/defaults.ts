// =============================================================================
// STUDY FLOW DEFAULT SETTINGS
// Provides sensible defaults for all study flow configuration sections.
// Sub-module structure:
//   defaults/factory.ts           - makePredefinedField helper
//   defaults/demographic-fields.ts - 32 predefined demographic fields
//   defaults/demographic-options.ts - dropdown option lists
//   defaults/section-defaults.ts   - per-section default configs
// =============================================================================

import type { StudyFlowSettings } from '../supabase/study-flow-types'

// Re-export everything from sub-modules for backward compatibility
export {
  makePredefinedField,
  createDefaultDemographicFields,
  defaultDemographicOptions,
  defaultWelcomeSettings,
  defaultParticipantAgreementSettings,
  defaultScreeningSettings,
  defaultParticipantIdentifierSettings,
  defaultPreStudyQuestionsSettings,
  defaultActivityInstructionsSettings,
  defaultPostStudyQuestionsSettings,
  defaultSurveyQuestionnaireSettings,
  defaultPaginationSettings,
  defaultTaskFeedbackSettings,
  defaultThankYouSettings,
  defaultClosedStudySettings,
  defaultStudyFlowSettings,
  OLD_CARD_SORT_DEFAULTS,
} from './defaults/index'

import {
  defaultWelcomeSettings,
  defaultParticipantAgreementSettings,
  defaultScreeningSettings,
  defaultParticipantIdentifierSettings,
  defaultPreStudyQuestionsSettings,
  defaultActivityInstructionsSettings,
  defaultPostStudyQuestionsSettings,
  defaultSurveyQuestionnaireSettings,
  defaultPaginationSettings,
  defaultThankYouSettings,
  defaultClosedStudySettings,
  defaultStudyFlowSettings,
} from './defaults/index'

/** Strip empty-string values so they don't override defaults during merge */
function stripEmpty<T extends object>(obj: T | undefined): Partial<T> {
  if (!obj) return {}
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '')
  ) as Partial<T>
}

/**
 * Creates a copy of default settings with optional overrides.
 * Useful for initializing new studies with customizations.
 */
export function createStudyFlowSettings(
  overrides?: Partial<StudyFlowSettings>
): StudyFlowSettings {
  if (!overrides) {
    return { ...defaultStudyFlowSettings }
  }

  // Handle legacy pageMode migration
  let paginationOverride = overrides.pagination
  if (!paginationOverride && overrides.surveyQuestionnaire?.pageMode) {
    paginationOverride = {
      mode: overrides.surveyQuestionnaire.pageMode === 'all_on_one' ? 'progressive' : 'one_per_page',
    }
  }

  return {
    ...defaultStudyFlowSettings,
    ...overrides,
    // Deep merge each section -- stripEmpty prevents '' from overriding defaults.
    // Note: participantIdentifier intentionally does NOT use stripEmpty because
    // empty strings in nested demographic profile options are meaningful.
    welcome: { ...defaultWelcomeSettings, ...stripEmpty(overrides.welcome) },
    participantAgreement: { ...defaultParticipantAgreementSettings, ...stripEmpty(overrides.participantAgreement) },
    screening: { ...defaultScreeningSettings, ...stripEmpty(overrides.screening) },
    participantIdentifier: { ...defaultParticipantIdentifierSettings, ...overrides.participantIdentifier },
    preStudyQuestions: { ...defaultPreStudyQuestionsSettings, ...stripEmpty(overrides.preStudyQuestions) },
    activityInstructions: { ...defaultActivityInstructionsSettings, ...stripEmpty(overrides.activityInstructions) },
    postStudyQuestions: { ...defaultPostStudyQuestionsSettings, ...stripEmpty(overrides.postStudyQuestions) },
    surveyQuestionnaire: { ...defaultSurveyQuestionnaireSettings, ...stripEmpty(overrides.surveyQuestionnaire) },
    thankYou: { ...defaultThankYouSettings, ...stripEmpty(overrides.thankYou) },
    closedStudy: { ...defaultClosedStudySettings, ...stripEmpty(overrides.closedStudy) },
    pagination: { ...defaultPaginationSettings, ...paginationOverride },
  }
}

// =============================================================================
// STUDY-TYPE INSTRUCTION DEFAULTS
// Single source of truth: @veritio/study-flow package
// Imported for local use (migrateToStudyFlowSettings) and re-exported
// =============================================================================
import {
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
} from '@veritio/study-flow'

export {
  cardSortInstructions,
  treeTestInstructions,
  prototypeTestInstructions,
  firstClickInstructions,
  firstImpressionInstructions,
  liveWebsiteTestInstructions,
}

// Lookup table for study-type instruction defaults
const studyTypeInstructions: Record<string, { part1: string; part2?: string }> = {
  tree_test: treeTestInstructions,
  card_sort: { part1: cardSortInstructions.open.part1, part2: cardSortInstructions.open.part2 },
  prototype_test: prototypeTestInstructions,
  first_click: firstClickInstructions,
  first_impression: firstImpressionInstructions,
  live_website_test: liveWebsiteTestInstructions,
}

/**
 * Migrates legacy welcome/thank you messages to new study flow format.
 * Used for backward compatibility with existing studies.
 * Also applies study-type-specific instruction defaults.
 */
export function migrateToStudyFlowSettings(
  welcomeMessage?: string | null,
  thankYouMessage?: string | null,
  existingSettings?: Partial<StudyFlowSettings>,
  studyType?: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
): StudyFlowSettings {
  const settings = createStudyFlowSettings(existingSettings)

  // Migrate welcome message if it exists and settings don't have custom welcome
  if (welcomeMessage && !existingSettings?.welcome?.message) {
    settings.welcome.message = welcomeMessage
    settings.welcome.enabled = true
  }

  // Migrate thank you message if it exists and settings don't have custom thank you
  if (thankYouMessage && !existingSettings?.thankYou?.message) {
    settings.thankYou.message = thankYouMessage
    settings.thankYou.enabled = true
  }

  // Apply study-type-specific instruction defaults if not already customized
  if (!existingSettings?.activityInstructions?.part1 && studyType) {
    const instructions = studyTypeInstructions[studyType]
    if (instructions) {
      settings.activityInstructions.enabled = true
      settings.activityInstructions.part1 = instructions.part1
      settings.activityInstructions.part2 = instructions.part2
    }
  }

  // For activity-based study types, always ensure instructions are enabled
  if (studyType && studyType !== 'survey') {
    settings.activityInstructions.enabled = true
  }

  return settings
}
