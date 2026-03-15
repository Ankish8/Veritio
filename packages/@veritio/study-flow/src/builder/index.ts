export type {
  BuilderTab,
  ActiveFlowSection,
  SaveStatus,
} from '../types'

export interface FlowSectionConfig {
  id: string
  label: string
  icon: string
  enabled: boolean
  settingsKey: keyof import('../types').StudyFlowSettings
  hasQuestions?: boolean
}

export const ACTIVITY_FLOW_SECTIONS: FlowSectionConfig[] = [
  { id: 'welcome', label: 'Welcome', icon: 'hand-wave', enabled: true, settingsKey: 'welcome' },
  { id: 'agreement', label: 'Agreement', icon: 'file-check', enabled: false, settingsKey: 'participantAgreement' },
  { id: 'screening', label: 'Screening', icon: 'filter', enabled: false, settingsKey: 'screening', hasQuestions: true },
  { id: 'identifier', label: 'Identifier', icon: 'user', enabled: true, settingsKey: 'participantIdentifier' },
  { id: 'pre_study', label: 'Pre-Study Questions', icon: 'clipboard-list', enabled: false, settingsKey: 'preStudyQuestions', hasQuestions: true },
  { id: 'instructions', label: 'Instructions', icon: 'info', enabled: true, settingsKey: 'activityInstructions' },
  { id: 'post_study', label: 'Post-Study Questions', icon: 'clipboard-check', enabled: false, settingsKey: 'postStudyQuestions', hasQuestions: true },
  { id: 'thank_you', label: 'Thank You', icon: 'heart', enabled: true, settingsKey: 'thankYou' },
  { id: 'closed', label: 'Closed Message', icon: 'lock', enabled: true, settingsKey: 'closedStudy' },
]

export const SURVEY_FLOW_SECTIONS: FlowSectionConfig[] = [
  { id: 'welcome', label: 'Welcome', icon: 'hand-wave', enabled: true, settingsKey: 'welcome' },
  { id: 'agreement', label: 'Agreement', icon: 'file-check', enabled: false, settingsKey: 'participantAgreement' },
  { id: 'screening', label: 'Screening', icon: 'filter', enabled: false, settingsKey: 'screening', hasQuestions: true },
  { id: 'identifier', label: 'Identifier', icon: 'user', enabled: true, settingsKey: 'participantIdentifier' },
  { id: 'survey', label: 'Survey Questions', icon: 'clipboard-list', enabled: true, settingsKey: 'surveyQuestionnaire', hasQuestions: true },
  { id: 'thank_you', label: 'Thank You', icon: 'heart', enabled: true, settingsKey: 'thankYou' },
  { id: 'closed', label: 'Closed Message', icon: 'lock', enabled: true, settingsKey: 'closedStudy' },
]

export function getFlowSectionsForType(studyType: import('../types').StudyType): FlowSectionConfig[] {
  if (studyType === 'survey') return SURVEY_FLOW_SECTIONS
  return ACTIVITY_FLOW_SECTIONS
}
