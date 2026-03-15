'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { ButtonBounce } from '../css-animations'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useFlowSettings, useCurrentQuestionIndex, useResponses, usePlayerActions, useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import { useQuestionKeyboard } from '@/hooks/use-question-keyboard'
import { usePlatform } from '@/hooks/use-platform'
import { QuestionRenderer } from '../question-renderers/question-renderer'
import { evaluateScreeningResult } from '@veritio/prototype-test/lib/branching-logic'
import { StepLayout, BrandedButton } from '../step-layout'
import { hasValidResponse, shouldAutoAdvanceScreening } from '../question-validation'
import type { ResponseValue, MultipleChoiceQuestionConfig } from '@veritio/study-types/study-flow-types'

interface ScreeningStepProps {
  onComplete: () => Promise<void>
}

export function ScreeningStep({ onComplete }: ScreeningStepProps) {
  // State subscriptions
  const flowSettings = useFlowSettings()
  const currentQuestionIndex = useCurrentQuestionIndex()
  const responses = useResponses()

  // Actions
  const {
    nextQuestion,
    previousQuestion,
    setResponse,
    getResponse,
    startQuestionTimer,
    goToStep,
    setScreeningResult,
    getVisibleQuestions,
  } = usePlayerActions()

  const { isTouchDevice } = usePlatform()
  const [isTextInputFocused, setIsTextInputFocused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

  const visibleQuestions = getVisibleQuestions() // Now supports display logic
  const currentQuestion = visibleQuestions[currentQuestionIndex]

  // Reset isTextInputFocused when question changes to a non-text type
  // This ensures keyboard shortcuts work for choice-based questions
  useEffect(() => {
    if (currentQuestion && !['single_line_text', 'multi_line_text'].includes(currentQuestion.question_type)) {
      setIsTextInputFocused(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, currentQuestion?.question_type])

  // Reset animation state when question changes
  useEffect(() => {
    setIsTransitioning(false)
    setIsAnimating(false)
    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }, [currentQuestionIndex])

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true
    return hasValidResponse(currentQuestion, responses)
  }, [currentQuestion, responses])

  const progress = ((currentQuestionIndex + 1) / visibleQuestions.length) * 100
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1

  // Get options for choice-based questions
  const questionOptions = useMemo(() => {
    if (!currentQuestion) return []
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    return config?.options || []
  }, [currentQuestion])

  // Get multi-select maxSelections for auto-advance detection
  const maxSelections = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type !== 'multiple_choice') return undefined
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return undefined
    return config.maxSelections
  }, [currentQuestion])

  // Actual navigation logic (called after animation)
  const proceedToNext = useCallback(async () => {
    // IMPORTANT: Get fresh state from the store at execution time
    // This avoids stale closure issues with auto-advance where the response
    // might not be in the closed-over variables yet
    const freshVisibleQuestions = getVisibleQuestions()
    const freshCurrentIndex = useStudyFlowPlayerStore.getState().currentQuestionIndex
    const freshResponses = useStudyFlowPlayerStore.getState().responses
    const isCurrentlyLastQuestion = freshCurrentIndex === freshVisibleQuestions.length - 1

    if (isCurrentlyLastQuestion) {

      // Convert responses map to values only for evaluation
      const responseValues = new Map<string, ResponseValue>()
      freshResponses.forEach((response, questionId) => {
        responseValues.set(questionId, response.value)
      })

      // Evaluate screening result (only visible/answered questions)
      const result = evaluateScreeningResult(
        freshVisibleQuestions,
        responseValues
      )
      setScreeningResult(result)

      if (result === 'rejected') {
        await onComplete()
        goToStep('rejected')
      } else {
        await onComplete()
        // Will auto-advance via nextQuestion -> nextStep
        nextQuestion()
      }
    } else {
      nextQuestion()
    }
  }, [getVisibleQuestions, setScreeningResult, onComplete, goToStep, nextQuestion])

  // Typeform-style transition: button press animation → navigate
  const triggerTransition = useCallback((skipCanProceedCheck = false) => {
    if (isAnimating) return
    if (!skipCanProceedCheck && !canProceed) return

    setIsAnimating(true)

    // Brief pause before animation
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)

      // After animation completes, proceed
      animationTimeoutRef.current = setTimeout(() => {
        proceedToNext()
      }, 300)
    }, 100)
  }, [isAnimating, canProceed, proceedToNext])

  const handleNext = useCallback(() => {
    if (isAnimating) return
    triggerTransition()
  }, [isAnimating, triggerTransition])

  const handleEnterPress = useCallback(() => {
    if (canProceed && !isAnimating) {
      triggerTransition()
    }
  }, [canProceed, isAnimating, triggerTransition])

  // Keyboard navigation hook
  const { showHints } = useQuestionKeyboard({
    enabled: !isTouchDevice && !isAnimating,
    questionType: currentQuestion?.question_type || 'single_line_text',
    options: questionOptions,
    value: currentQuestion ? getResponse(currentQuestion.id) : undefined,
    onChange: (value) => {
      if (currentQuestion) {
        setResponse(currentQuestion.id, value)

        // Auto-advance for choice-based questions (Typeform style)
        if (shouldAutoAdvanceScreening(currentQuestion) && !isAnimating) {
          if (autoAdvanceTimeoutRef.current) {
            clearTimeout(autoAdvanceTimeoutRef.current)
          }
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            triggerTransition(true) // Skip canProceed check - we know the answer is being set
          }, 300)
        }
      }
    },
    onNext: () => {
      if (canProceed && !isAnimating) {
        triggerTransition()
      }
    },
    onBack: previousQuestion,
    canProceed,
    scalePoints: (currentQuestion?.config as any)?.scalePoints || 5,
    isTextInputFocused,
    maxSelections,
  })

  // Start timer when question changes
  useEffect(() => {
    startQuestionTimer()
  }, [currentQuestionIndex, startQuestionTimer])

  const handleResponseChange = useCallback((value: ResponseValue) => {
    if (currentQuestion) {
      setResponse(currentQuestion.id, value)
    }
  }, [currentQuestion, setResponse])

  // Handle selection complete for auto-advance on click (not just keyboard)
  const handleSelectionComplete = useCallback(() => {
    if (!currentQuestion || isAnimating) return

    if (shouldAutoAdvanceScreening(currentQuestion)) {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
      }
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        triggerTransition(true)
      }, 300)
    }
  }, [currentQuestion, isAnimating, triggerTransition])

  if (!currentQuestion) {
    return null
  }

  // Get title from settings or use default
  const title = flowSettings.screening.introTitle || 'Quick Questions'
  const subtitle = flowSettings.screening.introMessage || 'Please answer these questions to help us determine your eligibility for this study.'

  return (
    <StepLayout
      title={title}
      subtitle={subtitle}
      showBackButton
      onBack={previousQuestion}
      actions={
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={previousQuestion}
            disabled={isAnimating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
            <EscapeHint variant="light" />
          </Button>
          {/* Typeform-style button animation */}
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton
              onClick={handleNext}
              disabled={!canProceed}
            >
              {isLastQuestion ? 'Continue' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </div>
      }
    >
      {/* Subtle Progress Bar - only show when there are enough questions */}
      {visibleQuestions.length >= 3 && (
        <div className="mb-6">
          <Progress value={progress} branded className="h-1" />
        </div>
      )}

      {/* Question Content */}
      <div className="min-h-[200px]">
        <QuestionRenderer
          question={currentQuestion}
          value={getResponse(currentQuestion.id)}
          onChange={handleResponseChange}
          showKeyboardHints={showHints}
          onSelectionComplete={handleSelectionComplete}
          onEnterPress={handleEnterPress}
          onTextFocusChange={setIsTextInputFocused}
        />
      </div>
    </StepLayout>
  )
}
