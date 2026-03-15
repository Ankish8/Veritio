import type { ActiveFlowSection } from '@veritio/prototype-test/stores'
import type { StudyFlowQuestion, StudyFlowSettings, SurveyCustomSection, FlowSection, QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SectionConfig } from '../section-config'

export type FlowSettings = StudyFlowSettings

export interface FlowNavigatorProps {
  sections: SectionConfig[]
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  activeFlowSection: ActiveFlowSection
  selectedQuestionId: string | null
  selectedDemographicSectionId: string | null
  flowSettings: FlowSettings
  customSections: SurveyCustomSection[]
  selectedSectionId: string | null

  // Helpers
  getSectionEnabled: (key?: string) => boolean
  getQuestionsForSection: (sectionId: ActiveFlowSection) => StudyFlowQuestion[]

  // Actions
  setActiveFlowSection: (section: ActiveFlowSection) => void
  setSelectedQuestionId: (id: string | null) => void
  setSelectedDemographicSectionId: (id: string | null) => void
  setSelectedSectionId: (id: string | null) => void
  toggleSectionEnabled: (key: string) => void
  handleSelectQuestion: (sectionId: ActiveFlowSection, questionId: string) => void
  handleAddQuestion: (sectionId: ActiveFlowSection) => string
  handleAddCustomSection: () => Promise<void>

  // Question actions
  removeQuestion: (section: FlowSection, questionId: string) => void
  duplicateQuestion: (section: FlowSection, questionId: string) => string | null
  reorderQuestions: (section: FlowSection, questions: StudyFlowQuestion[]) => void

  // Demographic actions
  removeDemographicSection: (sectionId: string) => void
  updateIdentifierSettings: (settings: Partial<FlowSettings['participantIdentifier']>) => void

  // Settings updates
  updatePreStudySettings: (settings: Partial<FlowSettings['preStudyQuestions']>) => void
  updatePostStudySettings: (settings: Partial<FlowSettings['postStudyQuestions']>) => void
  updateSurveyQuestionnaireSettings: (settings: Partial<NonNullable<FlowSettings['surveyQuestionnaire']>>) => void

  // Survey section actions
  deleteSection: (id: string) => void
  updateSection: (id: string, updates: Partial<SurveyCustomSection>) => void
  addQuestion: (section: FlowSection, type: QuestionType, customSectionId?: string) => string
  reorderSections?: (orderedSectionIds: string[]) => Promise<boolean>

  // Navigation callback for prototype test
  onNavigateToContent?: () => void

  // Prototype test task count (from prototype builder store)
  prototypeTaskCount?: number
}
