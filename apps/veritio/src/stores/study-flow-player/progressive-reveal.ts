import type { StudyFlowSettings, StudyFlowQuestion } from '@veritio/study-types/study-flow-types'

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressiveRevealState {
  revealedQuestionIds: Set<string>
  activeQuestionId: string | null
}

// =============================================================================
// PROGRESSIVE REVEAL LOGIC
// =============================================================================

/**
 * Checks if progressive mode is enabled.
 */
export function isProgressiveMode(
  flowSettings: StudyFlowSettings,
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test' | null
): boolean {
  if (studyType !== 'survey') return false
  return flowSettings.pagination?.mode === 'progressive'
}

/**
 * Initializes progressive reveal state with the first question revealed.
 */
export function initializeProgressiveReveal(
  visibleQuestions: StudyFlowQuestion[]
): ProgressiveRevealState {
  if (visibleQuestions.length === 0) {
    return {
      revealedQuestionIds: new Set(),
      activeQuestionId: null,
    }
  }

  const firstQuestion = visibleQuestions[0]
  return {
    revealedQuestionIds: new Set([firstQuestion.id]),
    activeQuestionId: firstQuestion.id,
  }
}

/**
 * Reveals a specific question.
 */
export function revealQuestion(
  state: ProgressiveRevealState,
  questionId: string
): ProgressiveRevealState {
  if (state.revealedQuestionIds.has(questionId)) {
    return state
  }

  const newRevealed = new Set(state.revealedQuestionIds)
  newRevealed.add(questionId)

  return {
    revealedQuestionIds: newRevealed,
    activeQuestionId: questionId,
  }
}

/**
 * Reveals the next unrevealed question after the active question.
 */
export function revealNextQuestion(
  state: ProgressiveRevealState,
  visibleQuestions: StudyFlowQuestion[]
): ProgressiveRevealState {
  if (visibleQuestions.length === 0) {
    return state
  }

  const { revealedQuestionIds, activeQuestionId } = state

  // Find the next unrevealed question
  let foundCurrent = false
  for (const question of visibleQuestions) {
    // If we haven't found the active question yet, skip
    if (activeQuestionId && question.id !== activeQuestionId && !foundCurrent) {
      if (revealedQuestionIds.has(question.id)) continue
    }

    // Found the current active question
    if (question.id === activeQuestionId) {
      foundCurrent = true
      continue
    }

    // This is the next question after the active one
    if (foundCurrent || !activeQuestionId) {
      const newRevealed = new Set(revealedQuestionIds)
      newRevealed.add(question.id)
      return {
        revealedQuestionIds: newRevealed,
        activeQuestionId: question.id,
      }
    }
  }

  // No more questions to reveal - stay on current state
  return state
}

/**
 * Sets the active question.
 */
export function setActiveQuestion(
  state: ProgressiveRevealState,
  questionId: string | null
): ProgressiveRevealState {
  return {
    ...state,
    activeQuestionId: questionId,
  }
}
