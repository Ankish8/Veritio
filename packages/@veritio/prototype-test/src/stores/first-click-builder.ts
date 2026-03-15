import { useShallow } from 'zustand/react/shallow'
import type {
  FirstClickTask,
  FirstClickImage,
  FirstClickAOI,
  FirstClickTestSettings,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { toJson } from '@veritio/core'
import {
  createBuilderStore,
  createPostTaskQuestionsActions,
  type SaveStatus,
  type PostTaskQuestionsActions,
} from './factory/index'

export interface FirstClickTaskWithDetails extends FirstClickTask {
  image: FirstClickImage | null
  aois: FirstClickAOI[]
}

interface FirstClickData {
  tasks: FirstClickTaskWithDetails[]
  settings: FirstClickTestSettings
}

// First-click specific extensions
interface FirstClickExtensions extends PostTaskQuestionsActions {
  // Task actions
  setTasks: (tasks: FirstClickTaskWithDetails[]) => void
  addTask: () => string
  updateTask: (id: string, updates: Partial<FirstClickTask>) => void
  removeTask: (id: string) => void
  reorderTasks: (tasks: FirstClickTaskWithDetails[]) => void

  // Image actions
  setTaskImage: (taskId: string, image: FirstClickImage) => void
  updateTaskImage: (taskId: string, updates: Partial<FirstClickImage>) => void
  clearTaskImage: (taskId: string) => void

  // AOI actions
  addAOI: (taskId: string, aoi: Omit<FirstClickAOI, 'id' | 'created_at' | 'updated_at'>) => string
  updateAOI: (taskId: string, aoiId: string, updates: Partial<FirstClickAOI>) => void
  removeAOI: (taskId: string, aoiId: string) => void
  setAOIs: (taskId: string, aois: FirstClickAOI[]) => void

  // Settings actions
  setSettings: (settings: Partial<FirstClickTestSettings>) => void

  // Save actions
  markSavedWithData: (data: FirstClickData) => void
  loadFromApi: (data: FirstClickData & { studyId: string }) => void
}

const defaultFirstClickSettings: FirstClickTestSettings = {
  allowSkipTasks: true,
  startTasksImmediately: false,
  randomizeTasks: true,
  dontRandomizeFirstTask: true,
  showEachParticipantTasks: 'all',
  showTaskProgress: true,
  imageScaling: 'scale_on_small',
  taskInstructionPosition: 'top-left',
  taskFeedbackPageMode: 'one_per_page', // Default: one question per page
}

// Create the store using the factory
const result = createBuilderStore<FirstClickData, FirstClickData, FirstClickExtensions>({
  name: 'first-click-builder',

  dataFields: {
    fields: ['tasks', 'settings'],
  },

  defaults: {
    tasks: [],
    settings: defaultFirstClickSettings,
  },

  defaultSettings: defaultFirstClickSettings,

  extensions: (set, get) => {
    // Get post-task question actions from mixin
    const postTaskQuestionActions = createPostTaskQuestionsActions<
      FirstClickTaskWithDetails,
      FirstClickData & { tasks: FirstClickTaskWithDetails[] }
    >(set as any)

    return {
      // Task actions
      setTasks: (tasks) => set({ tasks } as any),

      addTask: () => {
        const newTaskId = crypto.randomUUID()
        const state = get()
        const newTask: FirstClickTaskWithDetails = {
          id: newTaskId,
          study_id: state.studyId ?? '',
          instruction: '',
          position: state.tasks.length,
          post_task_questions: toJson([]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image: null,
          aois: [],
        }
        set((s) => ({
          tasks: [...s.tasks, newTask],
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

      // Image actions
      setTaskImage: (taskId, image) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, image } : task
          ),
        }) as any),

      updateTaskImage: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId && task.image
              ? { ...task, image: { ...task.image, ...updates } }
              : task
          ),
        }) as any),

      clearTaskImage: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, image: null, aois: [] } : task
          ),
        }) as any),

      // AOI actions
      addAOI: (taskId, aoi) => {
        const newAoiId = crypto.randomUUID()
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  aois: [
                    ...task.aois,
                    {
                      ...aoi,
                      id: newAoiId,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    } as FirstClickAOI,
                  ],
                }
              : task
          ),
        }) as any)
        return newAoiId
      },

      updateAOI: (taskId, aoiId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  aois: task.aois.map((aoi) =>
                    aoi.id === aoiId ? { ...aoi, ...updates } : aoi
                  ),
                }
              : task
          ),
        }) as any),

      removeAOI: (taskId, aoiId) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  aois: task.aois.filter((aoi) => aoi.id !== aoiId),
                }
              : task
          ),
        }) as any),

      setAOIs: (taskId, aois) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, aois } : task
          ),
        }) as any),

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

export type { SaveStatus }

export const useFirstClickBuilderStore = result.useStore
export const useFirstClickIsDirty = result.useIsDirty

export const selectFirstClickIsDirty = (state: ReturnType<typeof result.useStore.getState>): boolean => {
  return state._version !== state._savedVersion
}

// Granular selectors — each subscribes to a single slice to avoid unnecessary re-renders
export const useFirstClickTasks = () => useFirstClickBuilderStore((s) => s.tasks)
export const useFirstClickSettings = () => useFirstClickBuilderStore((s) => s.settings)
export const useFirstClickStudyId = () => useFirstClickBuilderStore((s) => s.studyId)
export const useFirstClickSaveStatus = () => useFirstClickBuilderStore((s) => s.saveStatus)
export const useFirstClickIsHydrated = () => useFirstClickBuilderStore((s) => s.isHydrated)
export const useFirstClickLastSavedAt = () => useFirstClickBuilderStore((s) => s.lastSavedAt)

// Action selector — useShallow prevents re-renders from object reference changes
export const useFirstClickActions = () =>
  useFirstClickBuilderStore(
    useShallow((s) => ({
      // Task actions
      setTasks: s.setTasks,
      addTask: s.addTask,
      updateTask: s.updateTask,
      removeTask: s.removeTask,
      reorderTasks: s.reorderTasks,
      // Image actions
      setTaskImage: s.setTaskImage,
      updateTaskImage: s.updateTaskImage,
      clearTaskImage: s.clearTaskImage,
      // AOI actions
      addAOI: s.addAOI,
      updateAOI: s.updateAOI,
      removeAOI: s.removeAOI,
      setAOIs: s.setAOIs,
      // Settings actions
      setSettings: s.setSettings,
      // Post-task question actions
      addPostTaskQuestion: s.addPostTaskQuestion,
      updatePostTaskQuestion: s.updatePostTaskQuestion,
      removePostTaskQuestion: s.removePostTaskQuestion,
      reorderPostTaskQuestions: s.reorderPostTaskQuestions,
    }))
  )

