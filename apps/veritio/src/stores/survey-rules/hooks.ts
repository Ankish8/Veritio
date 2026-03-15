import type { SurveyRule, SurveyVariable } from '@/lib/supabase/survey-rules-types'
import { useSurveyRulesStore } from './store'

/**
 * Hook to get a rule by ID with memoization
 */
export function useRule(ruleId: string | null): SurveyRule | undefined {
  return useSurveyRulesStore((state) => (ruleId ? state.rules.find((r) => r.id === ruleId) : undefined))
}

/**
 * Hook to get a variable by ID with memoization
 */
export function useVariable(variableId: string | null): SurveyVariable | undefined {
  return useSurveyRulesStore((state) =>
    variableId ? state.variables.find((v) => v.id === variableId) : undefined
  )
}

/**
 * Hook to get all variables
 */
export function useVariables(): SurveyVariable[] {
  return useSurveyRulesStore((state) => state.variables)
}

/**
 * Hook to check if there are any enabled rules
 */
export function useHasEnabledRules(): boolean {
  return useSurveyRulesStore((state) => state.rules.some((r) => r.is_enabled))
}

/**
 * Hook to get rules count
 */
export function useRulesCount(): number {
  return useSurveyRulesStore((state) => state.rules.length)
}
