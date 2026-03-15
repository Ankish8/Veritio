import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { defaultSurveyQuestionnaireSettings, defaultPaginationSettings } from '../../lib/study-flow/defaults'
import type { StudyFlowBuilderState } from './types'
// FLOW SETTINGS UPDATE ACTIONS
export function createSetFlowSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (settings: Partial<StudyFlowSettings>): void => {
    set((state) => ({
      flowSettings: { ...state.flowSettings, ...settings },
    }))
  }
}
export function createUpdateWelcomeSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['welcome']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        welcome: { ...state.flowSettings.welcome, ...updates },
      },
    }))
  }
}
export function createUpdateAgreementSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['participantAgreement']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        participantAgreement: { ...state.flowSettings.participantAgreement, ...updates },
      },
    }))
  }
}
export function createUpdateScreeningSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['screening']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        screening: { ...state.flowSettings.screening, ...updates },
      },
    }))
  }
}
export function createUpdateIdentifierSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['participantIdentifier']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        participantIdentifier: { ...state.flowSettings.participantIdentifier, ...updates },
      },
    }))
  }
}
export function createUpdatePreStudySettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['preStudyQuestions']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        preStudyQuestions: { ...state.flowSettings.preStudyQuestions, ...updates },
      },
    }))
  }
}
export function createUpdateInstructionsSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['activityInstructions']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        activityInstructions: { ...state.flowSettings.activityInstructions, ...updates },
      },
    }))
  }
}
export function createUpdatePostStudySettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['postStudyQuestions']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        postStudyQuestions: { ...state.flowSettings.postStudyQuestions, ...updates },
      },
    }))
  }
}
export function createUpdateSurveyQuestionnaireSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<NonNullable<StudyFlowSettings['surveyQuestionnaire']>>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        surveyQuestionnaire: {
          ...(state.flowSettings.surveyQuestionnaire ?? defaultSurveyQuestionnaireSettings),
          ...updates,
        },
      },
    }))
  }
}
export function createUpdateThankYouSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['thankYou']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        thankYou: { ...state.flowSettings.thankYou, ...updates },
      },
    }))
  }
}
export function createUpdateClosedSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<StudyFlowSettings['closedStudy']>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        closedStudy: { ...state.flowSettings.closedStudy, ...updates },
      },
    }))
  }
}
export function createUpdatePaginationSettings(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (updates: Partial<NonNullable<StudyFlowSettings['pagination']>>): void => {
    set((state) => ({
      flowSettings: {
        ...state.flowSettings,
        pagination: {
          ...(state.flowSettings.pagination ?? defaultPaginationSettings),
          ...updates,
        },
      },
    }))
  }
}
