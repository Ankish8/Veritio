'use client'

import { useCallback } from 'react'
import { SWR_KEYS } from '@/lib/swr'
import {
  createCRUDHook,
  createScopedArrayCRUDConfig,
  buildOptimisticBulkUpdate,
  buildOptimisticBulkDelete,
  buildOptimisticReorder,
} from '@/lib/swr/crud-factory'
import type { SurveyRule } from '@/lib/supabase/survey-rules-types'

type SurveyRuleInsert = Omit<SurveyRule, 'id' | 'study_id' | 'created_at' | 'updated_at'>
type SurveyRuleUpdate = Partial<SurveyRuleInsert>

const surveyRulesConfig = createScopedArrayCRUDConfig<SurveyRule>({
  name: 'survey rule',
  scopeParam: 'studyId',
  keyBuilder: (studyId) => SWR_KEYS.surveyRules(studyId),
  apiUrlBuilder: (studyId) => `/api/studies/${studyId}/rules`,
  defaultItem: {
    is_enabled: true,
    position: 0,
  },
  createPosition: 'append', // Rules are added at the end
  indexes: [{ name: 'byId', keyExtractor: (r) => r.id }],
  selectors: [
    {
      name: 'getEnabledRules',
      select: (data) => (data || []).filter((r) => r.is_enabled),
    },
  ],
})

surveyRulesConfig.bulkOperations = {
  bulkUpdate: {
    type: 'update',
    url: (baseUrl) => `${baseUrl}/bulk`,
    buildOptimisticData: (currentData, itemIds, updates) =>
      buildOptimisticBulkUpdate(currentData, itemIds, updates || {}),
  },
  bulkDelete: {
    type: 'delete',
    url: (baseUrl) => `${baseUrl}/bulk`,
    buildOptimisticData: (currentData, itemIds) =>
      buildOptimisticBulkDelete(currentData, itemIds),
  },
  reorder: {
    type: 'reorder',
    url: (baseUrl) => `${baseUrl}/reorder`,
    buildOptimisticData: (currentData, orderedIds) =>
      buildOptimisticReorder(currentData, orderedIds),
  },
}

if (surveyRulesConfig.operations?.update) {
  surveyRulesConfig.operations.update.method = 'PUT'
}

const useSurveyRulesInternal = createCRUDHook(surveyRulesConfig)

/** Fetches and manages survey rules with SWR caching and optimistic updates. */
export function useSurveyRules(studyId: string | null) {
  const result = useSurveyRulesInternal(
    { studyId: studyId || '' },
    { skip: !studyId }
  )

  const rules = result.data

  const createRule = useCallback(
    async (input: SurveyRuleInsert): Promise<SurveyRule | null> => {
      if (!studyId) return null
      return result.create?.(input) ?? null
    },
    [studyId, result]
  )

  const updateRule = useCallback(
    async (ruleId: string, updates: SurveyRuleUpdate): Promise<SurveyRule | null> => {
      if (!studyId) return null
      return result.update?.(ruleId, updates) ?? null
    },
    [studyId, result]
  )

  const deleteRule = useCallback(
    async (ruleId: string): Promise<boolean> => {
      if (!studyId) return false
      return result.delete?.(ruleId) ?? false
    },
    [studyId, result]
  )

  const duplicateRule = useCallback(
    async (ruleId: string): Promise<SurveyRule | null> => {
      const original = rules.find((r) => r.id === ruleId)
      if (!original) return null

      return createRule({
        name: `${original.name} (Copy)`,
        description: original.description,
        is_enabled: original.is_enabled,
        conditions: original.conditions,
        action_type: original.action_type,
        action_config: original.action_config,
        trigger_type: original.trigger_type,
        trigger_config: original.trigger_config,
        position: original.position,
      })
    },
    [rules, createRule]
  )

  const toggleRuleEnabled = useCallback(
    async (ruleId: string): Promise<boolean> => {
      const rule = rules.find((r) => r.id === ruleId)
      if (!rule) return false
      const updated = await updateRule(ruleId, { is_enabled: !rule.is_enabled })
      return updated !== null
    },
    [rules, updateRule]
  )

  const reorderRules = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      if (!studyId) return false
      return result.reorder?.(orderedIds) ?? false
    },
    [studyId, result]
  )

  const bulkUpdateRules = useCallback(
    async (ruleIds: string[], updates: { is_enabled?: boolean }): Promise<boolean> => {
      if (!studyId || ruleIds.length === 0) return false
      return result.bulkUpdate?.(ruleIds, updates) ?? false
    },
    [studyId, result]
  )

  const bulkDeleteRules = useCallback(
    async (ruleIds: string[]): Promise<boolean> => {
      if (!studyId || ruleIds.length === 0) return false
      return result.bulkDelete?.(ruleIds) ?? false
    },
    [studyId, result]
  )

  const getRuleById = useCallback(
    (ruleId: string) => rules.find((r) => r.id === ruleId),
    [rules]
  )

  const getEnabledRules = useCallback(
    () => rules.filter((r) => r.is_enabled),
    [rules]
  )

  return {
    rules,
    isLoading: result.isLoading,
    isSaving: result.isValidating,
    error: result.error,
    refetch: result.refetch,

    // CRUD
    createRule,
    updateRule,
    deleteRule,
    duplicateRule,
    toggleRuleEnabled,
    reorderRules,

    // Bulk
    bulkEnableRules: (ids: string[]) => bulkUpdateRules(ids, { is_enabled: true }),
    bulkDisableRules: (ids: string[]) => bulkUpdateRules(ids, { is_enabled: false }),
    bulkDeleteRules,

    // Selectors
    getRuleById,
    getEnabledRules,
  }
}
