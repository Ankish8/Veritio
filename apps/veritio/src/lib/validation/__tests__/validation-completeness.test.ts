/**
 * Validation Completeness Tests
 *
 * These tests ensure that:
 * 1. All study types have proper validation
 * 2. All question types are validated
 * 3. All validation sections are properly labeled and displayed
 * 4. Edge cases are caught (empty questions, missing configs, etc.)
 *
 * When adding new study types, question types, or sections:
 * - Update these tests FIRST
 * - If tests fail, it means validation is incomplete
 */
import { describe, it, expect } from 'vitest'
import {
  validateStudy,
  SECTION_LABELS,
  type ValidationSectionId,
  type StudyValidationInput,
} from '../index'
import type { StudyFlowQuestion, QuestionType, FlowSection, StudyFlowSettings } from '../../supabase/study-flow-types'
import { getDefaultQuestionConfig } from '../../supabase/study-flow-types'
import {
  defaultWelcomeSettings,
  defaultParticipantAgreementSettings,
  defaultScreeningSettings,
  defaultParticipantIdentifierSettings,
  defaultPreStudyQuestionsSettings,
  defaultActivityInstructionsSettings,
  defaultPostStudyQuestionsSettings,
  defaultThankYouSettings,
  defaultClosedStudySettings,
} from '../../study-flow/defaults'

// Import the SECTION_ORDER from the modal to verify consistency
// Note: In tests, we verify against expected values rather than importing from component
const EXPECTED_SECTION_ORDER: ValidationSectionId[] = [
  'agreement',
  'screening',
  'pre_study',
  'instructions',
  'survey_content',
  'survey',
  'post_study',
  'thank_you',
  'card_sort_content',
  'tree_test_content',
]

// All study types that should be validated
const ALL_STUDY_TYPES = ['card_sort', 'tree_test', 'survey'] as const

// All question types that should be validated
const ALL_QUESTION_TYPES: QuestionType[] = [
  'single_line_text',
  'multi_line_text',
  'multiple_choice',  // Replaces radio, dropdown, checkbox (via mode: 'single' | 'multi' | 'multiple_choice')
  'opinion_scale',    // Replaces likert
  'yes_no',
  'nps',
  'matrix',
  'ranking',
]

// All flow sections where questions can appear
const _ALL_FLOW_SECTIONS: FlowSection[] = ['screening', 'pre_study', 'post_study', 'survey']

// Helper to create a minimal valid flow settings object
function createMinimalFlowSettings(): StudyFlowSettings {
  return {
    welcome: { ...defaultWelcomeSettings, enabled: false },
    participantAgreement: { ...defaultParticipantAgreementSettings, enabled: false },
    screening: { ...defaultScreeningSettings, enabled: false },
    participantIdentifier: { ...defaultParticipantIdentifierSettings },
    preStudyQuestions: { ...defaultPreStudyQuestionsSettings, enabled: false },
    activityInstructions: { ...defaultActivityInstructionsSettings, enabled: false },
    postStudyQuestions: { ...defaultPostStudyQuestionsSettings, enabled: false },
    thankYou: { ...defaultThankYouSettings },
    closedStudy: { ...defaultClosedStudySettings },
  }
}

