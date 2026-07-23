/**
 * First Impression Save Strategy
 *
 * Handles saving First Impression study type content.
 * Uses first-impression endpoint for designs and settings.
 */

import { throwOnServerError } from '@/lib/utils/retry'
import { useFirstImpressionBuilderStore, selectFirstImpressionIsDirty } from '@/stores/study-builder'
import type { ExtendedFirstImpressionSettings } from '@veritio/study-types/study-flow-types'
import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot, SaveStatus } from './types'
import {
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
  markContentSavedIfUnchanged,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
  withAutosaveRetry,
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

    const setStatus = (status: SaveStatus) => {
      if (isContentDirty) stores.setFirstImpressionSaveStatus(status)
      if (isFlowDirty) stores.setFlowSaveStatus(status)
    }

    setStatus('saving')

    // Capture exact data being sent BEFORE the API call
    let sentFirstImpressionData: {
      designs: typeof contentStore.designs
      settings: typeof contentStore.settings
    } | null = null
    let sentFlowData: FlowDataSnapshot | null = null
    const sentContentVersion = contentStore._version
    const sentFlowVersion = flowStore._version

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    try {
      const savePromises: Promise<Response>[] = []

      // Only save content if it's dirty
      if (isContentDirty) {
        const { designs, settings } = contentStore
        // Shared-question actions already update every non-practice design in the
        // store. Persist the exact current state instead of silently transforming
        // it after the revision was captured.
        sentFirstImpressionData = JSON.parse(JSON.stringify({ designs, settings }))

        // Save designs via bulk update endpoint
        savePromises.push(
          withAutosaveRetry((signal) =>
            authFetch(`/api/studies/${studyId}/first-impression/designs/reorder`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ designs }),
              signal,
            }).then(throwOnServerError)
          )
        )
      }

      // Settings are always saved when anything is dirty (they include studyFlow)
      const extendedSettings = extendSettings(contentStore.settings, flowStore) as ExtendedFirstImpressionSettings
      savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))

      // Save flow questions if flow is dirty
      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      await handleSaveResults(savePromises, setStatus)

      // Mark as saved with EXACT data that was sent
      if (isContentDirty && sentFirstImpressionData) {
        markContentSavedIfUnchanged(useFirstImpressionBuilderStore, sentFirstImpressionData, sentContentVersion, () => {
          const s = useFirstImpressionBuilderStore.getState()
          return { designs: s.designs, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, sentFlowVersion, 'First Impression')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')
      return { saved: true, savedTypes }
    } catch (error) {
      setStatus('error')
      throw error
    }
  },
}
