import { useCallback, useEffect, useRef } from 'react'
import { useRevealedQuestionIds, useActiveQuestionId, usePlayerActions } from '@/stores/study-flow-player'
import type { StudyFlowQuestion, QuestionType } from '@veritio/study-types/study-flow-types'

// Question types that auto-advance after selection
const AUTO_ADVANCE_TYPES: QuestionType[] = ['multiple_choice', 'opinion_scale', 'nps', 'yes_no']

interface UseProgressiveRevealOptions {
  autoAdvanceDelay?: number
  scrollBehavior?: ScrollBehavior
  scrollBlock?: ScrollLogicalPosition
}

// Check if question should auto-advance based on type and response
function shouldAutoAdvance(question: StudyFlowQuestion, response: unknown): boolean {
  const { question_type: type, config } = question

  // Text/matrix don't auto-advance
  if (['single_line_text', 'multi_line_text', 'matrix'].includes(type)) return false

  // Ranking: auto-advance when all items ranked
  if (type === 'ranking') {
    const opts = (config as { options?: { id: string }[] })?.options
    const rankings = (response as { rankings?: Record<string, number> })?.rankings
    return opts && rankings ? Object.keys(rankings).length === opts.length : false
  }

  // Multi-select (multiple_choice with mode='multi'): auto-advance only when maxSelections reached
  if (type === 'multiple_choice') {
    const mode = (config as { mode?: string })?.mode
    if (mode === 'multi') {
      const max = (config as { maxSelections?: number })?.maxSelections
      const selected = (response as { optionIds?: string[] })?.optionIds
      return max ? Array.isArray(selected) && selected.length >= max : false
    }
    // single/dropdown auto-advance on any selection
    return true
  }

  return AUTO_ADVANCE_TYPES.includes(type)
}

export function useProgressiveReveal(options: UseProgressiveRevealOptions = {}) {
  const { autoAdvanceDelay = 300, scrollBehavior = 'smooth', scrollBlock = 'center' } = options

  const questionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // State subscriptions
  const revealedQuestionIds = useRevealedQuestionIds()
  const activeQuestionId = useActiveQuestionId()

  // Actions
  const {
    revealNextQuestion: storeRevealNext,
    isProgressiveMode: checkProgressiveMode,
    getVisibleQuestions,
    setResponse,
  } = usePlayerActions()

  const isProgressiveMode = checkProgressiveMode()
  const visibleQuestions = getVisibleQuestions()

  // Cleanup timer
  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current) } }, [])

  // Scroll to active question
  useEffect(() => {
    if (!isProgressiveMode || !activeQuestionId) return
    const el = questionRefs.current.get(activeQuestionId)
    if (!el) return

    setTimeout(() => {
      el.scrollIntoView({ behavior: scrollBehavior, block: scrollBlock })
      el.querySelector<HTMLElement>('input, textarea, button, [tabindex]:not([tabindex="-1"])')?.focus()
    }, 100)
  }, [activeQuestionId, isProgressiveMode, scrollBehavior, scrollBlock])

  const setQuestionRef = useCallback(
    (questionId: string) => (el: HTMLDivElement | null) => questionRefs.current.set(questionId, el),
    []
  )

  const revealNextQuestion = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current) }
    timerRef.current = null
    storeRevealNext()
  }, [storeRevealNext])

  const handleAnswerComplete = useCallback(
    (question: StudyFlowQuestion, response: unknown) => {
      if (!isProgressiveMode) return
      setResponse(question.id, response as any)

      if (shouldAutoAdvance(question, response)) {
        if (timerRef.current) { clearTimeout(timerRef.current) }
        timerRef.current = setTimeout(() => {
          storeRevealNext()
          timerRef.current = null
        }, autoAdvanceDelay)
      }
    },
    [isProgressiveMode, setResponse, storeRevealNext, autoAdvanceDelay]
  )

  const shouldShowContinueButton = useCallback(
    (question: StudyFlowQuestion): boolean => {
      if (!isProgressiveMode) return false
      const { question_type: type, config } = question
      if (['single_line_text', 'multi_line_text', 'matrix', 'ranking'].includes(type)) return true
      // Multi-select needs continue button unless maxSelections is set
      if (type === 'multiple_choice') {
        const mode = (config as { mode?: string })?.mode
        if (mode === 'multi') {
          return !(config as { maxSelections?: number })?.maxSelections
        }
      }
      return false
    },
    [isProgressiveMode]
  )

  const isLastRevealedQuestion = useCallback(
    (questionId: string): boolean => {
      if (!isProgressiveMode) return false
      const arr = Array.from(revealedQuestionIds)
      return arr[arr.length - 1] === questionId
    },
    [isProgressiveMode, revealedQuestionIds]
  )

  return {
    isProgressiveMode,
    revealedQuestionIds,
    activeQuestionId,
    revealNextQuestion,
    handleAnswerComplete,
    questionRefs,
    setQuestionRef,
    shouldShowContinueButton,
    isLastRevealedQuestion,
    allQuestionsRevealed: isProgressiveMode
      ? visibleQuestions.every((q) => revealedQuestionIds.has(q.id))
      : true,
  }
}
