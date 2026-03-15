import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useFirstClickBuilderStore, selectFirstClickIsDirty } from '@/stores/study-builder'
import type { SaveContext, SaveResult, SaveStrategy, FlowDataSnapshot, SaveStatus } from './types'
import {
  captureFlowDataSnapshot,
  handleSaveResults,
  markFlowSavedIfUnchanged,
  markContentSavedIfUnchanged,
  saveFlowQuestions,
  saveStudySettings,
  extendSettings,
} from './save-utils'

export const firstClickSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = useFirstClickBuilderStore.getState()
    const isContentDirty = selectFirstClickIsDirty(contentStore)

    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setFirstClickSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    let sentContentData: { tasks: typeof contentStore.tasks; settings: typeof contentStore.settings } | null = null
    let sentFlowData: FlowDataSnapshot | null = null

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    const setStatus = (status: SaveStatus) => {
      if (isContentDirty) stores.setFirstClickSaveStatus(status)
      if (isFlowDirty) stores.setFlowSaveStatus(status)
    }

    try {
      const savePromises: Promise<Response>[] = []

      if (isContentDirty) {
        const { tasks, settings } = contentStore
        sentContentData = JSON.parse(JSON.stringify({ tasks, settings }))

        savePromises.push(
          withRetry(() => authFetch(`/api/studies/${studyId}/first-click`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks, settings }),
          }).then(throwOnServerError))
        )
      }

      // Settings are always saved when anything is dirty (they include studyFlow)
      const extendedSettings = extendSettings(contentStore.settings, flowStore)
      savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))

      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      await handleSaveResults(savePromises, setStatus)

      if (isContentDirty && sentContentData) {
        markContentSavedIfUnchanged(useFirstClickBuilderStore, sentContentData, () => {
          const s = useFirstClickBuilderStore.getState()
          return { tasks: s.tasks, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, 'First Click')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')
      return { saved: true, savedTypes }
    } catch (error) {
      setStatus('error')
      throw error
    }
  }
}
