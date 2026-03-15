import type { ActiveFlowSection } from '../../stores/study-flow-builder/index'
import type {
  StudyFlowSettings,
  StudyFlowQuestion,
  FlowSection,
  SurveyCustomSection,
  ABTestVariant,
} from '../supabase/study-flow-types'
import type {
  CardWithImage,
  Category,
  TreeNode,
  Task,
  CardSortSettings,
  PrototypeTestPrototype,
  PrototypeTestTask,
} from '@veritio/study-types'
import type { FirstClickTaskWithDetails } from '../../stores/study-builder/first-click-builder'
import type { FirstImpressionDesign } from '../supabase/study-flow-types'
import type { LiveWebsiteTask, LiveWebsiteSettings } from '../../stores/study-builder/live-website-builder'
import type { BuilderTabId } from '../../components/builders/shared/types'

export type { BuilderTabId }

export type ValidationSectionId =
  | 'welcome'
  | 'agreement'
  | 'screening'
  | 'identifier'
  | 'pre_study'
  | 'instructions'
  | 'post_study'
  | 'survey'
  | 'thank_you'
  | 'closed'
  | 'card_sort_content'
  | 'tree_test_content'
  | 'survey_content'
  | 'prototype_test_content'
  | 'first_click_content'
  | 'first_impression_content'
  | 'live_website_content'

export interface ValidationNavigationPath {
  tab: BuilderTabId
  sectionId?: ActiveFlowSection
  questionId?: string | null
  itemId?: string
  itemType?: 'card' | 'category'
  nodeId?: string
  taskId?: string
}

export interface ValidationIssue {
  id: string
  section: ValidationSectionId
  sectionLabel: string
  message: string
  itemLabel?: string
  navigationPath: ValidationNavigationPath
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  bySection: Partial<Record<ValidationSectionId, ValidationIssue[]>>
  issueCount: number
}

export interface StudyValidationInput {
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions?: StudyFlowQuestion[]
  customSections?: SurveyCustomSection[]
  abTests?: Record<string, ABTestVariant>
  cards?: CardWithImage[]
  categories?: Category[]
  cardSortSettings?: CardSortSettings
  nodes?: TreeNode[]
  tasks?: Task[]
  prototype?: PrototypeTestPrototype | null
  prototypeTasks?: PrototypeTestTask[]
  firstClickTasks?: FirstClickTaskWithDetails[]
  firstImpressionDesigns?: FirstImpressionDesign[]
  liveWebsiteTasks?: LiveWebsiteTask[]
  liveWebsiteSettings?: LiveWebsiteSettings
}

export const SECTION_LABELS: Record<ValidationSectionId, string> = {
  welcome: 'Welcome',
  agreement: 'Participant Agreement',
  screening: 'Participant Screener',
  identifier: 'Participant Identifier',
  pre_study: 'Questionnaire Pre-Study',
  instructions: 'Activity Instructions',
  post_study: 'Questionnaire Post-Study',
  survey: 'Survey Questionnaire',
  thank_you: 'Thank You',
  closed: 'Closed Study',
  card_sort_content: 'Card Sort',
  tree_test_content: 'Tree Test',
  survey_content: 'Survey',
  prototype_test_content: 'Prototype Test',
  first_click_content: 'First Click Tasks',
  first_impression_content: 'First Impression Designs',
  live_website_content: 'Live Website Tasks',
}

export function flowSectionToValidationSection(section: FlowSection): ValidationSectionId {
  switch (section) {
    case 'screening':
      return 'screening'
    case 'pre_study':
      return 'pre_study'
    case 'post_study':
      return 'post_study'
    case 'survey':
      return 'survey'
  }
}

export function flowSectionToActiveSection(section: FlowSection): ActiveFlowSection {
  switch (section) {
    case 'screening':
      return 'screening'
    case 'pre_study':
      return 'pre_study'
    case 'post_study':
      return 'post_study'
    case 'survey':
      return 'survey'
  }
}
