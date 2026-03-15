'use client'

import { create } from 'zustand'
interface ValidationHighlightState {
  highlightedItemId: string | null
  highlightedItemType: 'card' | 'category' | 'node' | 'task' | 'question' | 'design' | null
  setHighlightedItem: (id: string | null, type?: 'card' | 'category' | 'node' | 'task' | 'question' | 'design' | null) => void
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