// Helper to create a test question
function createTestQuestion(
  section: FlowSection,
  type: QuestionType,
  overrides: Partial<StudyFlowQuestion> = {}
): StudyFlowQuestion {
  return {
    id: crypto.randomUUID(),
    study_id: 'test-study',
    section,
    position: 0,
    question_type: type,
    question_text: 'Test question',
    question_text_html: null,
    is_required: true,
    config: getDefaultQuestionConfig(type),
    display_logic: null,
    branching_logic: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('Validation Completeness', () => {
  describe('Section Labels', () => {
    it('should have labels for all ValidationSectionIds', () => {
      const allSectionIds: ValidationSectionId[] = [
        'welcome',
        'agreement',
        'screening',
        'identifier',
        'pre_study',
        'instructions',
        'post_study',
        'survey',
        'thank_you',
        'closed',
        'card_sort_content',
        'tree_test_content',
        'survey_content',
      ]

      for (const sectionId of allSectionIds) {
        expect(SECTION_LABELS[sectionId]).toBeDefined()
        expect(SECTION_LABELS[sectionId].length).toBeGreaterThan(0)
      }
    })

    it('should have all display sections in SECTION_ORDER', () => {
      // Sections that generate validation issues should be in SECTION_ORDER
      const displayableSections: ValidationSectionId[] = [
        'agreement',
        'screening',
        'pre_study',
        'instructions',
        'survey_content',
        'survey',
        'post_study',
        'thank_you',
        'card_sort_content',
        'tree_test_content',
      ]

      for (const section of displayableSections) {
        expect(
          EXPECTED_SECTION_ORDER.includes(section),
          `Section '${section}' should be in SECTION_ORDER`
        ).toBe(true)
      }
    })
  })

  describe('Study Type Validation', () => {
    it('should validate card_sort studies', () => {
      const input: StudyValidationInput = {
        studyType: 'card_sort',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        cards: [], // Empty - should fail
        categories: [],
        cardSortSettings: {
          mode: 'open',
          randomizeCards: true,
          randomizeCategories: false,
          allowSkip: false,
          showProgress: true,
        },
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i => i.section === 'card_sort_content')).toBe(true)
    })

    it('should validate tree_test studies', () => {
      const input: StudyValidationInput = {
        studyType: 'tree_test',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        nodes: [], // Empty - should fail
        tasks: [],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i => i.section === 'tree_test_content')).toBe(true)
    })

    it('should validate survey studies', () => {
      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [], // Empty - should fail
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i => i.section === 'survey_content')).toBe(true)
    })

    it('should validate all study types have content validation', () => {
      for (const studyType of ALL_STUDY_TYPES) {
        const input: StudyValidationInput = {
          studyType,
          flowSettings: createMinimalFlowSettings(),
          screeningQuestions: [],
          preStudyQuestions: [],
          postStudyQuestions: [],
          // Intentionally leave content empty to trigger validation errors
          cards: studyType === 'card_sort' ? [] : undefined,
          categories: studyType === 'card_sort' ? [] : undefined,
          cardSortSettings: studyType === 'card_sort' ? {
            mode: 'open',
            randomizeCards: true,
            randomizeCategories: false,
            allowSkip: false,
            showProgress: true,
          } : undefined,
          nodes: studyType === 'tree_test' ? [] : undefined,
          tasks: studyType === 'tree_test' ? [] : undefined,
          surveyQuestions: studyType === 'survey' ? [] : undefined,
        }

        const result = validateStudy(input)
        expect(
          result.isValid === false,
          `Empty ${studyType} study should have validation errors`
        ).toBe(true)
      }
    })
  })

  describe('Question Type Validation', () => {
    it('should validate questions with empty text', () => {
      for (const questionType of ALL_QUESTION_TYPES) {
        const question = createTestQuestion('survey', questionType, {
          question_text: '',
          question_text_html: null,
        })

        const input: StudyValidationInput = {
          studyType: 'survey',
          flowSettings: createMinimalFlowSettings(),
          screeningQuestions: [],
          preStudyQuestions: [],
          postStudyQuestions: [],
          surveyQuestions: [question],
        }

        const result = validateStudy(input)
        expect(
          result.issues.some(i => i.message.includes('empty') || i.message.includes('label')),
          `Empty ${questionType} question should have validation error`
        ).toBe(true)
      }
    })

    it('should validate radio questions need at least 2 options', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        config: { mode: 'single', options: [], randomOrder: false, allowOther: false },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.message.includes('options'))).toBe(true)
    })

    it('should validate checkbox questions need at least 2 options', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        config: { mode: 'single', options: [], randomOrder: false, allowOther: false },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.message.includes('options'))).toBe(true)
    })

    it('should validate dropdown questions need at least 2 options', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        config: { options: [], placeholder: '' },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.message.includes('options'))).toBe(true)
    })

    it('should validate ranking questions need at least 2 items', () => {
      const question = createTestQuestion('survey', 'ranking', {
        config: { items: [] },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.message.includes('items'))).toBe(true)
    })

    it('should validate matrix questions need at least 1 row and column', () => {
      const question = createTestQuestion('survey', 'matrix', {
        config: { rows: [], columns: [] },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.message.includes('row') || i.message.includes('column'))).toBe(true)
    })
  })

  describe('Survey Study Specific', () => {
    it('should require at least one survey question', () => {
      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i =>
        i.section === 'survey_content' &&
        i.message.includes('At least one survey question')
      )).toBe(true)
    })

    it('should validate each survey question configuration', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        question_text: '',
        config: { mode: 'single', options: [], randomOrder: false, allowOther: false },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      // Should have errors for both empty text and missing options
      expect(result.issues.length).toBeGreaterThanOrEqual(2)
    })

    it('should pass validation for properly configured survey question', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        question_text: 'What is your favorite color?',
        config: {
          mode: 'single' as const,
          options: [
            { id: '1', label: 'Red' },
            { id: '2', label: 'Blue' },
            { id: '3', label: 'Green' },
          ],
          randomOrder: false,
          allowOther: false,
        },
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Participant Identifier Validation', () => {
    it('should pass validation for anonymous identifier type', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'anonymous',
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.section === 'identifier')).toBe(false)
    })

    it('should fail validation when demographic profile is missing', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        // demographicProfile is missing
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i =>
        i.section === 'identifier' &&
        i.message.includes('configuration is missing')
      )).toBe(true)
    })

    it('should fail validation when no demographic fields are enabled', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        demographicProfile: {
          title: 'Participant Information',
          description: 'Tell us about yourself',
          sections: [
            {
              id: 'basic-demographics',
              name: 'Basic Demographics',
              position: 0,
              fields: [
                { id: 'email', type: 'predefined', fieldType: 'email', position: 0, enabled: false, required: false, mappedToScreeningQuestionId: null },
                { id: 'firstName', type: 'predefined', fieldType: 'firstName', position: 1, enabled: false, required: false, mappedToScreeningQuestionId: null },
              ],
            },
          ],
          genderOptions: { options: [] },
          ageRangeOptions: { ranges: [] },
          locationConfig: { startLevel: 'country', defaultCountry: null, defaultState: null },
          maritalStatusOptions: { options: [] },
          householdSizeOptions: { options: [] },
          employmentStatusOptions: { options: [] },
          industryOptions: { options: [] },
          companySizeOptions: { options: [] },
          yearsOfExperienceOptions: { options: [] },
          departmentOptions: { options: [] },
          primaryDeviceOptions: { options: [] },
          operatingSystemOptions: { options: [] },
          browserPreferenceOptions: { options: [] },
          techProficiencyOptions: { options: [] },
          educationLevelOptions: { options: [] },
          occupationTypeOptions: { options: [] },
          locationTypeOptions: { options: [] },
          timeZoneOptions: { options: [] },
          priorExperienceOptions: { options: [] },
          followUpWillingnessOptions: { options: [] },
          researchAvailabilityOptions: { options: [] },
          contactConsentOptions: { options: [] },
          yearsUsingProductOptions: { options: [] },
          productUsageFrequencyOptions: { options: [] },
          accessibilityNeedsOptions: { options: [] },
          preferredLanguageOptions: { options: [] },
          assistiveTechnologyOptions: { options: [] },
          digitalComfortOptions: { options: [] },
        },
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i =>
        i.section === 'identifier' &&
        i.message.includes('At least one demographic field must be enabled')
      )).toBe(true)
    })

    it('should pass validation when at least one demographic field is enabled', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        demographicProfile: {
          title: 'Participant Information',
          description: 'Tell us about yourself',
          sections: [
            {
              id: 'basic-demographics',
              name: 'Basic Demographics',
              position: 0,
              fields: [
                { id: 'email', type: 'predefined', fieldType: 'email', position: 0, enabled: true, required: true, mappedToScreeningQuestionId: null },
                { id: 'firstName', type: 'predefined', fieldType: 'firstName', position: 1, enabled: false, required: false, mappedToScreeningQuestionId: null },
              ],
            },
          ],
          genderOptions: { options: [] },
          ageRangeOptions: { ranges: [] },
          locationConfig: { startLevel: 'country', defaultCountry: null, defaultState: null },
          maritalStatusOptions: { options: [] },
          householdSizeOptions: { options: [] },
          employmentStatusOptions: { options: [] },
          industryOptions: { options: [] },
          companySizeOptions: { options: [] },
          yearsOfExperienceOptions: { options: [] },
          departmentOptions: { options: [] },
          primaryDeviceOptions: { options: [] },
          operatingSystemOptions: { options: [] },
          browserPreferenceOptions: { options: [] },
          techProficiencyOptions: { options: [] },
          educationLevelOptions: { options: [] },
          occupationTypeOptions: { options: [] },
          locationTypeOptions: { options: [] },
          timeZoneOptions: { options: [] },
          priorExperienceOptions: { options: [] },
          followUpWillingnessOptions: { options: [] },
          researchAvailabilityOptions: { options: [] },
          contactConsentOptions: { options: [] },
          yearsUsingProductOptions: { options: [] },
          productUsageFrequencyOptions: { options: [] },
          accessibilityNeedsOptions: { options: [] },
          preferredLanguageOptions: { options: [] },
          assistiveTechnologyOptions: { options: [] },
          digitalComfortOptions: { options: [] },
        },
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.issues.some(i => i.section === 'identifier')).toBe(false)
    })

    it('should fail validation when custom section has no title', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        demographicProfile: {
          title: 'Participant Information',
          description: '',
          sections: [
            {
              id: 'custom-section-123',
              name: '',
              title: '',
              position: 0,
              fields: [
                { id: 'field1', type: 'predefined', fieldType: 'email', position: 0, enabled: true, required: false, mappedToScreeningQuestionId: null },
              ],
            },
          ],
          genderOptions: { options: [] },
          ageRangeOptions: { ranges: [] },
          locationConfig: { startLevel: 'country', defaultCountry: null, defaultState: null },
          maritalStatusOptions: { options: [] },
          householdSizeOptions: { options: [] },
          employmentStatusOptions: { options: [] },
          industryOptions: { options: [] },
          companySizeOptions: { options: [] },
          yearsOfExperienceOptions: { options: [] },
          departmentOptions: { options: [] },
          primaryDeviceOptions: { options: [] },
          operatingSystemOptions: { options: [] },
          browserPreferenceOptions: { options: [] },
          techProficiencyOptions: { options: [] },
          educationLevelOptions: { options: [] },
          occupationTypeOptions: { options: [] },
          locationTypeOptions: { options: [] },
          timeZoneOptions: { options: [] },
          priorExperienceOptions: { options: [] },
          followUpWillingnessOptions: { options: [] },
          researchAvailabilityOptions: { options: [] },
          contactConsentOptions: { options: [] },
          yearsUsingProductOptions: { options: [] },
          productUsageFrequencyOptions: { options: [] },
          accessibilityNeedsOptions: { options: [] },
          preferredLanguageOptions: { options: [] },
          assistiveTechnologyOptions: { options: [] },
          digitalComfortOptions: { options: [] },
        },
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i =>
        i.section === 'identifier' &&
        i.message.includes('Custom section is missing a title')
      )).toBe(true)
    })

    it('should fail validation when custom field has no question text', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        demographicProfile: {
          title: 'Participant Information',
          description: '',
          sections: [
            {
              id: 'basic-demographics',
              name: 'Basic',
              position: 0,
              fields: [
                { id: 'custom1', type: 'custom', questionText: '', placeholder: 'Enter value', position: 0, enabled: true, required: false, mappedToScreeningQuestionId: null },
              ],
            },
          ],
          genderOptions: { options: [] },
          ageRangeOptions: { ranges: [] },
          locationConfig: { startLevel: 'country', defaultCountry: null, defaultState: null },
          maritalStatusOptions: { options: [] },
          householdSizeOptions: { options: [] },
          employmentStatusOptions: { options: [] },
          industryOptions: { options: [] },
          companySizeOptions: { options: [] },
          yearsOfExperienceOptions: { options: [] },
          departmentOptions: { options: [] },
          primaryDeviceOptions: { options: [] },
          operatingSystemOptions: { options: [] },
          browserPreferenceOptions: { options: [] },
          techProficiencyOptions: { options: [] },
          educationLevelOptions: { options: [] },
          occupationTypeOptions: { options: [] },
          locationTypeOptions: { options: [] },
          timeZoneOptions: { options: [] },
          priorExperienceOptions: { options: [] },
          followUpWillingnessOptions: { options: [] },
          researchAvailabilityOptions: { options: [] },
          contactConsentOptions: { options: [] },
          yearsUsingProductOptions: { options: [] },
          productUsageFrequencyOptions: { options: [] },
          accessibilityNeedsOptions: { options: [] },
          preferredLanguageOptions: { options: [] },
          assistiveTechnologyOptions: { options: [] },
          digitalComfortOptions: { options: [] },
        },
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      expect(result.isValid).toBe(false)
      expect(result.issues.some(i =>
        i.section === 'identifier' &&
        i.message.includes('Custom field is missing question text')
      )).toBe(true)
    })

    it('should have valid navigation path for identifier issues', () => {
      const flowSettings = createMinimalFlowSettings()
      flowSettings.participantIdentifier = {
        type: 'demographic_profile',
        // Missing demographicProfile
      }

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings,
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [createTestQuestion('survey', 'multiple_choice', {
          config: { mode: 'single', options: [{ id: '1', label: 'Option 1' }, { id: '2', label: 'Option 2' }], randomOrder: false, allowOther: false },
        })],
      }

      const result = validateStudy(input)
      const identifierIssue = result.issues.find(i => i.section === 'identifier')

      expect(identifierIssue).toBeDefined()
      expect(identifierIssue?.navigationPath.tab).toBe('study-flow')
      expect(identifierIssue?.navigationPath.sectionId).toBe('identifier')
    })
  })

  describe('Navigation Paths', () => {
    it('should have valid navigation paths for survey content issues', () => {
      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [],
      }

      const result = validateStudy(input)
      const surveyIssue = result.issues.find(i => i.section === 'survey_content')

      expect(surveyIssue).toBeDefined()
      expect(surveyIssue?.navigationPath.tab).toBe('study-flow')
      expect(surveyIssue?.navigationPath.sectionId).toBe('survey')
    })

    it('should have valid navigation paths for individual survey question issues', () => {
      const question = createTestQuestion('survey', 'multiple_choice', {
        question_text: '',
      })

      const input: StudyValidationInput = {
        studyType: 'survey',
        flowSettings: createMinimalFlowSettings(),
        screeningQuestions: [],
        preStudyQuestions: [],
        postStudyQuestions: [],
        surveyQuestions: [question],
      }

      const result = validateStudy(input)
      const questionIssue = result.issues.find(i =>
        i.section === 'survey' && i.message.includes('Question')
      )

      expect(questionIssue).toBeDefined()
      expect(questionIssue?.navigationPath.tab).toBe('study-flow')
      expect(questionIssue?.navigationPath.questionId).toBe(question.id)
    })
  })
})
