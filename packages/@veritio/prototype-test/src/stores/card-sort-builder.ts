/**
 * Card Sort Builder Store
 *
 * Uses the builder store factory for consistent patterns.
 * Manages cards, categories, and settings for card sort studies.
 */

import { useShallow } from 'zustand/react/shallow'
import type { Category, CardSortSettings, CardWithImage } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { createBuilderStore, type SaveStatus } from './factory/index'

// Use CardWithImage for store operations (extends Card with optional image)
type CardData = CardWithImage

// Snapshot type for dirty detection
interface CardSortSnapshot {
  cards: CardData[]
  categories: Category[]
  settings: CardSortSettings
}

// Data fields for the store
interface CardSortData {
  cards: CardData[]
  categories: Category[]
  settings: CardSortSettings
}

// Card-sort specific actions
interface CardSortExtensions {
  // Card actions
  setCards: (cards: CardData[]) => void
  addCard: (card: Omit<CardData, 'id' | 'created_at'>) => void
  updateCard: (id: string, updates: Partial<CardData>) => void
  removeCard: (id: string) => void
  reorderCards: (cards: CardData[]) => void

  // Category actions
  setCategories: (categories: Category[]) => void
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => void
  updateCategory: (id: string, updates: Partial<Category>) => void
  removeCategory: (id: string) => void
  reorderCategories: (categories: Category[]) => void

  // Settings actions
  setSettings: (settings: Partial<CardSortSettings>) => void

  // Save actions
  markSavedWithData: (data: CardSortSnapshot) => void
  loadFromApi: (data: CardSortData & { studyId: string }) => void
}

const defaultCardSortSettings: CardSortSettings = {
  mode: 'open',
  randomizeCards: true,
  randomizeCategories: false,
  allowSkip: false,
  showProgress: true,
  showCardDescriptions: false,
  showCardImages: false,
}

// Create the store using the factory
const result = createBuilderStore<CardSortData, CardSortSnapshot, CardSortExtensions>({
  name: 'card-sort-builder',

  dataFields: {
    fields: ['cards', 'categories', 'settings'],
  },

  defaults: {
    cards: [],
    categories: [],
    settings: defaultCardSortSettings,
  },

  defaultSettings: defaultCardSortSettings,

  extensions: (set, get) => ({
    // Card actions
    setCards: (cards) => set({ cards }),

    addCard: (card) =>
      set((state) => ({
        cards: [
          ...state.cards,
          {
            ...card,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          } as CardData,
        ],
      })),

    updateCard: (id, updates) =>
      set((state) => ({
        cards: state.cards.map((card) =>
          card.id === id ? { ...card, ...updates } : card
        ),
      })),

    removeCard: (id) =>
      set((state) => ({
        cards: state.cards.filter((card) => card.id !== id),
      })),

    reorderCards: (cards) => set({ cards }),

    // Category actions
    setCategories: (categories) => set({ categories }),

    addCategory: (category) =>
      set((state) => ({
        categories: [
          ...state.categories,
          {
            ...category,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          } as Category,
        ],
      })),

    updateCategory: (id, updates) =>
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      })),

    removeCategory: (id) =>
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      })),

    reorderCategories: (categories) => set({ categories }),

    // Settings actions
    setSettings: (settings) =>
      set((state) => ({
        settings: { ...state.settings, ...settings },
      })),

    // These are added by the factory, but TypeScript needs them in extensions type
    markSavedWithData: () => {},
    loadFromApi: () => {},
  }),
})

// Re-export SaveStatus type for consumers
export type { SaveStatus }

// Export the store hooks
export const useCardSortBuilderStore = result.useStore
export const useCardSortIsDirty = result.useIsDirty

// For backwards compatibility - expose isDirty selector
// Uses version-based detection from factory for consistency
export const selectCardSortIsDirty = (state: ReturnType<typeof result.useStore.getState>): boolean => {
  return state._version !== state._savedVersion
}
// Granular Selectors for Performance Optimization
// Use these instead of destructuring the entire store to prevent unnecessary
// re-renders when unrelated state changes.

// Data selectors
export const useCardSortCards = () => useCardSortBuilderStore((s) => s.cards)
export const useCardSortCategories = () => useCardSortBuilderStore((s) => s.categories)
export const useCardSortSettings = () => useCardSortBuilderStore((s) => s.settings)

// State selectors
export const useCardSortStudyId = () => useCardSortBuilderStore((s) => s.studyId)
export const useCardSortSaveStatus = () => useCardSortBuilderStore((s) => s.saveStatus)
export const useCardSortIsHydrated = () => useCardSortBuilderStore((s) => s.isHydrated)
export const useCardSortLastSavedAt = () => useCardSortBuilderStore((s) => s.lastSavedAt)

// Action selector - uses useShallow to prevent infinite loops from object reference changes
export const useCardSortActions = () =>
  useCardSortBuilderStore(
    useShallow((s) => ({
      // Card actions
      setCards: s.setCards,
      addCard: s.addCard,
      updateCard: s.updateCard,
      removeCard: s.removeCard,
      reorderCards: s.reorderCards,
      // Category actions
      setCategories: s.setCategories,
      addCategory: s.addCategory,
      updateCategory: s.updateCategory,
      removeCategory: s.removeCategory,
      reorderCategories: s.reorderCategories,
      // Settings actions
      setSettings: s.setSettings,
    }))
  )
