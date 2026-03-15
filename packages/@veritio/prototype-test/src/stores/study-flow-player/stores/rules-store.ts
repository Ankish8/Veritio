/**
 * Player Rules Store
 *
 * Manages survey rules engine state for conditional logic.
 * - Loaded rules and pre-built index
 * - Skip targets and hidden sections (rule evaluation results)
 * - Early end configuration
 *
 * Note: Rule evaluation itself uses functions from ../rules-engine.ts
 * This store only holds the state. Orchestration happens in the compatibility layer.
 *
 * @module stores/study-flow-player/stores/rules-store
 */

import { create } from 'zustand'
import type { FlowSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { SurveyRule, EndSurveyAction } from '../../../lib/supabase/survey-rules-types'
import type { RuleIndex } from '../rules-engine'
import { buildRuleIndex, loadRulesFromApi } from '../rules-engine'
// TYPES

export interface SkipTarget {
  questionId: string
}

export interface SkipSectionTarget {
  section: FlowSection
}

export interface SkipCustomSectionTarget {
  sectionId: string
}

export interface PlayerRulesState {
  // Rules configuration
  surveyRules: SurveyRule[]
  ruleIndex: RuleIndex | null

  // Evaluation results
  earlyEndConfig: EndSurveyAction['config'] | null
  skipTarget: SkipTarget | null
  skipSectionTarget: SkipSectionTarget | null
  skipCustomSectionTarget: SkipCustomSectionTarget | null
  hiddenSections: Set<FlowSection>
  hiddenCustomSections: Set<string>

  // Actions
  loadRules: (studyId: string) => Promise<void>
  setRules: (rules: SurveyRule[]) => void
  setEarlyEnd: (config: EndSurveyAction['config'] | null) => void
  setSkipTarget: (target: SkipTarget | null) => void
  setSkipSectionTarget: (target: SkipSectionTarget | null) => void
  setSkipCustomSectionTarget: (target: SkipCustomSectionTarget | null) => void
  updateHiddenSections: (toShow: FlowSection[], toHide: FlowSection[]) => void
  updateHiddenCustomSections: (toShow: string[], toHide: string[]) => void
  clearSkipTargets: () => void
  reset: () => void
}
// INITIAL STATE

const initialState = {
  surveyRules: [] as SurveyRule[],
  ruleIndex: null as RuleIndex | null,
  earlyEndConfig: null as EndSurveyAction['config'] | null,
  skipTarget: null as SkipTarget | null,
  skipSectionTarget: null as SkipSectionTarget | null,
  skipCustomSectionTarget: null as SkipCustomSectionTarget | null,
  hiddenSections: new Set<FlowSection>(),
  hiddenCustomSections: new Set<string>(),
}
// STORE

export const usePlayerRulesStore = create<PlayerRulesState>()((set, get) => ({
  ...initialState,

  loadRules: async (studyId) => {
    const rules = await loadRulesFromApi(studyId)
    const ruleIndex = rules.length > 0 ? buildRuleIndex(rules) : null
    set({ surveyRules: rules, ruleIndex })
  },

  setRules: (rules) => {
    const ruleIndex = rules.length > 0 ? buildRuleIndex(rules) : null
    set({ surveyRules: rules, ruleIndex })
  },

  setEarlyEnd: (config) => set({ earlyEndConfig: config }),

  setSkipTarget: (target) => set({ skipTarget: target }),

  setSkipSectionTarget: (target) => set({ skipSectionTarget: target }),

  setSkipCustomSectionTarget: (target) => set({ skipCustomSectionTarget: target }),

  updateHiddenSections: (toShow, toHide) => {
    const { hiddenSections } = get()
    const newHidden = new Set(hiddenSections)
    for (const section of toShow) {
      newHidden.delete(section)
    }
    for (const section of toHide) {
      newHidden.add(section)
    }
    set({ hiddenSections: newHidden })
  },

  updateHiddenCustomSections: (toShow, toHide) => {
    const { hiddenCustomSections } = get()
    const newHidden = new Set(hiddenCustomSections)
    for (const sectionId of toShow) {
      newHidden.delete(sectionId)
    }
    for (const sectionId of toHide) {
      newHidden.add(sectionId)
    }
    set({ hiddenCustomSections: newHidden })
  },

  clearSkipTargets: () => {
    set({
      skipTarget: null,
      skipSectionTarget: null,
      skipCustomSectionTarget: null,
    })
  },

  reset: () => set({
    ...initialState,
    hiddenSections: new Set(),
    hiddenCustomSections: new Set(),
  }),
}))
// SELECTORS

export const useSurveyRules = () => usePlayerRulesStore((s) => s.surveyRules)
export const useRuleIndex = () => usePlayerRulesStore((s) => s.ruleIndex)
export const useEarlyEndConfig = () => usePlayerRulesStore((s) => s.earlyEndConfig)
export const useSkipTarget = () => usePlayerRulesStore((s) => s.skipTarget)
export const useSkipSectionTarget = () => usePlayerRulesStore((s) => s.skipSectionTarget)
export const useHiddenSections = () => usePlayerRulesStore((s) => s.hiddenSections)
export const useHiddenCustomSections = () => usePlayerRulesStore((s) => s.hiddenCustomSections)
export const useIsSectionHidden = (section: FlowSection) =>
  usePlayerRulesStore((s) => s.hiddenSections.has(section))
export const useIsCustomSectionHidden = (sectionId: string) =>
  usePlayerRulesStore((s) => s.hiddenCustomSections.has(sectionId))
export const useHasEarlyEnd = () =>
  usePlayerRulesStore((s) => s.earlyEndConfig !== null)
