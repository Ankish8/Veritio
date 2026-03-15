/**
 * Player Navigation Store
 *
 * Manages navigation state and actions for the study flow.
 * - Current step in the flow (welcome, screening, activity, etc.)
 * - Current question index within a step
 * - Step/question navigation actions
 *
 * @module stores/study-flow-player/stores/navigation-store
 */

import { create } from 'zustand'
import type { FlowStep } from '@veritio/study-types/study-flow-types'

// =============================================================================
// TYPES
// =============================================================================

export interface PlayerNavigationState {
  // Current position
  currentStep: FlowStep
  currentQuestionIndex: number
  questionStartTime: number | null

  // Actions
  setStep: (step: FlowStep) => void
  setQuestionIndex: (index: number) => void
  goToStep: (step: FlowStep) => void
  nextQuestionIndex: () => void
  previousQuestionIndex: () => void
  startQuestionTimer: () => void
  resetQuestionTimer: () => void
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  currentStep: 'welcome' as FlowStep,
  currentQuestionIndex: 0,
  questionStartTime: null as number | null,
}

// =============================================================================
// STORE
// =============================================================================

/**
 * Navigation store manages position within the flow.
 *
 * Note: This store provides low-level navigation primitives.
 * The compatibility layer or higher-level hooks handle complex navigation
 * logic (skip targets, rules evaluation, step validation).
 */
export const usePlayerNavigationStore = create<PlayerNavigationState>()((set, get) => ({
  ...initialState,

  setStep: (step) => {
    set({
      currentStep: step,
      currentQuestionIndex: 0,
      questionStartTime: null,
    })
  },

  setQuestionIndex: (index) => {
    set({
      currentQuestionIndex: index,
      questionStartTime: null,
    })
  },

  goToStep: (step) => {
    set({
      currentStep: step,
      currentQuestionIndex: 0,
      questionStartTime: null,
    })
  },

  nextQuestionIndex: () => {
    set((state) => ({
      currentQuestionIndex: state.currentQuestionIndex + 1,
      questionStartTime: null,
    }))
  },

  previousQuestionIndex: () => {
    const { currentQuestionIndex } = get()
    if (currentQuestionIndex > 0) {
      set({
        currentQuestionIndex: currentQuestionIndex - 1,
        questionStartTime: null,
      })
    }
  },

  startQuestionTimer: () => {
    set({ questionStartTime: Date.now() })
  },

  resetQuestionTimer: () => {
    set({ questionStartTime: null })
  },

  reset: () => set(initialState),
}))

// =============================================================================
// SELECTORS
// =============================================================================

export const useCurrentStep = () => usePlayerNavigationStore((s) => s.currentStep)
export const useCurrentQuestionIndex = () => usePlayerNavigationStore((s) => s.currentQuestionIndex)
export const useQuestionStartTime = () => usePlayerNavigationStore((s) => s.questionStartTime)

/**
 * Check if we're at the first question of a step
 */
export const useIsFirstQuestion = () => usePlayerNavigationStore((s) => s.currentQuestionIndex === 0)
