'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { BrandedButton } from '@/components/study-flow/player/step-layout'
import { AutoAdvanceIndicator } from '@/components/study-flow/player/auto-advance-indicator'
import { useQuestionKeyboard } from '@/hooks/use-question-keyboard'
import { useAutoAdvance } from '@/hooks/use-auto-advance'
import { usePlatform } from '@/hooks/use-platform'
import type { PostTaskQuestion } from '@veritio/study-types'
import type {
  ResponseValue,
  MultipleChoiceQuestionConfig,
  MultiChoiceResponseValue,
  TaskMetricsContext,
} from '@veritio/study-types/study-flow-types'
import { evaluateDisplayLogicWithTaskContext } from '@veritio/prototype-test/lib/display-logic-evaluator'
import { QuestionRenderer } from '@/components/players/shared/question-renderer'

export interface PostTaskQuestionResponse {
  questionId: string
  value: ResponseValue
  responseTimeMs: number | null
}

export interface PostTaskQuestionsScreenProps {
  taskNumber: number
  questions: PostTaskQuestion[]
  taskOutcome?: 'success' | 'failure' | 'abandoned' | 'skipped'
  taskMetrics?: TaskMetricsContext
  onComplete: (responses: PostTaskQuestionResponse[]) => void
  pageMode?: 'one_per_page' | 'all_on_one'
  autoAdvanceEnabled?: boolean
  title?: string
  subtitle?: string
}

