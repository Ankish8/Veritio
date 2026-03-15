'use client'

import { create } from 'zustand'

/**
 * Store for tracking highlighted items from validation navigation
 */
interface ValidationHighlightState {
  /** ID of the currently highlighted item (card, category, node, task, question, design) */
  highlightedItemId: string | null
  /** Type of the highlighted item for CSS class differentiation */
  highlightedItemType: 'card' | 'category' | 'node' | 'task' | 'question' | 'design' | null
  /** Set the highlighted item */
  setHighlightedItem: (id: string | null, type?: 'card' | 'category' | 'node' | 'task' | 'question' | 'design' | null) => void
  /** Clear the highlight */
  clearHighlight: () => void
}

export const useValidationHighlightStore = create<ValidationHighlightState>((set) => ({
  highlightedItemId: null,
  highlightedItemType: null,
  setHighlightedItem: (id, type = null) => set({ highlightedItemId: id, highlightedItemType: type }),
  clearHighlight: () => set({ highlightedItemId: null, highlightedItemType: null }),
}))

// Selector hooks for performance
export const useHighlightedItemId = () => useValidationHighlightStore((state) => state.highlightedItemId)
export const useIsItemHighlighted = (itemId: string) =>
  useValidationHighlightStore((state) => state.highlightedItemId === itemId)
