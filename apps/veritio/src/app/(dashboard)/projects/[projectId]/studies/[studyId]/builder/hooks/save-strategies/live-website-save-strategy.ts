import { throwOnServerError } from '@/lib/utils/retry'
import { useLiveWebsiteBuilderStore, selectLiveWebsiteIsDirty } from '@/stores/study-builder'
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

export const liveWebsiteSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = useLiveWebsiteBuilderStore.getState()
    const isContentDirty = selectLiveWebsiteIsDirty(contentStore)

    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setLiveWebsiteSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    let sentContentData: Pick<typeof contentStore, 'tasks' | 'settings' | 'variants' | 'taskVariants'> | null = null
    let sentFlowData: FlowDataSnapshot | null = null
    const sentContentVersion = contentStore._version
    const sentFlowVersion = flowStore._version

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    const setStatus = (status: SaveStatus) => {
      if (isContentDirty) stores.setLiveWebsiteSaveStatus(status)
      if (isFlowDirty) stores.setFlowSaveStatus(status)
    }

    try {
      const savePromises: Promise<Response>[] = []

      if (isContentDirty) {
        const { tasks, settings, variants, taskVariants } = contentStore
        sentContentData = JSON.parse(JSON.stringify({ tasks, settings, variants, taskVariants }))

        savePromises.push(
          withAutosaveRetry((signal) =>
            authFetch(`/api/studies/${studyId}/live-website`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              // When flow is dirty, the extended-settings PATCH below is the sole
              // settings writer. This prevents parallel whole-document writes.
              body: JSON.stringify({
                tasks,
                ...(isFlowDirty ? {} : { settings }),
              }),
              signal,
            }).then(throwOnServerError)
          )
        )

        const abTestingEnabled = settings?.abTestingEnabled === true
        if (abTestingEnabled) {
          if (variants && variants.length > 0) {
            savePromises.push(
              withAutosaveRetry((signal) =>
                authFetch(`/api/studies/${studyId}/live-website/variants/reorder`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ variants }),
                  signal,
                }).then(throwOnServerError)
              )
            )
          }

          if (taskVariants && taskVariants.length > 0) {
            savePromises.push(
              withAutosaveRetry((signal) =>
                authFetch(`/api/studies/${studyId}/live-website/task-variants`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ taskVariants }),
                  signal,
                }).then(throwOnServerError)
              )
            )
          }
        }
      }

      // Only save settings + flow questions via separate PATCH when flow is dirty.
      // Content settings (websiteUrl, mode, etc.) are saved in the PUT endpoint above,
      // so we don't need a separate PATCH just for content-only changes.
      // This eliminates one full auth middleware chain (~2-4s) for content-only saves.
      if (isFlowDirty) {
        const extendedSettings = extendSettings(contentStore.settings, flowStore)
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      await handleSaveResults(savePromises, setStatus)

      if (isContentDirty && sentContentData) {
        markContentSavedIfUnchanged(useLiveWebsiteBuilderStore, sentContentData, sentContentVersion, () => {
          const s = useLiveWebsiteBuilderStore.getState()
          return {
            tasks: s.tasks,
            settings: s.settings,
            variants: s.variants,
            taskVariants: s.taskVariants,
          }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, sentFlowVersion, 'Live Website')
      }

      const savedTypes = [...(isContentDirty ? ['content' as const] : []), ...(isFlowDirty ? ['flow' as const] : [])]
      return { saved: true, savedTypes }
    } catch (error) {
      setStatus('error')
      throw error
    }
  },
}
