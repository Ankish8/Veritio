import type {
  SurveyRule,
  SurveyRuleInsert,
  SurveyRuleUpdate,
  SurveyVariable,
  SurveyVariableInsert,
  SurveyVariableUpdate,
} from '@/lib/supabase/survey-rules-types'

export type GetTokenFn = () => Promise<string | null>

export interface SurveyRulesState {
  // Study context
  studyId: string | null
  getToken: GetTokenFn | null

  // Rules data
  rules: SurveyRule[]
  variables: SurveyVariable[]

  // UI state
  isLoading: boolean
  isSaving: boolean
  error: string | null
  editingRuleId: string | null
  editingVariableId: string | null

  // Selection state (for bulk operations)
  selectedRuleIds: Set<string>
  searchQuery: string

  // Actions - Initialization
  initialize: (studyId: string, getToken: GetTokenFn) => Promise<void>
  reset: () => void

  // Actions - Rules CRUD
  loadRules: () => Promise<void>
  createRule: (input: Omit<SurveyRuleInsert, 'study_id'>) => Promise<SurveyRule | null>
  updateRule: (ruleId: string, updates: SurveyRuleUpdate) => Promise<SurveyRule | null>
  deleteRule: (ruleId: string) => Promise<boolean>
  duplicateRule: (ruleId: string) => Promise<SurveyRule | null>
  reorderRules: (orderedIds: string[]) => Promise<boolean>
  toggleRuleEnabled: (ruleId: string) => Promise<boolean>

  // Actions - Variables CRUD
  loadVariables: () => Promise<void>
  createVariable: (input: Omit<SurveyVariableInsert, 'study_id'>) => Promise<SurveyVariable | null>
  updateVariable: (variableId: string, updates: SurveyVariableUpdate) => Promise<SurveyVariable | null>
  deleteVariable: (variableId: string) => Promise<boolean>

  // Actions - UI state
  setEditingRuleId: (ruleId: string | null) => void
  setEditingVariableId: (variableId: string | null) => void
  clearError: () => void

  // Actions - Selection & Bulk
  setSearchQuery: (query: string) => void
  toggleRuleSelection: (ruleId: string) => void
  selectAllRules: () => void
  deselectAllRules: () => void
  bulkEnableRules: (ruleIds: string[]) => Promise<void>
  bulkDisableRules: (ruleIds: string[]) => Promise<void>
  bulkDeleteRules: (ruleIds: string[]) => Promise<void>

  // Selectors
  getRuleById: (ruleId: string) => SurveyRule | undefined
  getVariableById: (variableId: string) => SurveyVariable | undefined
  getEnabledRules: () => SurveyRule[]
  getRulesBySection: (section: string) => SurveyRule[]
}

export const initialState = {
  studyId: null,
  getToken: null as GetTokenFn | null,
  rules: [] as SurveyRule[],
  variables: [] as SurveyVariable[],
  isLoading: false,
  isSaving: false,
  error: null as string | null,
  editingRuleId: null as string | null,
  editingVariableId: null as string | null,
  selectedRuleIds: new Set<string>(),
  searchQuery: '',
}
