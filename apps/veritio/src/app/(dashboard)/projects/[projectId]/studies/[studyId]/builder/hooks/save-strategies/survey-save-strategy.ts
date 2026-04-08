/**
 * Survey Save Strategy
 *
 * Handles saving Survey study type content.
 * Survey is unique - it only has flow questions (no separate content store).
 */

import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot } from './types'
import {
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
} from './save-utils'

export const surveySaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    // Skip if nothing is dirty (A/B tests save immediately via SWR)
    if (!isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    try {
      // Capture exact data being sent BEFORE the API call
      const sentFlowData: FlowDataSnapshot = captureFlowDataSnapshot(flowStore)

      stores.setFlowSaveStatus('saving')

      // Build survey-specific settings derived from flow settings
      const surveySettings = {
        showOneQuestionPerPage: flowStore.flowSettings.surveyQuestionnaire?.pageMode === 'one_per_page',
        randomizeQuestions: flowStore.flowSettings.surveyQuestionnaire?.randomizeQuestions ?? false,
        showProgressBar: flowStore.flowSettings.surveyQuestionnaire?.showProgressBar ?? true,
        allowSkipQuestions: flowStore.flowSettings.surveyQuestionnaire?.allowSkipQuestions ?? false,
      }

      const extendedSettings = extendSettings(surveySettings, flowStore)

      await handleSaveResults(
        [
          saveStudySettings(studyId, extendedSettings, flowStore, authFetch),
          saveFlowQuestions(studyId, flowStore, authFetch, true),
        ],
        stores.setFlowSaveStatus,
      )

      markFlowSavedIfUnchanged(sentFlowData, 'Survey')

      return { saved: true, savedTypes: ['flow'] }
    } catch (error) {
      stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
