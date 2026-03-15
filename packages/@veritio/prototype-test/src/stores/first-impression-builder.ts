/**
 * First Impression Test Builder Store
 *
 * Uses the builder store factory for consistent patterns.
 * Manages designs (with per-design questions) and settings for first impression test studies.
 */

import { useShallow } from 'zustand/react/shallow'
import type {
  FirstImpressionDesign,
  FirstImpressionDesignQuestion,
  ExtendedFirstImpressionSettings,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { DEFAULT_FIRST_IMPRESSION_SETTINGS } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { createBuilderStore, type SaveStatus } from './factory/index'

// Use the extended settings type for the store
type FirstImpressionBuilderSettings = ExtendedFirstImpressionSettings

// Snapshot type for dirty detection
interface FirstImpressionSnapshot {
  designs: FirstImpressionDesign[]
  settings: FirstImpressionBuilderSettings
}

// Data fields for the store
interface FirstImpressionData {
  designs: FirstImpressionDesign[]
  settings: FirstImpressionBuilderSettings
}

// First impression specific extensions
interface FirstImpressionExtensions {
  // Design actions
  setDesigns: (designs: FirstImpressionDesign[]) => void
  addDesign: () => string
  updateDesign: (id: string, updates: Partial<FirstImpressionDesign>) => void
  removeDesign: (id: string) => void
  reorderDesigns: (designs: FirstImpressionDesign[]) => void

  // Design image actions
  setDesignImage: (
    designId: string,
    image: {
      image_url: string
      original_filename?: string | null
      width?: number | null
      height?: number | null
      source_type: 'upload' | 'figma'
      figma_file_key?: string | null
      figma_node_id?: string | null
    }
  ) => void
  setDesignMobileImage: (
    designId: string,
    mobileImage: {
      mobile_image_url: string
      mobile_width?: number | null
      mobile_height?: number | null
    }
  ) => void
  clearDesignImage: (designId: string) => void

  // Design weight actions
  setDesignWeight: (designId: string, weight: number) => void
  setDesignPractice: (designId: string, isPractice: boolean) => void

  // Per-design question actions
  setDesignQuestions: (designId: string, questions: FirstImpressionDesignQuestion[]) => void
  addDesignQuestion: (
    designId: string,
    question: Omit<FirstImpressionDesignQuestion, 'id' | 'position'>
  ) => string
  updateDesignQuestion: (
    designId: string,
    questionId: string,
    updates: Partial<FirstImpressionDesignQuestion>
  ) => void
  removeDesignQuestion: (designId: string, questionId: string) => void
  reorderDesignQuestions: (designId: string, questions: FirstImpressionDesignQuestion[]) => void

  // Shared question actions (syncs questions across all non-practice designs)
  setSharedQuestions: (questions: FirstImpressionDesignQuestion[]) => void
  addSharedQuestion: (question: Omit<FirstImpressionDesignQuestion, 'id' | 'position'>) => string
  updateSharedQuestion: (questionId: string, updates: Partial<FirstImpressionDesignQuestion>) => void
  removeSharedQuestion: (questionId: string) => void
  reorderSharedQuestions: (questions: FirstImpressionDesignQuestion[]) => void

  // Settings actions
  setSettings: (settings: Partial<FirstImpressionBuilderSettings>) => void

  // Save actions
  markSavedWithData: (data: FirstImpressionSnapshot) => void
  loadFromApi: (data: FirstImpressionData & { studyId: string }) => void
}

const defaultFirstImpressionSettings: FirstImpressionBuilderSettings = {
  exposureDurationMs: 5000,
  countdownDurationMs: 3000,
  showTimerToParticipant: true,
  showProgressIndicator: true,
  displayMode: 'fit',
  backgroundColor: '#ffffff',
  questionDisplayMode: 'one_per_page',
  randomizeQuestions: false,
  questionMode: 'shared',
  designAssignmentMode: 'random_single',
  allowPracticeDesign: false,
}

// Create the store using the factory
const result = createBuilderStore<
  FirstImpressionData,
  FirstImpressionSnapshot,
  FirstImpressionExtensions
>({
  name: 'first-impression-builder',

  dataFields: {
    fields: ['designs', 'settings'],
  },

  defaults: {
    designs: [],
    settings: defaultFirstImpressionSettings,
  },

  defaultSettings: defaultFirstImpressionSettings,

  additionalResetFields: {},

  extensions: (set, get) => {
    return {
      // Design actions
      setDesigns: (designs) => set({ designs } as any),

      addDesign: () => {
        const newDesignId = crypto.randomUUID()
        const now = new Date().toISOString()
        // Calculate name inside set() to avoid race conditions with rapid clicks
        set((state) => {
          const currentDesigns = state.designs || []
          const newPosition = currentDesigns.length
          const newDesign: FirstImpressionDesign = {
            id: newDesignId,
            study_id: state.studyId ?? '',
            name: `Design ${newPosition + 1}`,
            position: newPosition,
            image_url: null,
            original_filename: null,
            source_type: 'upload',
            figma_file_key: null,
            figma_node_id: null,
            width: null,
            height: null,
            mobile_image_url: null,
            mobile_width: null,
            mobile_height: null,
            display_mode: 'fit',
            background_color: '#ffffff',
            weight: 100,
            is_practice: false,
            questions: [],
            created_at: now,
            updated_at: now,
          }
          return { designs: [...currentDesigns, newDesign] }
        })
        return newDesignId
      },

      updateDesign: (id, updates) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === id
              ? { ...design, ...updates, updated_at: new Date().toISOString() }
              : design
          ),
        }) as any),

      removeDesign: (id) =>
        set((state) => ({
          designs: (state.designs || [])
            .filter((design) => design.id !== id)
            .map((design, index) => ({ ...design, position: index })),
        }) as any),

      reorderDesigns: (designs) =>
        set({
          // When reordering, clear practice status from any design not in position 0
          designs: designs.map((d, index) => ({
            ...d,
            position: index,
            // Only first design (position 0) can be practice
            is_practice: index === 0 ? d.is_practice : false,
          })),
        } as any),

      // Design image actions
      setDesignImage: (designId, image) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  image_url: image.image_url,
                  original_filename: image.original_filename ?? null,
                  width: image.width ?? null,
                  height: image.height ?? null,
                  source_type: image.source_type,
                  figma_file_key: image.figma_file_key ?? null,
                  figma_node_id: image.figma_node_id ?? null,
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      setDesignMobileImage: (designId, mobileImage) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  mobile_image_url: mobileImage.mobile_image_url,
                  mobile_width: mobileImage.mobile_width ?? null,
                  mobile_height: mobileImage.mobile_height ?? null,
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      clearDesignImage: (designId) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  image_url: null,
                  original_filename: null,
                  width: null,
                  height: null,
                  source_type: 'upload' as const,
                  figma_file_key: null,
                  figma_node_id: null,
                  mobile_image_url: null,
                  mobile_width: null,
                  mobile_height: null,
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      // Design weight actions
      setDesignWeight: (designId, weight) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? { ...design, weight, updated_at: new Date().toISOString() }
              : design
          ),
        }) as any),

      setDesignPractice: (designId, isPractice) =>
        set((state) => {
          const designs = state.designs || []
          // Only allow practice on the first design (position 0)
          const targetDesign = designs.find((d) => d.id === designId)
          if (isPractice && targetDesign?.position !== 0) {
            return {} // Don't allow setting practice on non-first designs
          }
          const updatedDesigns = designs.map((design) =>
            design.id === designId
              ? { ...design, is_practice: isPractice, updated_at: new Date().toISOString() }
              : design
          )
          // Sync allowPracticeDesign setting with whether any design is practice
          const hasPractice = updatedDesigns.some((d) => d.is_practice)
          return {
            designs: updatedDesigns,
            settings: { ...state.settings, allowPracticeDesign: hasPractice },
          }
        }),

      // Per-design question actions
      setDesignQuestions: (designId, questions) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  questions: questions.map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      addDesignQuestion: (designId, question) => {
        const newQuestionId = crypto.randomUUID()
        set((state) => ({
          designs: (state.designs || []).map((design) => {
            if (design.id !== designId) return design
            const newQuestion: FirstImpressionDesignQuestion = {
              id: newQuestionId,
              position: design.questions.length,
              ...question,
            }
            return {
              ...design,
              questions: [...design.questions, newQuestion],
              updated_at: new Date().toISOString(),
            }
          }),
        }) as any)
        return newQuestionId
      },

      updateDesignQuestion: (designId, questionId, updates) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  questions: design.questions.map((q) =>
                    q.id === questionId ? { ...q, ...updates } : q
                  ),
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      removeDesignQuestion: (designId, questionId) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  questions: design.questions
                    .filter((q) => q.id !== questionId)
                    .map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      reorderDesignQuestions: (designId, questions) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.id === designId
              ? {
                  ...design,
                  questions: questions.map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
              : design
          ),
        }) as any),

      // Shared question actions - apply questions to ALL non-practice designs
      setSharedQuestions: (questions) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.is_practice
              ? design
              : {
                  ...design,
                  questions: questions.map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
          ),
        }) as any),

      addSharedQuestion: (question) => {
        const newQuestionId = crypto.randomUUID()
        set((state) => {
          const firstNonPractice = (state.designs || []).find((d) => !d.is_practice)
          const newPosition = firstNonPractice?.questions?.length ?? 0
          const newQuestion: FirstImpressionDesignQuestion = {
            id: newQuestionId,
            position: newPosition,
            ...question,
          }
          return {
            designs: (state.designs || []).map((design) =>
              design.is_practice
                ? design
                : {
                    ...design,
                    questions: [...design.questions, newQuestion],
                    updated_at: new Date().toISOString(),
                  }
            ),
          }
        })
        return newQuestionId
      },

      updateSharedQuestion: (questionId, updates) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.is_practice
              ? design
              : {
                  ...design,
                  questions: design.questions.map((q) =>
                    q.id === questionId ? { ...q, ...updates } : q
                  ),
                  updated_at: new Date().toISOString(),
                }
          ),
        }) as any),

      removeSharedQuestion: (questionId) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.is_practice
              ? design
              : {
                  ...design,
                  questions: design.questions
                    .filter((q) => q.id !== questionId)
                    .map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
          ),
        }) as any),

      reorderSharedQuestions: (questions) =>
        set((state) => ({
          designs: (state.designs || []).map((design) =>
            design.is_practice
              ? design
              : {
                  ...design,
                  questions: questions.map((q, i) => ({ ...q, position: i })),
                  updated_at: new Date().toISOString(),
                }
          ),
        }) as any),

      // Settings actions
      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }) as any),

      // These are added by the factory, but TypeScript needs them in extensions type
      markSavedWithData: () => {},
      loadFromApi: () => {},
    }
  },
})

