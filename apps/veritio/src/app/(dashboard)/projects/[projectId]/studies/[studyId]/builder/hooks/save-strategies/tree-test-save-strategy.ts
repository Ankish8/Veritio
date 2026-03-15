/**
 * Tree Test Save Strategy
 *
 * Handles saving Tree Test study type content.
 * Uses tree_nodes table and tasks table for content.
 */

import { withRetry, throwOnServerError } from '@/lib/utils/retry'
import { useTreeTestBuilderStore, selectTreeTestIsDirty } from '@/stores/study-builder'
import type { TreeNode, Task, TreeTestSettings } from '@veritio/study-types'
import type { ExtendedTreeTestSettings } from '@veritio/study-types/study-flow-types'
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

export const treeTestSaveStrategy: SaveStrategy = {
  async save(context: SaveContext): Promise<SaveResult> {
    const { studyId, flowStore, isFlowDirty, authFetch, stores } = context

    const contentStore = useTreeTestBuilderStore.getState()
    const isContentDirty = selectTreeTestIsDirty(contentStore)

    // If nothing is dirty, skip the save entirely (A/B tests save immediately via SWR)
    if (!isContentDirty && !isFlowDirty) {
      return { saved: false, savedTypes: [] }
    }

    if (isContentDirty) stores.setTreeTestSaveStatus('saving')
    if (isFlowDirty) stores.setFlowSaveStatus('saving')

    // Capture exact data being sent BEFORE the API call
    let sentTreeTestData: { nodes: TreeNode[]; tasks: Task[]; settings: TreeTestSettings } | null = null
    let sentFlowData: FlowDataSnapshot | null = null

    if (isFlowDirty) {
      sentFlowData = captureFlowDataSnapshot(flowStore)
    }

    try {
      const savePromises: Promise<Response>[] = []

      // Only save content if it's dirty
      if (isContentDirty) {
        const { nodes, tasks, settings } = contentStore

        // Validate data before sending
        if (!Array.isArray(nodes) || !Array.isArray(tasks)) {
          stores.setTreeTestSaveStatus('error')
          throw new Error('Invalid tree test data. Please refresh the page.')
        }

        sentTreeTestData = JSON.parse(JSON.stringify({ nodes, tasks, settings }))

        savePromises.push(
          withRetry(() => authFetch(`/api/studies/${studyId}/tree-nodes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes }),  // API expects { nodes: [...] }
          }).then(throwOnServerError)),
          withRetry(() => authFetch(`/api/studies/${studyId}/tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tasks),
          }).then(throwOnServerError))
        )

        const extendedSettings = extendSettings(settings, flowStore) as ExtendedTreeTestSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Only save flow if it's dirty (and content wasn't - otherwise settings already saved above)
      if (isFlowDirty && !isContentDirty) {
        const extendedSettings = extendSettings(contentStore.settings, flowStore) as ExtendedTreeTestSettings
        savePromises.push(saveStudySettings(studyId, extendedSettings, flowStore, authFetch))
      }

      // Save flow questions if flow is dirty
      if (isFlowDirty) {
        savePromises.push(saveFlowQuestions(studyId, flowStore, authFetch))
      }

      // Handle save results
      await handleSaveResults(savePromises, (status) => {
        if (isContentDirty) stores.setTreeTestSaveStatus(status)
        if (isFlowDirty) stores.setFlowSaveStatus(status)
      })

      // Mark as saved with EXACT data that was sent
      if (isContentDirty && sentTreeTestData) {
        markContentSavedIfUnchanged(useTreeTestBuilderStore, sentTreeTestData, () => {
          const s = useTreeTestBuilderStore.getState()
          return { nodes: s.nodes, tasks: s.tasks, settings: s.settings }
        })
      }

      if (isFlowDirty && sentFlowData) {
        markFlowSavedIfUnchanged(sentFlowData, 'Tree Test')
      }

      const savedTypes: ('content' | 'flow')[] = []
      if (isContentDirty) savedTypes.push('content')
      if (isFlowDirty) savedTypes.push('flow')
      return { saved: true, savedTypes }
    } catch (error) {
      if (isContentDirty) stores.setTreeTestSaveStatus('error')
      if (isFlowDirty) stores.setFlowSaveStatus('error')
      throw error
    }
  }
}
