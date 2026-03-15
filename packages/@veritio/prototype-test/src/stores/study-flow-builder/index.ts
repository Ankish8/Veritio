import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudyFlowSettings, StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { defaultStudyFlowSettings, createStudyFlowSettings } from '../../lib/study-flow/defaults'
import { createSnapshot } from '../../lib/utils/deep-equal'
import { migrateDemographicProfile } from '../../lib/migrations/migrate-demographic-sections'

// Import types
import type {
  StudyFlowBuilderState,
  SaveStatus,
  BuilderTab,
  ActiveFlowSection,
} from './types'

// Import helpers
import { selectFlowIsDirty } from './helpers'

// Import action creators
import {
  createSetFlowSettings,
  createUpdateWelcomeSettings,
  createUpdateAgreementSettings,
  createUpdateScreeningSettings,
  createUpdateIdentifierSettings,
  createUpdatePreStudySettings,
  createUpdateInstructionsSettings,
  createUpdatePostStudySettings,
  createUpdateSurveyQuestionnaireSettings,
  createUpdateThankYouSettings,
  createUpdateClosedSettings,
  createUpdatePaginationSettings,
} from './settings-actions'

import {
  createAddDemographicSection,
  createRemoveDemographicSection,
  createUpdateDemographicSection,
  createAddDemographicCustomField,
  createUpdateDemographicField,
  createRemoveDemographicField,
  createToggleDemographicFieldEnabled,
  createToggleDemographicFieldRequired,
} from './demographic-actions'

import {
  createAddQuestion,
  createUpdateQuestion,
  createRemoveQuestion,
  createReorderQuestions,
  createDuplicateQuestion,
} from './question-actions'

// =============================================================================
// STORE
// =============================================================================