// Re-export SaveStatus type for consumers
export type { SaveStatus }

// Export the store hooks
export const useFirstImpressionBuilderStore = result.useStore

// Expose subscribe and persist for backwards compatibility
;(useFirstImpressionBuilderStore as unknown as Record<string, unknown>).subscribe =
  result.store.subscribe
;(useFirstImpressionBuilderStore as unknown as Record<string, unknown>).persist = (
  result.store as unknown as { persist: unknown }
).persist

export const useFirstImpressionIsDirty = result.useIsDirty

// For backwards compatibility - expose isDirty selector
// Uses version-based detection from factory for consistency
export const selectFirstImpressionIsDirty = (
  state: ReturnType<typeof result.useStore.getState>
): boolean => {
  // Use version-based dirty detection (maintained by factory's wrapped set())
  // This is more reliable than snapshot comparison
  return state._version !== state._savedVersion
}
// Granular Selectors for Performance Optimization
// Use these instead of destructuring the entire store to prevent unnecessary
// re-renders when unrelated state changes. Each selector only subscribes to
// its specific slice of state.

// Data selectors - subscribe to individual data fields
export const useFirstImpressionDesigns = () =>
  useFirstImpressionBuilderStore((s) => s.designs)
export const useFirstImpressionSettings = () =>
  useFirstImpressionBuilderStore((s) => s.settings)

