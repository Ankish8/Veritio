import { useShallow } from 'zustand/react/shallow'
import {
  createBuilderStore,
  createPostTaskQuestionsActions,
  type PostTaskQuestionsActions,
} from '@veritio/prototype-test/stores/factory'
import type { Json } from '@veritio/prototype-test/lib/supabase/types'
import { toJson } from '@veritio/core'
import type { ThinkAloudSettings, EyeTrackingSettings } from '@/components/builders/shared/types'

export interface UrlPathStep {
  id: string
  type: 'navigation' | 'click'
  pathname: string
  fullUrl: string
  label: string
  // Click-specific fields
  selector?: string
  elementText?: string
  wildcardSegments?: number[]  // 0-based indices of pathname.split('/') segments treated as wildcards
  wildcardParams?: string[]    // query param keys where any value matches
  group?: string   // Steps with same group ID = unordered set
}

export interface UrlSuccessPath {
  version: 1
  mode: 'strict' | 'flexible'
  steps: UrlPathStep[]
}

export interface LiveWebsiteVariant {
  id: string
  study_id: string
  name: string
  position: number
  url: string
  weight: number
}

export interface LiveWebsiteTaskVariant {
  id?: string
  task_id: string
  variant_id: string
  study_id: string
  starting_url?: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path' | null
  success_url?: string | null
  success_path?: UrlSuccessPath | null
  time_limit_seconds?: number | null
}

export type VariantName = 'A' | 'B' | 'C' | 'D' | 'E'
const VARIANT_NAMES: VariantName[] = ['A', 'B', 'C', 'D', 'E']

export interface LiveWebsiteTask {
  id: string
  title: string
  instructions: string
  target_url: string
  success_url: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path'
  success_path: UrlSuccessPath | null
  time_limit_seconds: number | null
  order_position: number
  post_task_questions: Json
}

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface LiveWebsiteSettings {
  websiteUrl: string
  mode: 'url_only' | 'snippet' | 'reverse_proxy'
  snippetId: string | null
  snippetVerified: boolean
  recordScreen: boolean
  recordWebcam: boolean
  recordMicrophone: boolean
  trackClickEvents: boolean
  trackScrollDepth: boolean
  allowMobile: boolean
  allowSkipTasks: boolean
  showTaskProgress: boolean
  defaultTimeLimitSeconds: number | null
  authInstructions: string
  widgetPosition: WidgetPosition
  blockBeforeStart: boolean
  abTestingEnabled?: boolean
  thinkAloud?: ThinkAloudSettings
  eyeTracking?: EyeTrackingSettings
  completionButtonText?: string
  createdFromUseCase?: string
}

interface LiveWebsiteData {
  tasks: LiveWebsiteTask[]
  settings: LiveWebsiteSettings
  variants: LiveWebsiteVariant[]
  taskVariants: LiveWebsiteTaskVariant[]
  selectedVariantId: string | null
}

interface LiveWebsiteExtensions extends PostTaskQuestionsActions {
  addTask: () => string
  updateTask: (id: string, updates: Partial<LiveWebsiteTask>) => void
  removeTask: (id: string) => void
  reorderTasks: (tasks: LiveWebsiteTask[]) => void
  setSettings: (settings: Partial<LiveWebsiteSettings>) => void
  markSavedWithData: (data: LiveWebsiteData) => void
  loadFromApi: (data: LiveWebsiteData & { studyId: string }) => void
  addVariant: () => string
  updateVariant: (id: string, updates: Partial<Omit<LiveWebsiteVariant, 'id' | 'study_id'>>) => void
  removeVariant: (id: string) => void
  reorderVariants: (variants: LiveWebsiteVariant[]) => void
  setSelectedVariantId: (id: string | null) => void
  setTaskVariantCriteria: (taskId: string, variantId: string, criteria: Partial<Omit<LiveWebsiteTaskVariant, 'task_id' | 'variant_id' | 'study_id'>>) => void
  setAbTestingEnabled: (enabled: boolean) => void
}

const defaultSettings: LiveWebsiteSettings = {
  websiteUrl: '',
  mode: 'reverse_proxy',
  snippetId: null,
  snippetVerified: false,
  recordScreen: true,
  recordWebcam: true,
  recordMicrophone: true,
  trackClickEvents: true,
  trackScrollDepth: true,
  allowMobile: false,
  allowSkipTasks: true,
  showTaskProgress: true,
  defaultTimeLimitSeconds: null,
  authInstructions: '',
  widgetPosition: 'bottom-right',
  blockBeforeStart: true,
  abTestingEnabled: false,
  thinkAloud: {
    enabled: true,
    showEducation: true,
    silenceThresholdSeconds: 8,
    audioLevelThreshold: 0.15,
    promptPosition: 'top-right' as const,
  },
  eyeTracking: {
    enabled: false,
    showCalibration: true,
  },
  completionButtonText: 'I completed this task',
}

