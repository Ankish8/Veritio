/**
 * Player Progressive Reveal Store
 *
 * Manages progressive question reveal for survey studies.
 * - Which questions have been revealed
 * - Currently active question
 * - Progressive reveal mode detection
 *
 * @module stores/study-flow-player/stores/progressive-store
 */

import { create } from 'zustand'

// =============================================================================
// TYPES
// =============================================================================

export interface PlayerProgressiveState {
  // Revealed state
  revealedQuestionIds: Set<string>
  activeQuestionId: string | null

  // Actions
  revealQuestion: (questionId: string) => void
  revealQuestions: (questionIds: string[]) => void
  setActiveQuestion: (questionId: string | null) => void
  initializeWithFirstQuestion: (questionId: string) => void
  reset: () => void
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  revealedQuestionIds: new Set<string>(),
  activeQuestionId: null as string | null,
}

// =============================================================================
// STORE
// =============================================================================

export const usePlayerProgressiveStore = create<PlayerProgressiveState>()((set, get) => ({
  ...initialState,

  revealQuestion: (questionId) => {
    const { revealedQuestionIds } = get()
    if (revealedQuestionIds.has(questionId)) return

    const newRevealed = new Set(revealedQuestionIds)
    newRevealed.add(questionId)
    set({
      revealedQuestionIds: newRevealed,
      activeQuestionId: questionId,
    })
  },

  revealQuestions: (questionIds) => {
    const { revealedQuestionIds } = get()
    const newRevealed = new Set(revealedQuestionIds)
    for (const id of questionIds) {
      newRevealed.add(id)
    }
    set({ revealedQuestionIds: newRevealed })
  },

  setActiveQuestion: (questionId) => {
    set({ activeQuestionId: questionId })
  },

  initializeWithFirstQuestion: (questionId) => {
    set({
      revealedQuestionIds: new Set([questionId]),
      activeQuestionId: questionId,
    })
  },

  reset: () => set({
    ...initialState,
    revealedQuestionIds: new Set(),
  }),
}))

// =============================================================================
// SELECTORS
// =============================================================================

export const useRevealedQuestionIds = () =>
  usePlayerProgressiveStore((s) => s.revealedQuestionIds)

export const useActiveQuestionId = () =>
  usePlayerProgressiveStore((s) => s.activeQuestionId)

/**
 * Check if a question has been revealed
 */
export const useIsQuestionRevealed = (questionId: string) =>
  usePlayerProgressiveStore((s) => s.revealedQuestionIds.has(questionId))

/**
 * Check if a question is the active one
 */
export const useIsActiveQuestion = (questionId: string) =>
  usePlayerProgressiveStore((s) => s.activeQuestionId === questionId)

/**
 * Get count of revealed questions
 */
export const useRevealedCount = () =>
  usePlayerProgressiveStore((s) => s.revealedQuestionIds.size)
