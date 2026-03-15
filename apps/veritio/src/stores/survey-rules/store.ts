/**
 * Survey Rules Store
 *
 * @deprecated Use useSurveyRules/useSurveyVariables hooks for data + useSurveyRulesUIStore for UI state.
 * This store is kept for backwards compatibility but will be removed in a future version.
 *
 * Migration:
 * - Rules data: import { useSurveyRules } from '@/hooks'
 * - Variables data: import { useSurveyVariables } from '@/hooks'
 * - UI state: import { useSurveyRulesUIStore } from '@/stores'
 *
 * Zustand store for managing survey rules in the builder.
 * Handles CRUD operations and state management for logic rules.
 */

import { create } from 'zustand'
import type { SurveyRule, SurveyVariable } from '@/lib/supabase/survey-rules-types'
import type { SurveyRulesState, GetTokenFn } from './types'
import { initialState } from './types'
import { fetchApi } from './api-client'

/** Shared logic for bulkEnableRules / bulkDisableRules */
async function bulkToggleRules(
  get: () => SurveyRulesState,
  set: (partial: Partial<SurveyRulesState> | ((state: SurveyRulesState) => Partial<SurveyRulesState>)) => void,
  ruleIds: string[],
  enabled: boolean
) {
  const { studyId, getToken } = get()
  if (!studyId || ruleIds.length === 0) return

  set({ isSaving: true, error: null })

  // Optimistic update
  set((state) => ({
    rules: state.rules.map((r) =>
      ruleIds.includes(r.id) ? { ...r, is_enabled: enabled } : r
    ),
  }))

  const { error } = await fetchApi<{ success: boolean }>(`/studies/${studyId}/rules/bulk`, getToken, {
    method: 'PATCH',
    body: JSON.stringify({ ruleIds, updates: { is_enabled: enabled } }),
  })

  if (error) {
    get().loadRules()
    set({ error: error.message })
  }

  set({ isSaving: false, selectedRuleIds: new Set() })
}

