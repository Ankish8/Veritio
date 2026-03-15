export type QuestionType =
  | 'single_line_text'
  | 'multi_line_text'
  | 'multiple_choice'
  | 'opinion_scale'
  | 'yes_no'
  | 'nps'
  | 'matrix'
  | 'ranking'
  | 'slider'

export type FlowSection = 'screening' | 'pre_study' | 'post_study' | 'survey'

export type FlowStep =
  | 'welcome'
  | 'agreement'
  | 'screening'
  | 'identifier'
  | 'pre_study'
  | 'instructions'
  | 'activity'
  | 'survey'
  | 'post_study'
  | 'thank_you'
  | 'rejected'
  | 'closed'
  | 'early_end'

export type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'
  | 'live_website_test'

export type TextResponseValue = string

export interface SingleChoiceResponseValue {
  optionId: string
  otherText?: string
}

export interface MultiChoiceResponseValue {
  optionIds: string[]
  otherText?: string
}

export interface ScaleResponseValue {
  value: number
}

export interface MatrixResponseValue {
  [rowId: string]: string | string[]
}

export type RankingResponseValue = string[]

export type YesNoResponseValue = boolean

export type OpinionScaleResponseValue = number

export type SliderResponseValue = number

export type ResponseValue =
  | TextResponseValue
  | SingleChoiceResponseValue
  | MultiChoiceResponseValue
  | ScaleResponseValue
  | MatrixResponseValue
  | RankingResponseValue
  | YesNoResponseValue
  | OpinionScaleResponseValue
  | SliderResponseValue

export interface QuestionResponse {
  questionId: string
  value: ResponseValue
  timestamp: number
  timeSpentMs?: number
}

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

export const SURVEY_STEP_ORDER: FlowStep[] = [
  'welcome',
  'agreement',
  'screening',
  'identifier',
  'survey',
  'thank_you',
]

export function getStepOrder(studyType: StudyType | null): FlowStep[] {
  if (studyType === 'survey') return SURVEY_STEP_ORDER
  return ACTIVITY_STEP_ORDER
}

export interface WelcomeSettings {
  enabled: boolean
  title: string
  message: string
  includeStudyTitle?: boolean
  includeDescription?: boolean
  includePurpose?: boolean
  includeParticipantRequirements?: boolean
}

export interface ParticipantAgreementSettings {
  enabled: boolean
  title: string
  message: string
  agreementText: string
  showRejectionMessage?: boolean
  rejectionTitle: string
  rejectionMessage: string
  redirectUrl?: string
}

export type PageMode = 'one_per_page' | 'all_on_one'

export interface ScreeningSettings {
  enabled: boolean
  introTitle?: string
  introMessage?: string
  rejectionTitle: string
  rejectionMessage: string
  redirectUrl?: string
  redirectImmediately?: boolean
  pageMode?: PageMode
}

export interface TaskFeedbackSettings {
  pageMode: PageMode // 'one_per_page' | 'all_on_one'
}

export type ParticipantIdentifierType = 'anonymous' | 'demographic_profile'

export interface ParticipantIdentifierSettings {
  type: ParticipantIdentifierType
  demographicProfile?: DemographicProfileSettings
}

export interface DemographicSection {
  id: string
  name: string
  position: number
  fields: DemographicField[]
  title?: string
  description?: string
}

export interface DemographicField {
  id: string
  type: 'predefined' | 'custom'
  position: number
  enabled: boolean
  required: boolean
  fieldType?: string
  label?: string
  questionText?: string
  placeholder?: string
  mappedToScreeningQuestionId?: string | null
  width?: 'full' | 'half'
}

export interface DemographicProfileSettings {
  sections: DemographicSection[]
  title?: string
  description?: string
  enableAutoPopulation?: boolean
}

export interface QuestionsSectionSettings {
  enabled: boolean
  showIntro?: boolean
  introTitle?: string
  introMessage?: string
  pageMode?: PageMode
  randomizeQuestions?: boolean
  autoAdvance?: boolean
}

export interface SurveyQuestionnaireSettings extends QuestionsSectionSettings {
  showProgressBar?: boolean
  allowSkipQuestions?: boolean
}

export interface ActivityInstructionsSettings {
  enabled: boolean
  title: string
  part1: string
  part2?: string
}

export interface ThankYouSettings {
  enabled: boolean
  title: string
  message: string
  redirectUrl?: string
  redirectDelay?: number
}

export interface ClosedStudySettings {
  title: string
  message: string
  redirectUrl?: string
  redirectImmediately: boolean
}

export interface PaginationSettings {
  mode: 'progressive' | 'one_per_page'
}

export interface StudyFlowSettings {
  welcome: WelcomeSettings
  participantAgreement: ParticipantAgreementSettings
  screening: ScreeningSettings
  participantIdentifier: ParticipantIdentifierSettings
  preStudyQuestions: QuestionsSectionSettings
  activityInstructions: ActivityInstructionsSettings
  surveyQuestionnaire?: SurveyQuestionnaireSettings
  postStudyQuestions: QuestionsSectionSettings
  thankYou: ThankYouSettings
  closedStudy: ClosedStudySettings
  pagination?: PaginationSettings
}

export type BuilderTab = 'content' | 'study-flow'

export type ActiveFlowSection =
  | 'welcome'
  | 'agreement'
  | 'screening'
  | 'identifier'
  | 'pre_study'
  | 'instructions'
  | 'prototype_settings'
  | 'post_study'
  | 'survey'
  | 'thank_you'
  | 'closed'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface StudyMeta {
  title: string
  description: string | null
  purpose: string | null
  participantRequirements: string | null
}

export * from './player-types'
