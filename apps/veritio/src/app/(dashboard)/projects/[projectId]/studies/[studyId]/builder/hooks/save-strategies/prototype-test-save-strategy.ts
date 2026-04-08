/**
 * Prototype Test Save Strategy
 *
 * Handles saving Prototype Test study type content.
 * Includes complex success_pathway sanitization handling 4 formats:
 * - V3 (step-based with state): { version: 3, paths: [{ steps, frames }] }
 * - V2 (multi-path): { version: 2, paths: [...] }
 * - V1 (single path): { frames: [...], strict: boolean }
 * - Legacy (array): string[]
 */

import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { usePrototypeTestBuilderStore, selectPrototypeTestIsDirty } from '@/stores/study-builder'
import {
  type SuccessPathway,
  type PrototypeTestPrototype,
  type PrototypeTestFrame,
  type PrototypeTestTask,
  type PrototypeTestSettings,
} from '@veritio/study-types'
import type { ExtendedPrototypeTestSettings } from '@veritio/study-types/study-flow-types'
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
import { sanitizeSuccessPathway } from './pathway-sanitizer'

export const prototypeTestSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = usePrototypeTestBuilderStore.getState()
    const isContentDirty = selectPrototypeTestIsDirty(contentStore)

    // If nothing is dirty, skip the save entirely (A/B tests save immediately via SWR)
    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setPrototypeTestSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    // Capture exact data being sent BEFORE the API call
    let sentPrototypeTestData: {
      prototype: PrototypeTestPrototype | null
      frames: PrototypeTestFrame[]
      tasks: PrototypeTestTask[]
      settings: PrototypeTestSettings
    } | null = null
    let sentFlowData: FlowDataSnapshot | null = null

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    try {
      const savePromises: Promise<Response>[] = []

      // Only save content if it's dirty
      if (isContentDirty) {
        const { tasks, settings, prototype, frames } = contentStore
        sentPrototypeTestData = JSON.parse(JSON.stringify({
          prototype,
          frames,
          tasks,
          settings,
        }))

        // Sanitize tasks before sending - ensure fields are properly structured for API
        const validCriteriaTypes = new Set(['destination', 'pathway', 'component_state'])
        const sanitizedTasks = tasks.map(task => ({
          ...task,
          success_criteria_type: validCriteriaTypes.has(task.success_criteria_type as string)
            ? task.success_criteria_type
            : 'destination',
          success_pathway: sanitizeSuccessPathway(task.success_pathway as SuccessPathway),
        }))

        // Save tasks via bulk update endpoint
        savePromises.push(
          withRetry(() => authFetch(`/api/studies/${studyId}/prototype-tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: sanitizedTasks }),
          }).then(throwOnServerError))
        )

        // Save prototype metadata (password, starting_frame_id) if prototype exists
        if (prototype) {
          savePromises.push(
            withRetry(() => authFetch(`/api/studies/${studyId}/prototype`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                password: prototype.password ?? null,
                starting_frame_id: prototype.starting_frame_id ?? null,
              }),
            }).then(throwOnServerError))
          )
        }

        // Save settings
        const extendedSettings = extendSettings(settings, flowStore) as ExtendedPrototypeTestSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Only save flow if it's dirty (and content wasn't - otherwise settings already saved above)
      if (isFlowDirty && !isContentDirty) {
        const extendedSettings = extendSettings(contentStore.settings, flowStore) as ExtendedPrototypeTestSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Save flow questions if flow is dirty
      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      // Handle save results
      await handleSaveResults(savePromises, (status) => {
        if (isContentDirty) stores.setPrototypeTestSaveStatus(status)
        if (isFlowDirty) stores.setFlowSaveStatus(status)
      })

      // Mark as saved with EXACT data that was sent
      if (isContentDirty && sentPrototypeTestData) {
        markContentSavedIfUnchanged(usePrototypeTestBuilderStore, sentPrototypeTestData, () => {
          const s = usePrototypeTestBuilderStore.getState()
          return { prototype: s.prototype, frames: s.frames, tasks: s.tasks, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, 'Prototype Test')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')
      return { saved: true, savedTypes }
    } catch (error) {
      if (isContentDirty) stores.setPrototypeTestSaveStatus('error')
      if (isFlowDirty) stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
