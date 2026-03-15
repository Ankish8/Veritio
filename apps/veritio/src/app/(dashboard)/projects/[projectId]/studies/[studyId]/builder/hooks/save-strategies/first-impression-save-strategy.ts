/**
 * First Impression Save Strategy
 *
 * Handles saving First Impression study type content.
 * Uses first-impression endpoint for designs and settings.
 */

import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useFirstImpressionBuilderStore, selectFirstImpressionIsDirty } from '@/stores/study-builder'
import type { ExtendedFirstImpressionSettings } from '@veritio/study-types/study-flow-types'
import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot } from './types'
import {
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
  markContentSavedIfUnchanged,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
} from './save-utils'

export const firstImpressionSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = useFirstImpressionBuilderStore.getState()
    const isContentDirty = selectFirstImpressionIsDirty(contentStore)

    // If nothing is dirty, skip the save entirely
    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setFirstImpressionSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    // Capture exact data being sent BEFORE the API call
    let sentFirstImpressionData: {
      designs: typeof contentStore.designs
      settings: typeof contentStore.settings
    } | null = null
    let sentFlowData: FlowDataSnapshot | null = null

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    try {
      const savePromises: Promise<Response>[] = []

      // Only save content if it's dirty
      if (isContentDirty) {
        const { designs, settings } = contentStore

        // In shared mode, ensure all non-practice designs have the same questions
        // (source of truth = first non-practice design)
        let syncedDesigns = designs
        if ((settings.questionMode ?? 'shared') === 'shared') {
          const firstNonPractice = designs.find((d) => !d.is_practice)
          if (firstNonPractice) {
            const sharedQuestions = firstNonPractice.questions || []
            syncedDesigns = designs.map((d) =>
              d.is_practice ? d : { ...d, questions: sharedQuestions }
            )
          }
        }

        sentFirstImpressionData = JSON.parse(JSON.stringify({ designs: syncedDesigns, settings }))

        // Save designs via bulk update endpoint
        savePromises.push(
          withRetry(() => authFetch(`/api/studies/${studyId}/first-impression/designs/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ designs: syncedDesigns }),
          }).then(throwOnServerError))
        )

        // Save extended settings with studyFlow to main study record
        const extendedSettings = extendSettings(settings, flowStore) as ExtendedFirstImpressionSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Only save flow if it's dirty (and content wasn't - otherwise settings already saved above)
      if (isFlowDirty && !isContentDirty) {
        const extendedSettings = extendSettings(contentStore.settings, flowStore) as ExtendedFirstImpressionSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Save flow questions if flow is dirty
      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      // Handle save results
      await handleSaveResults(savePromises, (status) => {
        if (isContentDirty) stores.setFirstImpressionSaveStatus(status)
        if (isFlowDirty) stores.setFlowSaveStatus(status)
      })

      // Mark as saved with EXACT data that was sent
      if (isContentDirty && sentFirstImpressionData) {
        markContentSavedIfUnchanged(useFirstImpressionBuilderStore, sentFirstImpressionData, () => {
          const s = useFirstImpressionBuilderStore.getState()
          return { designs: s.designs, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, 'First Impression')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')

      return { saved: true, savedTypes }
    } catch (error) {
      if (isContentDirty) stores.setFirstImpressionSaveStatus('error')
      if (isFlowDirty) stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
