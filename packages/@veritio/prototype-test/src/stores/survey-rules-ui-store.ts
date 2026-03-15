/**
 * Survey Rules UI Store
 *
 * Lightweight store for UI-only state. All data fetching and mutations
 * are handled by the useSurveyRules and useSurveyVariables SWR hooks.
 */

import { create } from 'zustand'

interface SurveyRulesUIState {
  // Editing state
  editingRuleId: string | null
  editingVariableId: string | null

  // Selection state
  selectedRuleIds: Set<string>
  searchQuery: string

  // Actions
  setEditingRuleId: (ruleId: string | null) => void
  setEditingVariableId: (variableId: string | null) => void
  setSearchQuery: (query: string) => void

  // Selection actions
  toggleRuleSelection: (ruleId: string) => void
  selectRules: (ruleIds: string[]) => void
  deselectAllRules: () => void

  reset: () => void
}

const initialState = {
  editingRuleId: null,
  editingVariableId: null,
  selectedRuleIds: new Set<string>(),
  searchQuery: '',
}

export const useSurveyRulesUIStore = create<SurveyRulesUIState>((set) => ({
  ...initialState,

  setEditingRuleId: (ruleId) => {
    set({ editingRuleId: ruleId })
  },

  setEditingVariableId: (variableId) => {
    set({ editingVariableId: variableId })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  toggleRuleSelection: (ruleId) => {
    set((state) => {
      const newSelection = new Set(state.selectedRuleIds)
      if (newSelection.has(ruleId)) {
        newSelection.delete(ruleId)
      } else {
        newSelection.add(ruleId)
      }
      return { selectedRuleIds: newSelection }
    })
  },

  selectRules: (ruleIds) => {
    set({ selectedRuleIds: new Set(ruleIds) })
  },

  deselectAllRules: () => {
    set({ selectedRuleIds: new Set() })
  },

  reset: () => {
    set({
      editingRuleId: null,
      editingVariableId: null,
      selectedRuleIds: new Set<string>(),
      searchQuery: '',
    })
  },
}))
