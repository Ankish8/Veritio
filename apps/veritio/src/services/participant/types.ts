import type { Json, PrototypeTestPrototype, PrototypeTestFrame, PrototypeTestTask, FirstClickTask, FirstClickImage, FirstClickAOI } from '@veritio/study-types'
import type { SurveyRule } from '../../lib/supabase/survey-rules-types'

/**
 * First-click task with nested image and AOIs for participant view
 */
export interface FirstClickTaskForParticipation extends FirstClickTask {
  image: FirstClickImage | null
  aois: FirstClickAOI[]
}

/**
 * Study data structure for participant view
 */
export interface StudyForParticipation {
  id: string
  title: string
  description: string | null
  purpose: string | null
  participant_requirements: string | null
  study_type: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click'
  status: 'draft' | 'active' | 'paused' | 'completed'
  settings: Json
  welcome_message: string | null
  thank_you_message: string | null
  branding: Json
  language: string
  response_prevention_settings?: Json | null
  session_recording_settings?: Json | null
  cards: Array<{ id: string; label: string; description: string | null; position: number }>
  categories: Array<{ id: string; label: string; description: string | null; position: number }>
  tree_nodes: Array<{ id: string; label: string; parent_id: string | null; position: number }>
  tasks: Array<{ id: string; question: string; correct_node_id: string | null; position: number }>
  screening_questions: unknown[]
  pre_study_questions: unknown[]
  post_study_questions: unknown[]
  survey_questions: unknown[]
  // PERFORMANCE: Pre-loaded survey rules (only for survey type)
  // This eliminates a separate API call after page load
  survey_rules?: SurveyRule[]
  // Prototype test data (only for prototype_test type)
  prototype_test_prototype?: PrototypeTestPrototype | null
  prototype_test_frames?: PrototypeTestFrame[]
  prototype_test_tasks?: PrototypeTestTask[]
  prototype_test_component_instances?: Array<{
    instance_id: string
    frame_node_id: string
    relative_x: number
    relative_y: number
    width?: number | null
    height?: number | null
  }>
  // First-click test data (only for first_click type)
  first_click_tasks?: FirstClickTaskForParticipation[]
}

/**
 * Response when study requires password
 */
export interface StudyPasswordRequired {
  password_required: true
  study_id: string
  title: string
  branding: Json
}

/**
 * Session creation result
 */
export interface SessionResult {
  sessionToken: string
  participantId: string
  studyId: string
}

/**
 * Submission result
 */
export interface SubmissionResult {
  success: boolean
  studyId?: string
  participantId?: string
  error: Error | null
}

/**
 * Service result wrapper
 */
export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Study status type for participant-facing errors
 */
export type StudyStatusForError = 'draft' | 'paused' | 'completed'

/**
 * Get participant-facing error message based on study status.
 * Provides differentiated messaging so participants know if a study might reopen.
 */
export function getStudyStatusErrorMessage(status: StudyStatusForError): string {
  switch (status) {
    case 'paused':
      return 'This study is temporarily paused. Please check back later.'
    case 'completed':
      return 'This study has been completed and is no longer accepting responses.'
    case 'draft':
      return 'This study is not yet available.'
    default:
      return 'This study is not currently accepting responses.'
  }
}
