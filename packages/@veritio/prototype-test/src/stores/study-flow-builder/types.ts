import type {
  StudyFlowSettings,
  StudyFlowQuestion,
  FlowSection,
  QuestionType,
  DemographicSection,
  DemographicField,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

// =============================================================================
// TYPES
// =============================================================================

// Save status for auto-save feedback
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Active tab in the builder
export type BuilderTab = 'content' | 'study-flow'

// Active section in study flow editor
export type ActiveFlowSection =
  | 'welcome'
  | 'agreement'
  | 'screening'
  | 'identifier'
  | 'pre_study'
  | 'instructions'
  | 'prototype_settings' // Prototype test settings (task/prototype options)
  | 'post_study'
  | 'survey' // Survey questionnaire main activity
  | 'thank_you'
  | 'closed'

// Snapshot type for dirty detection
export interface StudyFlowSnapshot {
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]
}

// =============================================================================
// STATE INTERFACE
// =============================================================================

export interface StudyFlowBuilderState {
  // Data
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]

  // Snapshot for dirty detection
  _snapshot: StudyFlowSnapshot | null

  // UI State
  activeTab: BuilderTab
  activeFlowSection: ActiveFlowSection
  selectedQuestionId: string | null
  expandedQuestionId: string | null
  selectedDemographicSectionId: string | null // For tracking selected demographic section in identifier

  // Meta
  studyId: string | null
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isHydrated: boolean

  // Flow Settings Actions
  setFlowSettings: (settings: Partial<StudyFlowSettings>) => void
  updateWelcomeSettings: (updates: Partial<StudyFlowSettings['welcome']>) => void
  updateAgreementSettings: (updates: Partial<StudyFlowSettings['participantAgreement']>) => void
  updateScreeningSettings: (updates: Partial<StudyFlowSettings['screening']>) => void
  updateIdentifierSettings: (updates: Partial<StudyFlowSettings['participantIdentifier']>) => void

  // Demographic Section Actions (for 'demographic_profile' type)
  addDemographicSection: (sectionType: 'professional-details' | 'technology' | 'custom') => string | null
  removeDemographicSection: (sectionId: string) => void
  updateDemographicSection: (sectionId: string, updates: Partial<DemographicSection>) => void
  addDemographicCustomField: (sectionId: string, field: Partial<DemographicField>) => void
  updateDemographicField: (sectionId: string, fieldId: string, updates: Partial<DemographicField>) => void
  removeDemographicField: (sectionId: string, fieldId: string) => void
  toggleDemographicFieldEnabled: (sectionId: string, fieldId: string) => void
  toggleDemographicFieldRequired: (sectionId: string, fieldId: string) => void

  updatePreStudySettings: (updates: Partial<StudyFlowSettings['preStudyQuestions']>) => void
  updateInstructionsSettings: (updates: Partial<StudyFlowSettings['activityInstructions']>) => void
  updatePostStudySettings: (updates: Partial<StudyFlowSettings['postStudyQuestions']>) => void
  updateSurveyQuestionnaireSettings: (updates: Partial<NonNullable<StudyFlowSettings['surveyQuestionnaire']>>) => void
  updateThankYouSettings: (updates: Partial<StudyFlowSettings['thankYou']>) => void
  updateClosedSettings: (updates: Partial<StudyFlowSettings['closedStudy']>) => void
  updatePaginationSettings: (updates: Partial<NonNullable<StudyFlowSettings['pagination']>>) => void

  // Question Actions
  addQuestion: (section: FlowSection, questionType: QuestionType, customSectionId?: string) => string
  updateQuestion: (questionId: string, updates: Partial<StudyFlowQuestion>) => void
  removeQuestion: (section: FlowSection, questionId: string) => void
  reorderQuestions: (section: FlowSection, questions: StudyFlowQuestion[]) => void
  duplicateQuestion: (section: FlowSection, questionId: string) => string | null

  // UI Actions
  setActiveTab: (tab: BuilderTab) => void
  setActiveFlowSection: (section: ActiveFlowSection) => void
  setSelectedQuestionId: (id: string | null) => void
  setExpandedQuestionId: (id: string | null) => void
  setSelectedDemographicSectionId: (id: string | null) => void

  // Meta Actions
  setStudyId: (studyId: string | null) => void
  setSaveStatus: (status: SaveStatus) => void
  markSaved: () => void
  markSavedWithData: (data: {
    flowSettings: StudyFlowSettings
    screeningQuestions: StudyFlowQuestion[]
    preStudyQuestions: StudyFlowQuestion[]
    postStudyQuestions: StudyFlowQuestion[]
    surveyQuestions: StudyFlowQuestion[]
  }) => void
  markClean: () => void

  // Load data from API without marking dirty
  loadFromApi: (data: {
    flowSettings: StudyFlowSettings
    screeningQuestions: StudyFlowQuestion[]
    preStudyQuestions: StudyFlowQuestion[]
    postStudyQuestions: StudyFlowQuestion[]
    surveyQuestions: StudyFlowQuestion[]
    studyId: string
  }) => void

  // Load only settings from an external source (e.g. AI assistant SSE)
  // without touching questions — updates snapshot so dirty detection stays clean
  loadSettingsFromExternal: (flowSettings: StudyFlowSettings) => void

  setHydrated: (hydrated: boolean) => void
  reset: () => void
}
