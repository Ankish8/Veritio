/**
 * Survey Sections UI Store
 *
 * Lightweight store for UI-only state. All data fetching and mutations
 * are handled by the useSurveySections SWR hook.
 */

import { create } from 'zustand'

interface SurveySectionsUIState {
  // UI state
  editingSectionId: string | null
  selectedSectionId: string | null

  // Actions
  setEditingSectionId: (sectionId: string | null) => void
  setSelectedSectionId: (sectionId: string | null) => void
  clearSelection: () => void
  reset: () => void
}

const initialState = {
  editingSectionId: null,
  selectedSectionId: null,
}

export const useSurveySectionsUIStore = create<SurveySectionsUIState>((set) => ({
  ...initialState,

  setEditingSectionId: (sectionId) => {
    set({ editingSectionId: sectionId })
  },

  setSelectedSectionId: (sectionId) => {
    set({ selectedSectionId: sectionId })
  },

  clearSelection: () => {
    set({ editingSectionId: null, selectedSectionId: null })
  },

  reset: () => {
    set(initialState)
  },
}))
