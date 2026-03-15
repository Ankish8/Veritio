// Stub re-exports - original module not available in this package context
// The real store lives in apps/veritio/src/stores/survey-rules/store.ts
// These stubs must return no-op functions for all properties components destructure
const noop = () => {}
const asyncNoop = async () => {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSurveyRulesStore: any = () => ({
  isLoading: false,
  isSaving: false,
  error: null,
  rules: [],
  variables: [],
  loadRules: asyncNoop,
  loadVariables: asyncNoop,
  createRule: asyncNoop,
  updateRule: asyncNoop,
  deleteRule: asyncNoop,
  duplicateRule: asyncNoop,
  reorderRules: asyncNoop,
  toggleRuleEnabled: asyncNoop,
  createVariable: asyncNoop,
  updateVariable: asyncNoop,
  deleteVariable: asyncNoop,
  initialize: asyncNoop,
  reset: noop,
  setEditingRuleId: noop,
  setEditingVariableId: noop,
  clearError: noop,
  setSearchQuery: noop,
  toggleRuleSelection: noop,
  selectAllRules: noop,
  deselectAllRules: noop,
  bulkEnableRules: asyncNoop,
  bulkDisableRules: asyncNoop,
  bulkDeleteRules: asyncNoop,
  getRuleById: () => undefined,
  getVariableById: () => undefined,
  getEnabledRules: () => [],
  getRulesBySection: () => [],
  selectedRuleIds: new Set(),
  searchQuery: '',
  editingRuleId: null,
  editingVariableId: null,
  studyId: null,
  getToken: asyncNoop,
})
export const useRule: any = () => null
export const useVariable: any = () => null
export const useVariables: any = () => []
export const useHasEnabledRules: any = () => false
export const useRulesCount: any = () => 0
export type SurveyRulesState = any
export type GetTokenFn = () => Promise<string | null>