export function PostTaskQuestionsScreen({
  taskNumber,
  questions,
  taskOutcome,
  taskMetrics,
  onComplete,
  pageMode = 'all_on_one',
  autoAdvanceEnabled = false,
  title,
  subtitle,
}: PostTaskQuestionsScreenProps) {
  // Track responses for each question
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({})
  // Track current question index for one_per_page mode
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  // Track text input focus for keyboard navigation
  const [isTextInputFocused, setIsTextInputFocused] = useState(false)

  // Timing tracking for per-question response time
  // eslint-disable-next-line react-hooks/purity
  const screenMountedAt = useRef<number>(Date.now())
  const questionShownAt = useRef<Record<string, number>>({})
  const questionAnsweredAt = useRef<Record<string, number>>({})

  const { isTouchDevice } = usePlatform()

  const handleResponseChange = useCallback((questionId: string, value: ResponseValue) => {
    // Track when this question was first answered (first meaningful response)
    if (!questionAnsweredAt.current[questionId]) {
      questionAnsweredAt.current[questionId] = Date.now()
    }
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  // Build response map for display logic evaluation (question responses only)
  // Task metrics are handled separately via evaluateDisplayLogicWithTaskContext
  const responseMap = useMemo(() => {
    const map = new Map<string, ResponseValue>()

    // Add current question responses
    Object.entries(responses).forEach(([questionId, value]) => {
      map.set(questionId, value)
    })

    return map
  }, [responses])

  // Build effective task context from either taskMetrics or legacy taskOutcome
  const effectiveTaskContext: TaskMetricsContext | undefined = useMemo(() => {
    // If full task metrics provided, use them
    if (taskMetrics) {
      return taskMetrics
    }
    // Fallback to legacy taskOutcome (backward compatibility)
    if (taskOutcome) {
      return {
        outcome: taskOutcome,
        isDirect: undefined,
        clickCount: 0,
        misclickCount: 0,
        backtrackCount: 0,
        totalTimeMs: 0,
        timeToFirstClickMs: 0,
        pathTaken: [],
        pathLength: 0,
      }
    }
    return undefined
  }, [taskMetrics, taskOutcome])

  // Filter questions based on display logic with task metrics support
  // This enables conditions like "show if misclicks > 3" or "show if time > 30s"
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) =>
      evaluateDisplayLogicWithTaskContext(q.display_logic, responseMap, effectiveTaskContext)
    )
  }, [questions, responseMap, effectiveTaskContext])

  // Check if all required visible questions are answered
  const canContinue = useMemo(() => {
    return visibleQuestions.every((q) => {
      const isRequired = q.is_required || q.required
      if (!isRequired) return true

      const response = responses[q.id]
      if (response === undefined || response === null) return false
      if (typeof response === 'string' && response.trim() === '') return false
      if (Array.isArray(response) && response.length === 0) return false
      return true
    })
  }, [visibleQuestions, responses])

  const handleContinue = useCallback(() => {
    // Only include responses for visible questions, with proper type guard
    const responseArray: PostTaskQuestionResponse[] = visibleQuestions
      .map((q) => {
        const value = responses[q.id]
        if (value === undefined) return null

        // Calculate response time: from question shown to answer submitted
        const shownAt = questionShownAt.current[q.id]
        const answeredAt = questionAnsweredAt.current[q.id]
        const responseTimeMs = shownAt && answeredAt ? answeredAt - shownAt : null

        return { questionId: q.id, value, responseTimeMs }
      })
      .filter((r): r is PostTaskQuestionResponse => r !== null)

    onComplete(responseArray)
  }, [visibleQuestions, responses, onComplete])

  // Track if we've already auto-skipped (prevents infinite loops)
  const hasAutoSkipped = useRef(false)

  // Reset auto-skip flag when task changes (component may be reused)
  useEffect(() => {
    hasAutoSkipped.current = false
  }, [taskNumber])

  // Auto-continue when all questions are hidden by display logic
  useEffect(() => {
    if (visibleQuestions.length === 0 && !hasAutoSkipped.current) {
      hasAutoSkipped.current = true
      onComplete([])
    }
  }, [visibleQuestions.length, onComplete])

  // Calculate progress based on mode
  const progress = useMemo(() => {
    if (visibleQuestions.length === 0) return 100
    if (pageMode === 'one_per_page') {
      // Progress based on current question index
      return ((currentQuestionIndex + 1) / visibleQuestions.length) * 100
    }
    // all_on_one: Progress based on answered questions
    const answeredCount = visibleQuestions.filter(q => {
      const response = responses[q.id]
      return response !== undefined && response !== null
    }).length
    return (answeredCount / visibleQuestions.length) * 100
  }, [visibleQuestions, responses, pageMode, currentQuestionIndex])

  // Get current question for one_per_page mode
  const currentQuestion = visibleQuestions[currentQuestionIndex]
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1

  // Track when each question is first shown
  // For all_on_one: all questions shown at mount time
  // For one_per_page: track when current question changes
  useEffect(() => {
    if (pageMode === 'all_on_one') {
      // All questions shown at once - use mount time
      visibleQuestions.forEach(q => {
        if (!questionShownAt.current[q.id]) {
          questionShownAt.current[q.id] = screenMountedAt.current
        }
      })
    }
  }, [visibleQuestions, pageMode])

  // Track when current question is shown in one_per_page mode
  useEffect(() => {
    if (pageMode === 'one_per_page' && currentQuestion) {
      if (!questionShownAt.current[currentQuestion.id]) {
        questionShownAt.current[currentQuestion.id] = Date.now()
      }
    }
  }, [pageMode, currentQuestion, currentQuestionIndex])

  // Check if current question is answered (for one_per_page mode navigation)
  const canProceedToNext = useMemo(() => {
    if (!currentQuestion) return true
    const isRequired = currentQuestion.is_required || currentQuestion.required
    if (!isRequired) return true

    const response = responses[currentQuestion.id]
    if (response === undefined || response === null) return false
    if (typeof response === 'string' && response.trim() === '') return false
    if (Array.isArray(response) && response.length === 0) return false
    return true
  }, [currentQuestion, responses])

  // Get options for choice-based questions (for keyboard shortcuts)
  const questionOptions = useMemo(() => {
    if (!currentQuestion || pageMode !== 'one_per_page') return []
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    return config?.options || []
  }, [currentQuestion, pageMode])

  // Get multi-select maxSelections for auto-advance detection
  const maxSelections = useMemo(() => {
    if (!currentQuestion || pageMode !== 'one_per_page') return undefined
    const questionType = currentQuestion.question_type || currentQuestion.type
    if (questionType !== 'multiple_choice') return undefined
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return undefined
    return config.maxSelections
  }, [currentQuestion, pageMode])

  // Get current multi-select selection count for auto-advance
  const currentSelectionCount = useMemo(() => {
    if (!currentQuestion || pageMode !== 'one_per_page') return 0
    const questionType = currentQuestion.question_type || currentQuestion.type
    if (questionType !== 'multiple_choice') return 0
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return 0
    const response = responses[currentQuestion.id]
    if (!response) return 0
    return ((response as MultiChoiceResponseValue)?.optionIds || []).length
  }, [currentQuestion, responses, pageMode])

  // Navigation handlers for one_per_page mode
  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      handleContinue()
    } else {
      setCurrentQuestionIndex(prev => Math.min(prev + 1, visibleQuestions.length - 1))
    }
  }, [isLastQuestion, handleContinue, visibleQuestions.length])

  const handleBack = useCallback(() => {
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))
  }, [])

  // Enter key handler for text inputs and navigation
  const handleEnterPress = useCallback(() => {
    if (pageMode === 'one_per_page' && canProceedToNext) {
      handleNext()
    } else if (pageMode === 'all_on_one' && canContinue) {
      handleContinue()
    }
  }, [pageMode, canProceedToNext, canContinue, handleNext, handleContinue])

  // Auto-advance hook for single-select questions (only in one_per_page mode)
  // Controlled by autoAdvanceEnabled prop (defaults to false for better UX)
  const { isAdvancing, remainingMs, cancelAdvance, triggerAdvance } = useAutoAdvance({
    enabled: pageMode === 'one_per_page' && autoAdvanceEnabled,
    questionType: (currentQuestion?.question_type || currentQuestion?.type || 'single_line_text') as any,
    pageMode,
    onAdvance: handleNext,
    maxSelections,
    currentSelectionCount,
  })

  // Keyboard navigation hook (only in one_per_page mode)
  const { showHints } = useQuestionKeyboard({
    enabled: pageMode === 'one_per_page' && !isTouchDevice,
    questionType: (currentQuestion?.question_type || currentQuestion?.type || 'single_line_text') as any,
    options: questionOptions,
    value: currentQuestion ? responses[currentQuestion.id] : undefined,
    onChange: (value) => {
      if (currentQuestion) {
        handleResponseChange(currentQuestion.id, value)
      }
    },
    onNext: handleEnterPress,
    onBack: handleBack,
    canProceed: canProceedToNext,
    scalePoints: (currentQuestion?.config as any)?.scalePoints || 5,
    isTextInputFocused,
    onSelectionComplete: triggerAdvance,
    maxSelections,
  })

  // Global Enter key handler for all_on_one mode
  useEffect(() => {
    if (pageMode !== 'all_on_one') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in a text field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (canContinue) {
          e.preventDefault()
          handleContinue()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pageMode, canContinue, handleContinue])

  // If no visible questions, don't render anything (we're auto-continuing)
  if (visibleQuestions.length === 0) {
    return null
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      {/* Main Content Area - matches survey layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-8 max-w-3xl">
          {/* Content Card - uses branding CSS variables */}
          <div
            className="p-6 md:p-8"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              border: '1px solid var(--style-card-border)',
              borderRadius: 'var(--style-radius)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            {/* Title and Subtitle */}
            <div className="mb-6">
              <h1
                className="text-xl font-semibold tracking-tight"
                style={{ color: 'var(--style-text-primary)' }}
              >
                {title ?? `Task ${taskNumber} Feedback`}
              </h1>
              {(subtitle ?? 'Please answer these questions about the task you just completed. Your feedback is valuable to us.') && (
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--style-text-secondary)' }}
                >
                  {subtitle ?? 'Please answer these questions about the task you just completed. Your feedback is valuable to us.'}
                </p>
              )}
            </div>

            {/* Progress Bar - only show when there are enough questions to make it meaningful */}
            {visibleQuestions.length >= 3 && (
              <div className="mb-6">
                <Progress value={progress} branded className="h-1" />
              </div>
            )}

            {/* Questions - render based on pageMode */}
            {pageMode === 'one_per_page' && currentQuestion ? (
              // One per page mode - show only current question
              <div className="space-y-4">
                {/* Question text with required indicator */}
                <div className="flex items-start gap-1">
                  <p
                    className="text-lg md:text-xl font-medium"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    {currentQuestion.question_text || currentQuestion.text || `Question ${currentQuestionIndex + 1}`}
                  </p>
                  {(currentQuestion.is_required || currentQuestion.required) && (
                    <span className="text-destructive text-lg md:text-xl flex-shrink-0">*</span>
                  )}
                </div>
                {/* Question renderer */}
                <QuestionRenderer
                  question={currentQuestion}
                  value={responses[currentQuestion.id]}
                  onChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  onSelectionComplete={triggerAdvance}
                  onEnterPress={handleEnterPress}
                  onTextFocusChange={setIsTextInputFocused}
                  showKeyboardHints={showHints}
                />
                {/* Auto-advance indicator */}
                <AutoAdvanceIndicator
                  isAdvancing={isAdvancing}
                  remainingMs={remainingMs}
                  onCancel={cancelAdvance}
                />
              </div>
            ) : (
              // All on one mode - show all questions
              <div className="space-y-8">
                {visibleQuestions.map((question, index) => {
                  const isRequired = question.is_required || question.required
                  const questionText = question.question_text || question.text || `Question ${index + 1}`

                  return (
                    <div key={question.id} className="space-y-4">
                      {/* Question text with required indicator */}
                      <div className="flex items-start gap-1">
                        <p
                          className="text-lg md:text-xl font-medium"
                          style={{ color: 'var(--style-text-primary)' }}
                        >
                          {questionText}
                        </p>
                        {isRequired && (
                          <span className="text-destructive text-lg md:text-xl flex-shrink-0">*</span>
                        )}
                      </div>
                      {/* Question renderer */}
                      <QuestionRenderer
                        question={question}
                        value={responses[question.id]}
                        onChange={(value) => handleResponseChange(question.id, value)}
                        onEnterPress={handleEnterPress}
                        onTextFocusChange={setIsTextInputFocused}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Navigation buttons - different layouts based on pageMode */}
          {pageMode === 'one_per_page' ? (
            // One per page: Back and Next/Continue buttons
            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                disabled={isFirstQuestion}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
                <EscapeHint variant="light" />
              </Button>
              <BrandedButton
                size="lg"
                onClick={handleNext}
                disabled={!canProceedToNext}
              >
                {isLastQuestion ? 'Continue' : 'Next'}
                <ArrowRight className="ml-2 h-4 w-4" />
                <KeyboardShortcutHint shortcut="enter" variant="dark" />
              </BrandedButton>
            </div>
          ) : (
            // All on one: Single Continue button
            <div className="mt-6 flex justify-end">
              <BrandedButton
                size="lg"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
                <KeyboardShortcutHint shortcut="enter" variant="dark" />
              </BrandedButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