const studyFlowBuilderStore = create<StudyFlowBuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      flowSettings: defaultStudyFlowSettings,
      screeningQuestions: [],
      preStudyQuestions: [],
      postStudyQuestions: [],
      surveyQuestions: [],
      _snapshot: null,

      activeTab: 'content',
      activeFlowSection: 'welcome',
      selectedQuestionId: null,
      expandedQuestionId: null,
      selectedDemographicSectionId: null,

      studyId: null,
      saveStatus: 'idle' as SaveStatus,
      lastSavedAt: null,
      isHydrated: false,

      // =========================================================================
      // FLOW SETTINGS ACTIONS
      // =========================================================================

      setFlowSettings: createSetFlowSettings(set),
      updateWelcomeSettings: createUpdateWelcomeSettings(set),
      updateAgreementSettings: createUpdateAgreementSettings(set),
      updateScreeningSettings: createUpdateScreeningSettings(set),
      updateIdentifierSettings: createUpdateIdentifierSettings(set),
      updatePreStudySettings: createUpdatePreStudySettings(set),
      updateInstructionsSettings: createUpdateInstructionsSettings(set),
      updatePostStudySettings: createUpdatePostStudySettings(set),
      updateSurveyQuestionnaireSettings: createUpdateSurveyQuestionnaireSettings(set),
      updateThankYouSettings: createUpdateThankYouSettings(set),
      updateClosedSettings: createUpdateClosedSettings(set),
      updatePaginationSettings: createUpdatePaginationSettings(set),

      // =========================================================================
      // DEMOGRAPHIC ACTIONS
      // =========================================================================

      addDemographicSection: createAddDemographicSection(set, get),
      removeDemographicSection: createRemoveDemographicSection(set),
      updateDemographicSection: createUpdateDemographicSection(set),
      addDemographicCustomField: createAddDemographicCustomField(set),
      updateDemographicField: createUpdateDemographicField(set),
      removeDemographicField: createRemoveDemographicField(set),
      toggleDemographicFieldEnabled: createToggleDemographicFieldEnabled(set),
      toggleDemographicFieldRequired: createToggleDemographicFieldRequired(set),

      // =========================================================================
      // QUESTION ACTIONS
      // =========================================================================

      addQuestion: createAddQuestion(set, get),
      updateQuestion: createUpdateQuestion(set),
      removeQuestion: createRemoveQuestion(set, get),
      reorderQuestions: createReorderQuestions(set),
      duplicateQuestion: createDuplicateQuestion(set, get),

      // =========================================================================
      // UI ACTIONS
      // =========================================================================

      setActiveTab: (activeTab: BuilderTab) => set({ activeTab }),
      setActiveFlowSection: (activeFlowSection: ActiveFlowSection) => set({ activeFlowSection }),
      setSelectedQuestionId: (selectedQuestionId: string | null) => set({ selectedQuestionId }),
      setExpandedQuestionId: (expandedQuestionId: string | null) => set({ expandedQuestionId }),
      setSelectedDemographicSectionId: (selectedDemographicSectionId: string | null) =>
        set({ selectedDemographicSectionId }),

      // =========================================================================
      // META ACTIONS
      // =========================================================================

      setStudyId: (studyId: string | null) => set({ studyId }),
      setHydrated: (isHydrated: boolean) => set({ isHydrated }),
      setSaveStatus: (saveStatus: SaveStatus) => set({ saveStatus }),

      markSaved: () => {
        const state = get()
        set({
          _snapshot: createSnapshot({
            flowSettings: state.flowSettings,
            screeningQuestions: state.screeningQuestions,
            preStudyQuestions: state.preStudyQuestions,
            postStudyQuestions: state.postStudyQuestions,
            surveyQuestions: state.surveyQuestions,
          }),
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
        })
      },

      // Race-condition-safe: mark saved with the EXACT data that was sent to the API
      markSavedWithData: (data: {
        flowSettings: StudyFlowSettings
        screeningQuestions: StudyFlowQuestion[]
        preStudyQuestions: StudyFlowQuestion[]
        postStudyQuestions: StudyFlowQuestion[]
        surveyQuestions: StudyFlowQuestion[]
      }) => {
        set({
          _snapshot: createSnapshot(data),
          saveStatus: 'saved',
          lastSavedAt: Date.now(),
        })
      },

      markClean: () => {
        const state = get()
        set({
          _snapshot: createSnapshot({
            flowSettings: state.flowSettings,
            screeningQuestions: state.screeningQuestions,
            preStudyQuestions: state.preStudyQuestions,
            postStudyQuestions: state.postStudyQuestions,
            surveyQuestions: state.surveyQuestions,
          }),
        })
      },

      loadSettingsFromExternal: (flowSettings: StudyFlowSettings) => {
        const merged = createStudyFlowSettings(flowSettings)
        const state = get()
        const snapshot = createSnapshot({
          flowSettings: merged,
          screeningQuestions: state.screeningQuestions,
          preStudyQuestions: state.preStudyQuestions,
          postStudyQuestions: state.postStudyQuestions,
          surveyQuestions: state.surveyQuestions,
        })
        set({
          flowSettings: merged,
          _snapshot: snapshot,
          saveStatus: 'idle',
          lastSavedAt: Date.now(),
        })
      },

      loadFromApi: (data: {
        flowSettings: StudyFlowSettings
        screeningQuestions: StudyFlowQuestion[]
        preStudyQuestions: StudyFlowQuestion[]
        postStudyQuestions: StudyFlowQuestion[]
        surveyQuestions: StudyFlowQuestion[]
        studyId: string
      }) => {
        // Merge with defaults to fill missing keys from older studies
        let migratedFlowSettings = createStudyFlowSettings(data.flowSettings)
        if (
          migratedFlowSettings.participantIdentifier?.type === 'demographic_profile' &&
          migratedFlowSettings.participantIdentifier.demographicProfile
        ) {
          const migratedProfile = migrateDemographicProfile(
            migratedFlowSettings.participantIdentifier.demographicProfile
          )
          migratedFlowSettings = {
            ...migratedFlowSettings,
            participantIdentifier: {
              ...migratedFlowSettings.participantIdentifier,
              demographicProfile: migratedProfile,
            },
          }
        }

        // Defensive: auto-enable sections that have questions, but ONLY when the
        // enabled flag was never explicitly set (undefined). Do NOT override explicit
        // false — that means the user intentionally disabled the section.
        if (data.screeningQuestions.length > 0 && migratedFlowSettings.screening?.enabled !== false) {
          migratedFlowSettings = { ...migratedFlowSettings, screening: { ...migratedFlowSettings.screening, enabled: true } }
        }
        if (data.preStudyQuestions.length > 0 && migratedFlowSettings.preStudyQuestions?.enabled !== false) {
          migratedFlowSettings = { ...migratedFlowSettings, preStudyQuestions: { ...migratedFlowSettings.preStudyQuestions, enabled: true } }
        }
        if (data.postStudyQuestions.length > 0 && migratedFlowSettings.postStudyQuestions?.enabled !== false) {
          migratedFlowSettings = { ...migratedFlowSettings, postStudyQuestions: { ...migratedFlowSettings.postStudyQuestions, enabled: true } }
        }

        const snapshot = createSnapshot({
          flowSettings: migratedFlowSettings,
          screeningQuestions: data.screeningQuestions,
          preStudyQuestions: data.preStudyQuestions,
          postStudyQuestions: data.postStudyQuestions,
          surveyQuestions: data.surveyQuestions,
        })

        set({
          flowSettings: migratedFlowSettings,
          screeningQuestions: data.screeningQuestions,
          preStudyQuestions: data.preStudyQuestions,
          postStudyQuestions: data.postStudyQuestions,
          surveyQuestions: data.surveyQuestions,
          _snapshot: snapshot,
          studyId: data.studyId,
          saveStatus: 'idle',
          lastSavedAt: Date.now(),
          selectedQuestionId: null,
          expandedQuestionId: null,
        })
      },

      reset: () =>
        set({
          flowSettings: defaultStudyFlowSettings,
          screeningQuestions: [],
          preStudyQuestions: [],
          postStudyQuestions: [],
          surveyQuestions: [],
          _snapshot: null,
          activeTab: 'content',
          activeFlowSection: 'welcome',
          selectedQuestionId: null,
          expandedQuestionId: null,
          selectedDemographicSectionId: null,
          studyId: null,
          saveStatus: 'idle',
          lastSavedAt: null,
          isHydrated: false,
        }),
    }),
    {
      name: 'study-flow-builder',
      // Only persist the data that should survive a refresh
      partialize: (state) => ({
        flowSettings: state.flowSettings,
        screeningQuestions: state.screeningQuestions,
        preStudyQuestions: state.preStudyQuestions,
        postStudyQuestions: state.postStudyQuestions,
        surveyQuestions: state.surveyQuestions,
        _snapshot: state._snapshot,
        studyId: state.studyId,
        lastSavedAt: state.lastSavedAt,
      }),
      // Handle SSR - don't hydrate until client-side
      skipHydration: true,
      onRehydrateStorage: () => (state, error) => {
        // Always mark as hydrated, even if state is undefined (no localStorage data)
        if (state) {
          state.isHydrated = true

          // Clean up any duplicate sections from persisted state
          const demographicProfile = state.flowSettings.participantIdentifier.demographicProfile
          if (demographicProfile?.sections) {
            const uniqueSections = demographicProfile.sections.filter((s, index, self) =>
              index === self.findIndex((t) => t.id === s.id)
            )

            // Only update if duplicates were found
            if (uniqueSections.length !== demographicProfile.sections.length) {
              state.flowSettings.participantIdentifier.demographicProfile = {
                ...demographicProfile,
                sections: uniqueSections,
              }
            }
          }
        } else {
          studyFlowBuilderStore.setState({ isHydrated: true })
        }
      },
    }
  )
)

// Trigger hydration once at module load (client-side only)
if (typeof window !== 'undefined') {
  studyFlowBuilderStore.persist.rehydrate()
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export the store hook
export const useStudyFlowBuilderStore = studyFlowBuilderStore

// Re-export types
export type { StudyFlowBuilderState, SaveStatus, BuilderTab, ActiveFlowSection } from './types'

// Re-export helpers for external use
export { selectFlowIsDirty } from './helpers'

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

export const useFlowSettings = () => studyFlowBuilderStore((state) => state.flowSettings)
export const useScreeningQuestions = () => studyFlowBuilderStore((state) => state.screeningQuestions)
export const usePreStudyQuestions = () => studyFlowBuilderStore((state) => state.preStudyQuestions)
export const usePostStudyQuestions = () => studyFlowBuilderStore((state) => state.postStudyQuestions)
export const useSurveyQuestions = () => studyFlowBuilderStore((state) => state.surveyQuestions)
export const useActiveFlowSection = () => studyFlowBuilderStore((state) => state.activeFlowSection)
export const useFlowIsDirty = () => studyFlowBuilderStore(selectFlowIsDirty)
