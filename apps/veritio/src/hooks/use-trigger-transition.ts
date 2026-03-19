'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_FOLLOWUP_TYPES, buildAnswerText } from '@/lib/study-flow/answer-text'
import type { AiFollowupConfig } from '@veritio/study-types/study-flow-types'

interface UseTriggerTransitionOptions {
  isAnimating: boolean
  canProceed: boolean
  nextQuestion: () => void
  currentQuestion: { id: string; question_type: string; question_text: string; config: unknown } | undefined
  responses: Map<string, { value: unknown }>
  evaluateAndMaybeIntercept: (
    questionId: string,
    questionText: string,
    answerText: string,
    config: Record<string, unknown>,
    questionType: string,
    rawValue: unknown
  ) => Promise<boolean>
}

interface UseTriggerTransitionResult {
  isTransitioning: boolean
  isAnimating: boolean
  setIsAnimating: (v: boolean) => void
  triggerTransition: (skipCanProceedCheck?: boolean) => Promise<void>
  triggerTransitionRef: React.RefObject<(skipCanProceedCheck?: boolean) => Promise<void>>
  /** Start the transition animation without AI follow-up evaluation (e.g., after followup submit). */
  startTransitionAnimation: () => void
  resetTransitionState: () => void
}

/**
 * Encapsulates the Typeform-style transition animation with AI follow-up interception.
 * Shared between survey-questions-step and questions-step.
 */
export function useTriggerTransition({
  isAnimating: isAnimatingExternal,
  canProceed,
  nextQuestion,
  currentQuestion,
  responses,
  evaluateAndMaybeIntercept,
}: UseTriggerTransitionOptions): UseTriggerTransitionResult {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerTransitionRef = useRef<(skipCanProceedCheck?: boolean) => Promise<void>>(async () => {})

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  const startTransitionAnimation = useCallback(() => {
    setIsAnimating(true)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)
      animationTimeoutRef.current = setTimeout(() => {
        nextQuestion()
      }, 300)
    }, 100)
  }, [nextQuestion])

  const triggerTransition = useCallback(async (skipCanProceedCheck = false) => {
    if (isAnimating || isAnimatingExternal) return
    if (!skipCanProceedCheck && !canProceed) return

    // Check if current question has AI follow-up enabled
    if (currentQuestion && AI_FOLLOWUP_TYPES.includes(currentQuestion.question_type as any)) {
      const config = currentQuestion.config as { aiFollowup?: AiFollowupConfig; [key: string]: unknown }
      if (config?.aiFollowup?.enabled) {
        const response = responses.get(currentQuestion.id)
        const rawValue = response?.value
        const answerText = buildAnswerText(currentQuestion.question_type, rawValue, config as Record<string, unknown>)

        if (answerText) {
          const intercepted = await evaluateAndMaybeIntercept(
            currentQuestion.id,
            currentQuestion.question_text,
            answerText,
            config,
            currentQuestion.question_type,
            rawValue
          )
          if (intercepted) return
        }
      }
    }

    startTransitionAnimation()
  }, [isAnimating, isAnimatingExternal, canProceed, nextQuestion, currentQuestion, responses, evaluateAndMaybeIntercept, startTransitionAnimation])

  // Keep ref in sync so setTimeout callbacks always use latest triggerTransition
  triggerTransitionRef.current = triggerTransition

  const resetTransitionState = useCallback(() => {
    setIsTransitioning(false)
    setIsAnimating(false)
  }, [])

  return {
    isTransitioning,
    isAnimating,
    setIsAnimating,
    triggerTransition,
    triggerTransitionRef,
    startTransitionAnimation,
    resetTransitionState,
  }
}
