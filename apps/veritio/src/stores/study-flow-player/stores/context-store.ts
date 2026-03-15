/**
 * Player Context Store
 *
 * Manages study configuration and context data.
 * This store holds "static" data that doesn't change during the flow:
 * - Study identification (studyId, participantId, studyType)
 * - Flow configuration (settings, questions, custom sections)
 * - Branding and metadata
 *
 * @module stores/study-flow-player/stores/context-store
 */

import { create } from 'zustand'
import type {
  StudyFlowQuestion,
  StudyFlowSettings,
  SurveyCustomSection,
} from '@veritio/study-types/study-flow-types'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { defaultStudyFlowSettings } from '@/lib/study-flow/defaults'
import type { StudyMeta } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

export interface PlayerContextState {
  // Study identification
  studyId: string | null
  participantId: string | null
  studyType: StudyType | null

  // Flow configuration
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]
  customSections: SurveyCustomSection[]

  // Display configuration
  studyMeta: StudyMeta | null
  branding: BrandingSettings | null

  // Actions
  initialize: (config: PlayerContextConfig) => void
  reset: () => void
}

export interface PlayerContextConfig {
  studyId: string
  participantId: string
  studyType: StudyType
  flowSettings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions?: StudyFlowQuestion[]
  customSections?: SurveyCustomSection[]
  studyMeta?: StudyMeta | null
  branding?: BrandingSettings | null
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  studyId: null,
  participantId: null,
  studyType: null,
  flowSettings: defaultStudyFlowSettings,
  screeningQuestions: [] as StudyFlowQuestion[],
  preStudyQuestions: [] as StudyFlowQuestion[],
  postStudyQuestions: [] as StudyFlowQuestion[],
  surveyQuestions: [] as StudyFlowQuestion[],
  customSections: [] as SurveyCustomSection[],
  studyMeta: null as StudyMeta | null,
  branding: null as BrandingSettings | null,
}

// =============================================================================
// STORE
// =============================================================================

export const usePlayerContextStore = create<PlayerContextState>()((set) => ({
  ...initialState,

  initialize: (config) => {
    set({
      studyId: config.studyId,
      participantId: config.participantId,
      studyType: config.studyType,
      flowSettings: config.flowSettings,
      screeningQuestions: config.screeningQuestions,
      preStudyQuestions: config.preStudyQuestions,
      postStudyQuestions: config.postStudyQuestions,
      surveyQuestions: config.surveyQuestions || [],
      customSections: config.customSections || [],
      studyMeta: config.studyMeta || null,
      branding: config.branding || null,
    })
  },

  reset: () => set(initialState),
}))

// =============================================================================
// SELECTORS
// =============================================================================

export const useStudyId = () => usePlayerContextStore((s) => s.studyId)
export const useParticipantId = () => usePlayerContextStore((s) => s.participantId)
export const useStudyType = () => usePlayerContextStore((s) => s.studyType)
export const useFlowSettings = () => usePlayerContextStore((s) => s.flowSettings)
export const useStudyMeta = () => usePlayerContextStore((s) => s.studyMeta)
export const useBranding = () => usePlayerContextStore((s) => s.branding)

/**
 * Get all questions for a specific section
 */
export const useQuestionsForSection = (section: 'screening' | 'pre_study' | 'survey' | 'post_study') => {
  return usePlayerContextStore((s) => {
    switch (section) {
      case 'screening':
        return s.screeningQuestions
      case 'pre_study':
        return s.preStudyQuestions
      case 'survey':
        return s.surveyQuestions
      case 'post_study':
        return s.postStudyQuestions
      default:
        return []
    }
  })
}