const result = createBuilderStore<LiveWebsiteData, LiveWebsiteData, LiveWebsiteExtensions>({
  name: 'live-website-builder',
  dataFields: {
    fields: ['tasks', 'settings', 'variants', 'taskVariants'],
  },
  defaults: {
    tasks: [],
    settings: defaultSettings,
    variants: [],
    taskVariants: [],
    selectedVariantId: null,
  },
  defaultSettings,
  extensions: (set, get) => ({
    addTask: () => {
      const newTaskId = crypto.randomUUID()
      const state = get()
      const newTask: LiveWebsiteTask = {
        id: newTaskId,
        title: '',
        instructions: '',
        target_url: '',
        success_url: null,
        success_criteria_type: 'self_reported',
        success_path: null,
        time_limit_seconds: null,
        order_position: state.tasks.length,
        post_task_questions: toJson([]),
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
    setSettings: (settings) =>
      set((state) => ({
        settings: { ...state.settings, ...settings },
      }) as any),
    ...createPostTaskQuestionsActions<LiveWebsiteTask, LiveWebsiteData>(set as any),
    markSavedWithData: () => {},
    loadFromApi: (data) => {
      set({
        tasks: data.tasks,
        settings: { ...defaultSettings, ...data.settings },
        variants: (data as any).variants || [],
        taskVariants: (data as any).taskVariants || [],
        selectedVariantId: ((data as any).variants as LiveWebsiteVariant[] | undefined)?.[0]?.id ?? null,
      } as any)
    },
    addVariant: () => {
      const state = get()
      const position = state.variants.length
      const name = VARIANT_NAMES[position] || String.fromCharCode(65 + position)
      const newVariant: LiveWebsiteVariant = {
        id: crypto.randomUUID(),
        study_id: state.studyId || '',
        name,
        position,
        url: '',
        weight: 50,
      }
      set((s) => ({ variants: [...s.variants, newVariant] }) as any)
      return newVariant.id
    },
    updateVariant: (id, updates) =>
      set((state) => ({
        variants: state.variants.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        ),
      }) as any),
    removeVariant: (id) =>
      set((state) => ({
        variants: state.variants.filter((v) => v.id !== id),
        taskVariants: state.taskVariants.filter((tv) => tv.variant_id !== id),
        selectedVariantId: state.selectedVariantId === id
          ? (state.variants.find((v) => v.id !== id)?.id ?? null)
          : state.selectedVariantId,
      }) as any),
    reorderVariants: (variants) => set({ variants } as any),
    setSelectedVariantId: (id) => set({ selectedVariantId: id } as any),
    setTaskVariantCriteria: (taskId, variantId, criteria) =>
      set((state) => {
        const existing = state.taskVariants.find(
          (tv) => tv.task_id === taskId && tv.variant_id === variantId
        )
        if (existing) {
          return {
            taskVariants: state.taskVariants.map((tv) =>
              tv.task_id === taskId && tv.variant_id === variantId
                ? { ...tv, ...criteria }
                : tv
            ),
          } as any
        }
        return {
          taskVariants: [
            ...state.taskVariants,
            {
              task_id: taskId,
              variant_id: variantId,
              study_id: state.studyId || '',
              success_criteria_type: null,
              success_url: null,
              success_path: null,
              time_limit_seconds: null,
              ...criteria,
            },
          ],
        } as any
      }),
    setAbTestingEnabled: (enabled) =>
      set((state) => ({
        settings: {
          ...state.settings,
          abTestingEnabled: enabled,
          ...(enabled ? { mode: 'reverse_proxy' as const } : {}),
        },
      }) as any),
  }),
})

export const useLiveWebsiteBuilderStore = result.useStore
export const useLiveWebsiteIsDirty = result.useIsDirty
export const selectLiveWebsiteIsDirty = (state: ReturnType<typeof result.useStore.getState>): boolean => {
  return state._version !== state._savedVersion
}

export const useLiveWebsiteTasks = () => useLiveWebsiteBuilderStore((s) => s.tasks)
export const useLiveWebsiteSettings = () => useLiveWebsiteBuilderStore((s) => s.settings)
export const useLiveWebsiteVariants = () => useLiveWebsiteBuilderStore((s) => s.variants)
export const useLiveWebsiteTaskVariants = () => useLiveWebsiteBuilderStore((s) => s.taskVariants)
export const useLiveWebsiteSelectedVariantId = () => useLiveWebsiteBuilderStore((s) => s.selectedVariantId)
export const useLiveWebsiteActions = () =>
  useLiveWebsiteBuilderStore(
    useShallow((s) => ({
      addTask: s.addTask,
      updateTask: s.updateTask,
      removeTask: s.removeTask,
      reorderTasks: s.reorderTasks,
      setSettings: s.setSettings,
      addPostTaskQuestion: s.addPostTaskQuestion,
      updatePostTaskQuestion: s.updatePostTaskQuestion,
      removePostTaskQuestion: s.removePostTaskQuestion,
      reorderPostTaskQuestions: s.reorderPostTaskQuestions,
      addVariant: s.addVariant,
      updateVariant: s.updateVariant,
      removeVariant: s.removeVariant,
      reorderVariants: s.reorderVariants,
      setSelectedVariantId: s.setSelectedVariantId,
      setTaskVariantCriteria: s.setTaskVariantCriteria,
      setAbTestingEnabled: s.setAbTestingEnabled,
    }))
  )