export const useSurveyRulesStore = create<SurveyRulesState>((set, get) => ({
  ...initialState,

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  initialize: async (studyId: string, getToken: GetTokenFn) => {
    set({ studyId, getToken, isLoading: true, error: null })

    try {
      await Promise.all([get().loadRules(), get().loadVariables()])
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize' })
    } finally {
      set({ isLoading: false })
    }
  },

  reset: () => {
    set(initialState)
  },

  // ---------------------------------------------------------------------------
  // Rules CRUD
  // ---------------------------------------------------------------------------

  loadRules: async () => {
    const { studyId, getToken } = get()
    if (!studyId) return

    const { data, error } = await fetchApi<SurveyRule[]>(`/studies/${studyId}/rules`, getToken)

    if (error) {
      set({ error: error.message })
      return
    }

    set({ rules: data || [] })
  },

  createRule: async (input) => {
    const { studyId, getToken } = get()
    if (!studyId) return null

    set({ isSaving: true, error: null })

    const { data, error } = await fetchApi<SurveyRule>(`/studies/${studyId}/rules`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })

    if (error) {
      set({ isSaving: false, error: error.message })
      return null
    }

    if (data) {
      set((state) => ({
        rules: [...state.rules, data],
        isSaving: false,
      }))
    }

    return data
  },

  updateRule: async (ruleId, updates) => {
    const { studyId, getToken } = get()
    if (!studyId) return null

    set({ isSaving: true, error: null })

    const { data, error } = await fetchApi<SurveyRule>(`/studies/${studyId}/rules/${ruleId}`, getToken, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (error) {
      set({ isSaving: false, error: error.message })
      return null
    }

    if (data) {
      set((state) => ({
        rules: state.rules.map((r) => (r.id === ruleId ? data : r)),
        isSaving: false,
      }))
    }

    return data
  },

  deleteRule: async (ruleId) => {
    const { studyId, getToken } = get()
    if (!studyId) return false

    set({ isSaving: true, error: null })

    const { error } = await fetchApi<{ success: boolean }>(`/studies/${studyId}/rules/${ruleId}`, getToken, {
      method: 'DELETE',
    })

    if (error) {
      set({ isSaving: false, error: error.message })
      return false
    }

    set((state) => ({
      rules: state.rules.filter((r) => r.id !== ruleId),
      isSaving: false,
      editingRuleId: state.editingRuleId === ruleId ? null : state.editingRuleId,
    }))

    return true
  },

  duplicateRule: async (ruleId) => {
    const { studyId, rules } = get()
    if (!studyId) return null

    const original = rules.find((r) => r.id === ruleId)
    if (!original) return null

    return get().createRule({
      name: `${original.name} (Copy)`,
      description: original.description,
      is_enabled: original.is_enabled,
      conditions: original.conditions,
      action_type: original.action_type,
      action_config: original.action_config,
      trigger_type: original.trigger_type,
      trigger_config: original.trigger_config,
    })
  },

  reorderRules: async (orderedIds) => {
    const { studyId, getToken } = get()
    if (!studyId) return false

    // Optimistic update
    set((state) => {
      const reordered = orderedIds
        .map((id, index) => {
          const rule = state.rules.find((r) => r.id === id)
          return rule ? { ...rule, position: index } : null
        })
        .filter((r): r is SurveyRule => r !== null)

      return { rules: reordered }
    })

    const { error } = await fetchApi<{ success: boolean }>(`/studies/${studyId}/rules/reorder`, getToken, {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    })

    if (error) {
      get().loadRules()
      set({ error: error.message })
      return false
    }

    return true
  },

  toggleRuleEnabled: async (ruleId) => {
    const { rules } = get()
    const rule = rules.find((r) => r.id === ruleId)
    if (!rule) return false

    const result = await get().updateRule(ruleId, { is_enabled: !rule.is_enabled })
    return result !== null
  },

  // ---------------------------------------------------------------------------
  // Variables CRUD
  // ---------------------------------------------------------------------------

  loadVariables: async () => {
    const { studyId, getToken } = get()
    if (!studyId) return

    const { data, error } = await fetchApi<SurveyVariable[]>(`/studies/${studyId}/variables`, getToken)

    if (error) {
      if (!error.message.includes('404')) {
        set({ error: error.message })
      }
      return
    }

    set({ variables: data || [] })
  },

  createVariable: async (input) => {
    const { studyId, getToken } = get()
    if (!studyId) return null

    set({ isSaving: true, error: null })

    const { data, error } = await fetchApi<SurveyVariable>(`/studies/${studyId}/variables`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    })

    if (error) {
      set({ isSaving: false, error: error.message })
      return null
    }

    if (data) {
      set((state) => ({
        variables: [...state.variables, data],
        isSaving: false,
      }))
    }

    return data
  },

  updateVariable: async (variableId, updates) => {
    const { studyId, getToken } = get()
    if (!studyId) return null

    set({ isSaving: true, error: null })

    const { data, error } = await fetchApi<SurveyVariable>(
      `/studies/${studyId}/variables/${variableId}`,
      getToken,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    )

    if (error) {
      set({ isSaving: false, error: error.message })
      return null
    }

    if (data) {
      set((state) => ({
        variables: state.variables.map((v) => (v.id === variableId ? data : v)),
        isSaving: false,
      }))
    }

    return data
  },

  deleteVariable: async (variableId) => {
    const { studyId, getToken } = get()
    if (!studyId) return false

    set({ isSaving: true, error: null })

    const { error } = await fetchApi<{ success: boolean }>(
      `/studies/${studyId}/variables/${variableId}`,
      getToken,
      {
        method: 'DELETE',
      }
    )

    if (error) {
      set({ isSaving: false, error: error.message })
      return false
    }

    set((state) => ({
      variables: state.variables.filter((v) => v.id !== variableId),
      isSaving: false,
      editingVariableId: state.editingVariableId === variableId ? null : state.editingVariableId,
    }))

    return true
  },

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------

  setEditingRuleId: (ruleId) => {
    set({ editingRuleId: ruleId })
  },

  setEditingVariableId: (variableId) => {
    set({ editingVariableId: variableId })
  },

  clearError: () => {
    set({ error: null })
  },

  // ---------------------------------------------------------------------------
  // Selection & Bulk Operations
  // ---------------------------------------------------------------------------

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

  selectAllRules: () => {
    set((state) => ({
      selectedRuleIds: new Set(state.rules.map((r) => r.id)),
    }))
  },

  deselectAllRules: () => {
    set({ selectedRuleIds: new Set() })
  },

  bulkEnableRules: async (ruleIds) => {
    await bulkToggleRules(get, set, ruleIds, true)
  },

  bulkDisableRules: async (ruleIds) => {
    await bulkToggleRules(get, set, ruleIds, false)
  },

  bulkDeleteRules: async (ruleIds) => {
    const { studyId, getToken } = get()
    if (!studyId || ruleIds.length === 0) return

    set({ isSaving: true, error: null })

    // Optimistic update
    set((state) => ({
      rules: state.rules.filter((r) => !ruleIds.includes(r.id)),
      selectedRuleIds: new Set(),
    }))

    const { error } = await fetchApi<{ success: boolean }>(`/studies/${studyId}/rules/bulk`, getToken, {
      method: 'DELETE',
      body: JSON.stringify({ ruleIds }),
    })

    if (error) {
      get().loadRules()
      set({ error: error.message })
    }

    set({ isSaving: false })
  },

  // ---------------------------------------------------------------------------
  // Selectors
  // ---------------------------------------------------------------------------

  getRuleById: (ruleId) => {
    return get().rules.find((r) => r.id === ruleId)
  },

  getVariableById: (variableId) => {
    return get().variables.find((v) => v.id === variableId)
  },

  getEnabledRules: () => {
    return get().rules.filter((r) => r.is_enabled)
  },

  getRulesBySection: (section) => {
    return get().rules.filter((rule) => {
      // Check trigger
      if (rule.trigger_type === 'on_section_complete') {
        const config = rule.trigger_config as { section?: string }
        if (config.section === section) return true
      }

      // Check action
      if (
        rule.action_type === 'skip_to_section' ||
        rule.action_type === 'show_section' ||
        rule.action_type === 'hide_section'
      ) {
        const config = rule.action_config as { section?: string }
        if (config.section === section) return true
      }

      // For on_answer trigger, show in all sections by default
      if (rule.trigger_type === 'on_answer') return true

      return false
    })
  },
}))
