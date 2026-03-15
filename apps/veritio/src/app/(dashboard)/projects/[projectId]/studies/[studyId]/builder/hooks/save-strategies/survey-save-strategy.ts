/**
 * Survey Save Strategy
 *
 * Handles saving Survey study type content.
 * Survey is unique - it only has flow questions (no separate content store).
 */

import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot } from './types'
import {
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
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
      const savePromises: Promise<Response>[] = []

      // Save survey settings and flow settings
      const surveySettings = {
        showOneQuestionPerPage: flowStore.flowSettings.surveyQuestionnaire?.pageMode === 'one_per_page',
        randomizeQuestions: flowStore.flowSettings.surveyQuestionnaire?.randomizeQuestions ?? false,
        showProgressBar: flowStore.flowSettings.surveyQuestionnaire?.showProgressBar ?? true,
        allowSkipQuestions: flowStore.flowSettings.surveyQuestionnaire?.allowSkipQuestions ?? false,
        studyFlow: flowStore.flowSettings,
      }

      savePromises.push(
        withRetry(() => authFetch(`/api/studies/${studyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: surveySettings,
            welcome_message: flowStore.flowSettings.welcome.message,
            thank_you_message: flowStore.flowSettings.thankYou.message,
          }),
        }).then(throwOnServerError))
      )

      // Save all survey flow questions (screening + survey)
      // Filter out incomplete questions (empty question_text)
      const allQuestions = [
        ...flowStore.screeningQuestions,
        ...flowStore.surveyQuestions,
      ].filter(q => q.question_text.trim() !== '')

      savePromises.push(
        withRetry(() => authFetch(`/api/studies/${studyId}/flow-questions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: allQuestions }),
        }).then(throwOnServerError))
      )

      await handleSaveResults(savePromises, stores.setFlowSaveStatus)

      markFlowSavedIfUnchanged(sentFlowData, 'Survey')

      return { saved: true, savedTypes: ['flow'] }
    } catch (error) {
      stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
