/**
 * Prototype Test Builder Store
 *
 * Uses the builder store factory for consistent patterns.
 * Manages prototype, frames, tasks, and settings for prototype test studies.
 */

import { useShallow } from 'zustand/react/shallow'
import type {
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestTask,
  PrototypeTestSettings,
  PostTaskQuestion,
} from '@veritio/study-types'
import { toJson } from '@veritio/core'
import {
  createBuilderStore,
  createPostTaskQuestionsActions,
  type SaveStatus,
  type PostTaskQuestionsActions,
} from './factory/index'

// Snapshot type for dirty detection
interface PrototypeTestSnapshot {
  prototype: PrototypeTestPrototype | null
  frames: PrototypeTestFrame[]
  tasks: PrototypeTestTask[]
  settings: PrototypeTestSettings
}

// Data fields for the store
interface PrototypeTestData {
  prototype: PrototypeTestPrototype | null
  frames: PrototypeTestFrame[]
  tasks: PrototypeTestTask[]
  settings: PrototypeTestSettings
}

// Prototype-test specific extensions
interface PrototypeTestExtensions extends PostTaskQuestionsActions {
  // Sync state
  isSyncing: boolean
  setIsSyncing: (syncing: boolean) => void

  // Prototype actions
  setPrototype: (prototype: PrototypeTestPrototype | null) => void
  clearPrototype: () => void

  // Frame actions
  setFrames: (frames: PrototypeTestFrame[]) => void

  // Task actions
  setTasks: (tasks: PrototypeTestTask[]) => void
  addTask: (task: Omit<PrototypeTestTask, 'id' | 'created_at' | 'post_task_questions'>) => string
  updateTask: (id: string, updates: Partial<PrototypeTestTask>) => void
  removeTask: (id: string) => void
  reorderTasks: (tasks: PrototypeTestTask[]) => void

  // Settings actions
  setSettings: (settings: Partial<PrototypeTestSettings>) => void

  // Save actions
  markSavedWithData: (data: PrototypeTestSnapshot) => void
  loadFromApi: (data: PrototypeTestData & { studyId: string }) => void
}

const defaultPrototypeTestSettings: PrototypeTestSettings = {
  randomizeTasks: true,
  allowSkipTasks: true,
  allowFailureResponse: false,
  showTaskProgress: true,
  dontRandomizeFirstTask: true,
  clickableAreaFlashing: true,
  tasksEndAutomatically: true,
  showEachParticipantTasks: 'all',
  scalePrototype: 'fit', // Maze default: scale down to fit
  taskInstructionPosition: 'top-left',
  taskFeedbackPageMode: 'one_per_page', // Default: one question per page
}

// Create the store using the factory
const result = createBuilderStore<PrototypeTestData, PrototypeTestSnapshot, PrototypeTestExtensions>({
  name: 'prototype-test-builder',

  dataFields: {
    fields: ['prototype', 'frames', 'tasks', 'settings'],
  },

  defaults: {
    prototype: null,
    frames: [],
    tasks: [],
    settings: defaultPrototypeTestSettings,
  },

  defaultSettings: defaultPrototypeTestSettings,

  additionalResetFields: {
    isSyncing: false,
  },

  extensions: (set, get) => {
    // Get post-task question actions from mixin
    const postTaskQuestionActions = createPostTaskQuestionsActions<
      PrototypeTestTask,
      PrototypeTestData & { tasks: PrototypeTestTask[] }
    >(set as any)

    return {
      // Sync state
      isSyncing: false,
      setIsSyncing: (isSyncing) => set({ isSyncing } as any),

      // Prototype actions
      setPrototype: (prototype) => set({ prototype } as any),
      clearPrototype: () => set({ prototype: null, frames: [], tasks: [] } as any),

      // Frame actions
      setFrames: (frames) => set({ frames } as any),

      // Task actions
      setTasks: (tasks) => set({ tasks } as any),

      addTask: (task) => {
        const newTaskId = crypto.randomUUID()
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              ...task,
              id: newTaskId,
              created_at: new Date().toISOString(),
              post_task_questions: toJson([]),
            } as PrototypeTestTask,
          ],
        }) as any)
        return newTaskId
      },

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

      // These are added by the factory, but TypeScript needs them in extensions type
      markSavedWithData: () => {},
      loadFromApi: () => {},
    }
  },
})

// Re-export types for consumers
export type { SaveStatus }
export type PrototypeTestBuilderState = ReturnType<typeof result.useStore.getState>

// Export the store hooks
export const usePrototypeTestBuilderStore = result.useStore

// Expose subscribe and persist for backwards compatibility
;(usePrototypeTestBuilderStore as unknown as Record<string, unknown>).subscribe = result.store.subscribe
;(usePrototypeTestBuilderStore as unknown as Record<string, unknown>).persist = (result.store as unknown as { persist: unknown }).persist

export const usePrototypeTestIsDirty = result.useIsDirty

// For backwards compatibility - expose isDirty selector
// Uses version-based detection from factory for consistency
export const selectPrototypeTestIsDirty = (state: ReturnType<typeof result.useStore.getState>): boolean => {
  return state._version !== state._savedVersion
}

// Granular selectors - subscribe to individual slices to prevent unnecessary re-renders
export const usePrototypeTestPrototype = () => usePrototypeTestBuilderStore((s) => s.prototype)
export const usePrototypeTestFrames = () => usePrototypeTestBuilderStore((s) => s.frames)
export const usePrototypeTestTasks = () => usePrototypeTestBuilderStore((s) => s.tasks)
export const usePrototypeTestSettings = () => usePrototypeTestBuilderStore((s) => s.settings)

// State selectors - subscribe to individual state fields
export const usePrototypeTestStudyId = () => usePrototypeTestBuilderStore((s) => s.studyId)
export const usePrototypeTestSaveStatus = () => usePrototypeTestBuilderStore((s) => s.saveStatus)
export const usePrototypeTestIsHydrated = () => usePrototypeTestBuilderStore((s) => s.isHydrated)
export const usePrototypeTestIsSyncing = () => usePrototypeTestBuilderStore((s) => s.isSyncing)
export const usePrototypeTestLastSavedAt = () => usePrototypeTestBuilderStore((s) => s.lastSavedAt)

// Action selector - functions are stable references, group them together
// Uses useShallow to prevent infinite loops from object reference changes
export const usePrototypeTestActions = () =>
  usePrototypeTestBuilderStore(
    useShallow((s) => ({
      // Prototype actions
      setPrototype: s.setPrototype,
      clearPrototype: s.clearPrototype,
      // Frame actions
      setFrames: s.setFrames,
      // Task actions
      setTasks: s.setTasks,
      addTask: s.addTask,
      updateTask: s.updateTask,
      removeTask: s.removeTask,
      reorderTasks: s.reorderTasks,
      // Settings actions
      setSettings: s.setSettings,
      // Sync actions
      setIsSyncing: s.setIsSyncing,
      // Post-task question actions
      addPostTaskQuestion: s.addPostTaskQuestion,
      updatePostTaskQuestion: s.updatePostTaskQuestion,
      removePostTaskQuestion: s.removePostTaskQuestion,
      reorderPostTaskQuestions: s.reorderPostTaskQuestions,
    }))
  )

