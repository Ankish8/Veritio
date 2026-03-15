/**
 * Tree Test Builder Store
 *
 * Uses the builder store factory for consistent patterns.
 * Manages nodes, tasks, and settings for tree test studies.
 */

import { useShallow } from 'zustand/react/shallow'
import type { TreeNode, Task, TreeTestSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { castJsonArray, toJson } from '@veritio/core'
import { createSnapshot } from '../lib/utils/deep-equal'
import {
  createBuilderStore,
  createPostTaskQuestionsActions,
  type SaveStatus,
  type PostTaskQuestionsActions,
} from './factory/index'

// Data fields for the store (also used as snapshot type for dirty detection)
interface TreeTestData {
  nodes: TreeNode[]
  tasks: Task[]
  settings: TreeTestSettings
}

// Tree-test specific extensions
interface TreeTestExtensions extends PostTaskQuestionsActions {
  // Expanded nodes state (not persisted, not part of dirty detection)
  expandedNodes: Set<string>

  // Node actions
  setNodes: (nodes: TreeNode[]) => void
  addNode: (node: Omit<TreeNode, 'id' | 'created_at'>) => string
  updateNode: (id: string, updates: Partial<TreeNode>) => void
  removeNode: (id: string) => void
  reorderNodes: (nodes: TreeNode[]) => void
  moveNode: (nodeId: string, newParentId: string | null, newPosition: number) => void

  // Expand/collapse actions
  toggleExpanded: (id: string) => void
  expandAll: () => void
  collapseAll: () => void

  // Task actions
  setTasks: (tasks: Task[]) => void
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'post_task_questions'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void

  // Settings actions
  setSettings: (settings: Partial<TreeTestSettings>) => void

  // Save actions
  markSavedWithData: (data: TreeTestData) => void
  loadFromApi: (data: TreeTestData & { studyId: string }) => void
}

const defaultTreeTestSettings: TreeTestSettings = {
  randomizeTasks: false,
  showBreadcrumbs: true,
  allowBack: true,
  showTaskProgress: true,
  allowSkipTasks: true,
  dontRandomizeFirstTask: false,
  answerButtonText: "I'd find it here",
  taskFeedbackPageMode: 'one_per_page', // Default: one question per page
}

// Helper function to get all descendant IDs of a node
function getDescendantIds(nodes: TreeNode[], nodeId: string): string[] {
  const descendants: string[] = []
  const childIds = nodes.filter((n) => n.parent_id === nodeId).map((n) => n.id)

  for (const childId of childIds) {
    descendants.push(childId)
    descendants.push(...getDescendantIds(nodes, childId))
  }

  return descendants
}

// Create the store using the factory
const result = createBuilderStore<TreeTestData, TreeTestData, TreeTestExtensions>({
  name: 'tree-test-builder',

  dataFields: {
    fields: ['nodes', 'tasks', 'settings'],
  },

  defaults: {
    nodes: [],
    tasks: [],
    settings: defaultTreeTestSettings,
  },

  defaultSettings: defaultTreeTestSettings,

  additionalResetFields: {
    expandedNodes: new Set<string>(),
  },

  // Custom loadFromApi to expand all nodes on load
  customLoadFromApi: (set, _get, data) => {
    const snapshot = createSnapshot({
      nodes: data.nodes,
      tasks: data.tasks,
      settings: data.settings,
    })
    set(({
      nodes: data.nodes,
      tasks: data.tasks,
      settings: data.settings,
      studyId: data.studyId,
      _snapshot: snapshot,
      saveStatus: 'idle',
      lastSavedAt: Date.now(),
      expandedNodes: new Set(data.nodes.map((n) => n.id)),
    }) as any)
  },

  extensions: (set, get) => {
    // Get post-task question actions from mixin
    const postTaskQuestionActions = createPostTaskQuestionsActions<
      Task,
      TreeTestData & { tasks: Task[] }
    >(set as any)

    return {
      // Expanded nodes state
      expandedNodes: new Set<string>(),

      // Node actions
      setNodes: (nodes) => set({ nodes } as any),

      addNode: (node) => {
        const newNodeId = crypto.randomUUID()
        set((state) => {
          const newExpanded = new Set(state.expandedNodes)
          if (node.parent_id) {
            newExpanded.add(node.parent_id)
          }
          newExpanded.add(newNodeId)
          return ({
            nodes: [
              ...state.nodes,
              {
                ...node,
                id: newNodeId,
                created_at: new Date().toISOString(),
              } as TreeNode,
            ],
            expandedNodes: newExpanded,
          }) as any
        })
        return newNodeId
      },

      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...updates } : node
          ),
        }) as any),

      removeNode: (id) =>
        set((state) => {
          const descendantIds = getDescendantIds(state.nodes, id)
          const idsToRemove = new Set([id, ...descendantIds])

          // Update tasks to remove references to deleted nodes
          const updatedTasks = state.tasks.map((task) => {
            const updated = { ...task }

            if (task.correct_node_id && idsToRemove.has(task.correct_node_id)) {
              updated.correct_node_id = null
            }

            const currentIds = castJsonArray<string>(task.correct_node_ids)
            const filteredIds = currentIds.filter((nodeId) => !idsToRemove.has(nodeId))
            if (filteredIds.length !== currentIds.length) {
              updated.correct_node_ids = toJson(filteredIds)
            }

            return updated
          })

          const newExpanded = new Set(state.expandedNodes)
          idsToRemove.forEach((nodeId) => newExpanded.delete(nodeId))

          return ({
            nodes: state.nodes.filter((node) => !idsToRemove.has(node.id)),
            tasks: updatedTasks,
            expandedNodes: newExpanded,
          }) as any
        }),

      reorderNodes: (nodes) => set({ nodes } as any),

      moveNode: (nodeId, newParentId, newPosition) =>
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId)
          if (!node) return state

          const oldParentId = node.parent_id
          const oldPosition = node.position

          if (oldParentId === newParentId && oldPosition === newPosition) return state

          let updatedNodes = [...state.nodes]

          if (oldParentId === newParentId) {
            updatedNodes = updatedNodes.map((n) => {
              if (n.parent_id !== oldParentId) return n
              if (n.id === nodeId) return { ...n, position: newPosition }
              if (oldPosition < newPosition) {
                if (n.position > oldPosition && n.position <= newPosition) {
                  return { ...n, position: n.position - 1 }
                }
              } else {
                if (n.position >= newPosition && n.position < oldPosition) {
                  return { ...n, position: n.position + 1 }
                }
              }
              return n
            })
          } else {
            // Cross-parent move: single pass to update moved node + reindex both parents
            updatedNodes = updatedNodes.map((n) => {
              if (n.id === nodeId) {
                return { ...n, parent_id: newParentId, position: newPosition }
              }
              // Close gap in old parent
              if (n.parent_id === oldParentId && n.position > oldPosition) {
                return { ...n, position: n.position - 1 }
              }
              // Open gap in new parent
              if (n.parent_id === newParentId && n.position >= newPosition) {
                return { ...n, position: n.position + 1 }
              }
              return n
            })
          }

          const newExpanded = new Set(state.expandedNodes)
          if (newParentId && !newExpanded.has(newParentId)) {
            newExpanded.add(newParentId)
          }

          return ({ nodes: updatedNodes, expandedNodes: newExpanded }) as any
        }),

      // Expand/collapse actions
      toggleExpanded: (id) =>
        set((state) => {
          const newExpanded = new Set(state.expandedNodes)
          if (newExpanded.has(id)) {
            newExpanded.delete(id)
          } else {
            newExpanded.add(id)
          }
          return ({ expandedNodes: newExpanded }) as any
        }),

      expandAll: () =>
        set((state) => ({
          expandedNodes: new Set(state.nodes.map((n) => n.id)),
        }) as any),

      collapseAll: () => set({ expandedNodes: new Set() } as any),

      // Task actions
      setTasks: (tasks) => set({ tasks } as any),

      addTask: (task) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              post_task_questions: [],
              correct_node_ids: [],
            } as Task,
          ],
        }) as any),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }) as any),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        }) as any),

      reorderTasks: (tasks) => set({ tasks } as any),

      // Settings actions
      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }) as any),

      // Post-task question actions from mixin
      ...postTaskQuestionActions,

      // Placeholder stubs — factory overwrites these with real implementations
      markSavedWithData: () => {},
      loadFromApi: () => {},
    }
  },
})