// State selectors - subscribe to individual state fields
export const useFirstImpressionStudyId = () =>
  useFirstImpressionBuilderStore((s) => s.studyId)
export const useFirstImpressionSaveStatus = () =>
  useFirstImpressionBuilderStore((s) => s.saveStatus)
export const useFirstImpressionIsHydrated = () =>
  useFirstImpressionBuilderStore((s) => s.isHydrated)
export const useFirstImpressionLastSavedAt = () =>
  useFirstImpressionBuilderStore((s) => s.lastSavedAt)

// Single design selector
export const useFirstImpressionDesign = (designId: string) =>
  useFirstImpressionBuilderStore((s) => s.designs?.find((d) => d.id === designId))

// Action selector - functions are stable references, group them together
// Uses useShallow to prevent infinite loops from object reference changes
export const useFirstImpressionActions = () =>
  useFirstImpressionBuilderStore(
    useShallow((s) => ({
      // Design actions
      setDesigns: s.setDesigns,
      addDesign: s.addDesign,
      updateDesign: s.updateDesign,
      removeDesign: s.removeDesign,
      reorderDesigns: s.reorderDesigns,
      // Design image actions
      setDesignImage: s.setDesignImage,
      setDesignMobileImage: s.setDesignMobileImage,
      clearDesignImage: s.clearDesignImage,
      // Design weight actions
      setDesignWeight: s.setDesignWeight,
      setDesignPractice: s.setDesignPractice,
      // Per-design question actions
      setDesignQuestions: s.setDesignQuestions,
      addDesignQuestion: s.addDesignQuestion,
      updateDesignQuestion: s.updateDesignQuestion,
      removeDesignQuestion: s.removeDesignQuestion,
      reorderDesignQuestions: s.reorderDesignQuestions,
      // Shared question actions
      setSharedQuestions: s.setSharedQuestions,
      addSharedQuestion: s.addSharedQuestion,
      updateSharedQuestion: s.updateSharedQuestion,
      removeSharedQuestion: s.removeSharedQuestion,
      reorderSharedQuestions: s.reorderSharedQuestions,
      // Settings actions
      setSettings: s.setSettings,
    }))
  )
// Computed Selectors

// Get designs excluding practice designs (for A/B testing)
export const useFirstImpressionNonPracticeDesigns = () =>
  useFirstImpressionBuilderStore((s) =>
    (s.designs || []).filter((d) => !d.is_practice)
  )

// Get practice design (if any)
export const useFirstImpressionPracticeDesign = () =>
  useFirstImpressionBuilderStore((s) =>
    (s.designs || []).find((d) => d.is_practice)
  )

// Get total weight of non-practice designs
export const useFirstImpressionTotalWeight = () =>
  useFirstImpressionBuilderStore((s) =>
    (s.designs || []).filter((d) => !d.is_practice).reduce((sum, d) => sum + d.weight, 0)
  )

// Get shared questions (from first non-practice design)
const EMPTY_QUESTIONS: never[] = []
export const useFirstImpressionSharedQuestions = () =>
  useFirstImpressionBuilderStore((s) => {
    const firstNonPractice = (s.designs || []).find((d) => !d.is_practice)
    return firstNonPractice?.questions ?? EMPTY_QUESTIONS
  })