// Re-export SaveStatus type for consumers
export type { SaveStatus }

// Export the store hooks
export const useTreeTestBuilderStore = result.useStore

// Expose subscribe and persist for backwards compatibility
;(useTreeTestBuilderStore as any).subscribe = result.store.subscribe
;(useTreeTestBuilderStore as any).persist = (result.store as unknown as { persist: unknown }).persist

export const useTreeTestIsDirty = result.useIsDirty

// For backwards compatibility - expose isDirty selector
// Uses version-based detection from factory for consistency
export const selectTreeTestIsDirty = (state: ReturnType<typeof result.useStore.getState>): boolean => {
  return state._version !== state._savedVersion
}
// Granular Selectors for Performance Optimization
// Use these instead of destructuring the entire store to prevent unnecessary
// re-renders when unrelated state changes.

// Data selectors
export const useTreeTestNodes = () => useTreeTestBuilderStore((s) => s.nodes)
export const useTreeTestTasks = () => useTreeTestBuilderStore((s) => s.tasks)
export const useTreeTestSettings = () => useTreeTestBuilderStore((s) => s.settings)
export const useTreeTestExpandedNodes = () => useTreeTestBuilderStore((s) => s.expandedNodes)

// State selectors
export const useTreeTestStudyId = () => useTreeTestBuilderStore((s) => s.studyId)
export const useTreeTestSaveStatus = () => useTreeTestBuilderStore((s) => s.saveStatus)
export const useTreeTestIsHydrated = () => useTreeTestBuilderStore((s) => s.isHydrated)
export const useTreeTestLastSavedAt = () => useTreeTestBuilderStore((s) => s.lastSavedAt)

// Action selector - uses useShallow to prevent infinite loops from object reference changes
export const useTreeTestActions = () =>
  useTreeTestBuilderStore(
    useShallow((s) => ({
      // Node actions
      setNodes: s.setNodes,
      addNode: s.addNode,
      updateNode: s.updateNode,
      removeNode: s.removeNode,
      reorderNodes: s.reorderNodes,
      moveNode: s.moveNode,
      // Expand/collapse actions
      toggleExpanded: s.toggleExpanded,
      expandAll: s.expandAll,
      collapseAll: s.collapseAll,
      // Task actions
      setTasks: s.setTasks,
      addTask: s.addTask,
      updateTask: s.updateTask,
      removeTask: s.removeTask,
      reorderTasks: s.reorderTasks,
      // Settings actions
      setSettings: s.setSettings,
      // Post-task question actions
      addPostTaskQuestion: s.addPostTaskQuestion,
      updatePostTaskQuestion: s.updatePostTaskQuestion,
      removePostTaskQuestion: s.removePostTaskQuestion,
      reorderPostTaskQuestions: s.reorderPostTaskQuestions,
    }))
  )
