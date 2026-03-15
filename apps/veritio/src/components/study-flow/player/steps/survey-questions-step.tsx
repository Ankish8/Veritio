'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { ButtonBounce } from '../css-animations'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
// PERFORMANCE: Use granular selectors to prevent re-renders on unrelated state changes
import {
  useFlowSettings,
  useCurrentQuestionIndex,
  useResponses,
  usePlayerActions,
  useStudyId,
  useParticipantId,
  useSessionToken,
} from '@/stores/study-flow-player'
import { useQuestionKeyboard } from '@/hooks/use-question-keyboard'
import { useAutoAdvance } from '@/hooks/use-auto-advance'
import { usePlatform } from '@/hooks/use-platform'
import { useProgressiveReveal } from '@/hooks/use-progressive-reveal'
import { QuestionRenderer } from '../question-renderers/question-renderer'
import { AutoAdvanceIndicator } from '../auto-advance-indicator'
import { StepLayout, BrandedButton } from '../step-layout'
import { AnimatedQuestion, ContinueButton } from '../progressive-reveal'
import { hasValidResponse, shouldAutoAdvanceSurvey } from '../question-validation'
import type { ResponseValue, MultipleChoiceQuestionConfig, MultiChoiceResponseValue, StudyFlowQuestion, AiFollowupConfig } from '@veritio/study-types/study-flow-types'
import { useAiFollowup } from '@/hooks/use-ai-followup'
import { AiFollowupQuestionView } from '../ai-followup-question-view'

export function SurveyQuestionsStep() {
  // PERFORMANCE: Granular subscriptions - only re-render when specific values change
  const flowSettings = useFlowSettings()
  const currentQuestionIndex = useCurrentQuestionIndex()
  const responses = useResponses()

  // Recording context for audio_response questions
  const studyId = useStudyId()
  const participantId = useParticipantId()
  const sessionToken = useSessionToken()

  // Memoize recording context to avoid unnecessary re-renders
  const recordingContext = useMemo(() => {
    if (studyId && participantId && sessionToken) {
      return { studyId, participantId, sessionToken }
    }
    return undefined
  }, [studyId, participantId, sessionToken])

  // Actions are stable references (never cause re-renders)
  const {
    nextQuestion,
    previousQuestion,
    setResponse,
    getResponse,
    startQuestionTimer,
    getVisibleQuestions,
    nextStep,
    initializeProgressiveReveal,
  } = usePlayerActions()

  // AI follow-up probing
  const {
    phase: aiFollowupPhase,
    followupQuestion: aiFollowupQuestion,
    followupType: aiFollowupType,
    followupConfig: aiFollowupConfig,
    evaluateAndMaybeIntercept,
    submitFollowupAndContinue,
    setFollowupAnswer,
    resetFollowups,
  } = useAiFollowup({
    studyId: studyId || '',
    participantId: participantId || '',
  })

  const { isTouchDevice } = usePlatform()
  const [isTextInputFocused, setIsTextInputFocused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [followupTextAnswer, setFollowupTextAnswer] = useState('')
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Ref to always read the latest triggerTransition in setTimeout callbacks (avoids stale closure)
  const triggerTransitionRef = useRef<(skipCanProceedCheck?: boolean) => Promise<void>>(async () => {})

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

  // Get survey questionnaire settings with fallback
  const surveySettings = flowSettings.surveyQuestionnaire ?? {
    enabled: true,
    showIntro: true,
    introTitle: 'Survey',
    introMessage: 'Please answer the following questions.',
    pageMode: 'one_per_page',
    randomizeQuestions: false,
    showProgressBar: true,
    allowSkipQuestions: false,
    autoAdvance: false,
  }

  const visibleQuestions = getVisibleQuestions()

  // Progressive reveal hook
  const {
    isProgressiveMode,
    revealedQuestionIds,
    activeQuestionId,
    revealNextQuestion,
    setQuestionRef,
    shouldShowContinueButton,
    isLastRevealedQuestion,
    allQuestionsRevealed,
  } = useProgressiveReveal()

  // Initialize progressive reveal on mount
  useEffect(() => {
    if (isProgressiveMode && visibleQuestions.length > 0) {
      initializeProgressiveReveal()
    }
  }, [isProgressiveMode, visibleQuestions.length, initializeProgressiveReveal])

  // For one_per_page mode
  const currentQuestion = visibleQuestions[currentQuestionIndex]

  // Reset isTextInputFocused when question changes to a non-text type
  useEffect(() => {
    if (currentQuestion && !['single_line_text', 'multi_line_text'].includes(currentQuestion.question_type)) {
      setIsTextInputFocused(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, currentQuestion?.question_type])

  const allowSkip = surveySettings.allowSkipQuestions ?? false

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true
    return hasValidResponse(currentQuestion, responses, allowSkip)
  }, [currentQuestion, responses, allowSkip])

  // Check if a question has valid response (for progressive mode)
  const checkQuestionValid = useCallback((question: StudyFlowQuestion): boolean => {
    return hasValidResponse(question, responses, allowSkip)
  }, [responses, allowSkip])

  // Progress calculation
  const progress = useMemo(() => {
    if (visibleQuestions.length === 0) return 100
    if (isProgressiveMode) {
      const answeredCount = visibleQuestions.filter(q => responses.has(q.id)).length
      return (answeredCount / visibleQuestions.length) * 100
    }
    return ((currentQuestionIndex + 1) / visibleQuestions.length) * 100
  }, [isProgressiveMode, visibleQuestions, responses, currentQuestionIndex])

  const isLastQuestion = currentQuestionIndex === visibleQuestions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  // Get options for choice-based questions (one_per_page mode)
  const questionOptions = useMemo(() => {
    if (!currentQuestion) return []
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    return config?.options || []
  }, [currentQuestion])

  const maxSelections = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type !== 'multiple_choice') return undefined
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return undefined
    return config.maxSelections
  }, [currentQuestion])

  const currentSelectionCount = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type !== 'multiple_choice') return 0
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return 0
    const response = responses.get(currentQuestion.id)
    if (!response) return 0
    return ((response.value as MultiChoiceResponseValue)?.optionIds || []).length
  }, [currentQuestion, responses])

  // Typeform-style transition: button press animation → navigate
  // With AI follow-up interception for text questions
  const triggerTransition = useCallback(async (skipCanProceedCheck = false) => {
    if (isAnimating) return
    if (!skipCanProceedCheck && !canProceed) return

    // Check if current question has AI follow-up enabled
    const AI_FOLLOWUP_TYPES = ['single_line_text', 'multi_line_text', 'nps', 'opinion_scale', 'slider', 'multiple_choice', 'yes_no']
    if (currentQuestion && AI_FOLLOWUP_TYPES.includes(currentQuestion.question_type)) {
      const config = currentQuestion.config as { aiFollowup?: AiFollowupConfig; [key: string]: unknown }
      if (config?.aiFollowup?.enabled) {
        const response = responses.get(currentQuestion.id)
        const rawValue = response?.value

        // Build human-readable answer text based on question type
        let answerText = ''
        switch (currentQuestion.question_type) {
          case 'single_line_text':
          case 'multi_line_text':
            answerText = typeof rawValue === 'string' ? rawValue : (rawValue as any)?.text || ''
            break
          case 'nps': {
            const npsVal = (rawValue as any)?.value
            answerText = npsVal != null ? `Rated ${npsVal} out of 10` : ''
            break
          }
          case 'opinion_scale': {
            const scaleConfig = currentQuestion.config as any
            answerText = typeof rawValue === 'number' ? `Rated ${rawValue} out of ${scaleConfig.scalePoints || 5}` : ''
            break
          }
          case 'slider': {
            const sliderConfig = currentQuestion.config as any
            answerText = typeof rawValue === 'number' ? `Selected ${rawValue} on ${sliderConfig.minValue ?? 0}-${sliderConfig.maxValue ?? 100} scale` : ''
            break
          }
          case 'multiple_choice': {
            const mcConfig = currentQuestion.config as any
            const options: { id: string; label: string }[] = mcConfig?.options ?? []
            if (rawValue && typeof rawValue === 'object' && 'optionIds' in rawValue) {
              const labels = ((rawValue as any).optionIds as string[]).map(id => options.find(o => o.id === id)?.label ?? id)
              answerText = `Selected: ${labels.join(', ')}`
            } else if (rawValue && typeof rawValue === 'object' && 'optionId' in rawValue) {
              const opt = options.find(o => o.id === (rawValue as any).optionId)
              answerText = `Selected: ${opt?.label ?? (rawValue as any).optionId}`
            }
            break
          }
          case 'yes_no':
            answerText = rawValue === true ? 'Yes' : rawValue === false ? 'No' : ''
            break
        }

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

    setIsAnimating(true)
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)
      animationTimeoutRef.current = setTimeout(() => {
        nextQuestion()
      }, 300)
    }, 100)
  }, [isAnimating, canProceed, nextQuestion, currentQuestion, responses, evaluateAndMaybeIntercept])

  // Keep ref in sync so setTimeout callbacks always use latest triggerTransition
  triggerTransitionRef.current = triggerTransition

  const handleNext = useCallback(() => {
    if (isAnimating) return
    triggerTransition()
  }, [isAnimating, triggerTransition])

  const handleFollowupSubmit = useCallback((response: unknown) => {
    setFollowupAnswer(response)
    setFollowupTextAnswer('')
    const config = currentQuestion?.config as { aiFollowup?: AiFollowupConfig; [key: string]: unknown }
    submitFollowupAndContinue(
      currentQuestion?.question_text || '',
      config,
      () => {
        setIsAnimating(true)
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(true)
          animationTimeoutRef.current = setTimeout(() => {
            nextQuestion()
          }, 300)
        }, 100)
      }
    )
  }, [currentQuestion, setFollowupAnswer, submitFollowupAndContinue, nextQuestion])

  const handleEnterPress = useCallback(() => {
    if (canProceed && !isAnimating) {
      triggerTransition()
    }
  }, [canProceed, isAnimating, triggerTransition])

  // Auto-advance hook (only for one_per_page mode)
  const { isAdvancing, remainingMs, cancelAdvance } = useAutoAdvance({
    enabled: !isProgressiveMode && (surveySettings.autoAdvance ?? false),
    questionType: currentQuestion?.question_type || 'single_line_text',
    pageMode: surveySettings.pageMode ?? 'one_per_page',
    onAdvance: nextQuestion,
    maxSelections,
    currentSelectionCount,
  })

  // Keyboard navigation hook (only for one_per_page mode)
  const { showHints } = useQuestionKeyboard({
    enabled: !isTouchDevice && !isProgressiveMode && !isAnimating,
    questionType: currentQuestion?.question_type || 'single_line_text',
    options: questionOptions,
    value: currentQuestion ? getResponse(currentQuestion.id) : undefined,
    onChange: (value) => {
      if (currentQuestion) {
        setResponse(currentQuestion.id, value)

        if (shouldAutoAdvanceSurvey(currentQuestion) && !isAnimating) {
          if (autoAdvanceTimeoutRef.current) {
            clearTimeout(autoAdvanceTimeoutRef.current)
          }
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            triggerTransitionRef.current(true) // Use ref to avoid stale closure
          }, 300)
        }
      }
    },
    onNext: () => {
      if (canProceed && !isAnimating) {
        triggerTransition()
      }
    },
    onBack: isFirstQuestion ? undefined : previousQuestion,
    canProceed,
    scalePoints: (currentQuestion?.config as any)?.scalePoints || 5,
    isTextInputFocused,
    maxSelections,
  })

  // Track if we've already triggered skip for empty questions
  const hasSkipped = useRef(false)

  // Handle case where all questions are hidden by display logic
  useEffect(() => {
    if (visibleQuestions.length === 0 && !hasSkipped.current) {
      hasSkipped.current = true
      nextStep()
    }
  }, [visibleQuestions.length, nextStep])

  // Start timer when question changes (one_per_page mode)
  useEffect(() => {
    if (!isProgressiveMode && currentQuestion) {
      startQuestionTimer()
    }
  }, [isProgressiveMode, currentQuestionIndex, startQuestionTimer, currentQuestion])

  const handleResponseChange = useCallback((questionId: string) => (value: ResponseValue) => {
    setResponse(questionId, value)
  }, [setResponse])

  // Handle selection complete for auto-advance on click (not just keyboard)
  const handleSelectionComplete = useCallback(() => {
    if (!currentQuestion || isAnimating) return

    if (shouldAutoAdvanceSurvey(currentQuestion)) {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current)
      }
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        triggerTransitionRef.current(true) // Use ref to avoid stale closure
      }, 300)
    }
  }, [currentQuestion, isAnimating])

  // Reset animation state and AI follow-ups when question changes
  useEffect(() => {
    setIsTransitioning(false)
    setIsAnimating(false)
    resetFollowups()
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }, [currentQuestionIndex, resetFollowups])

  // Handle continue button click in progressive mode
  const handleContinueClick = useCallback((question: StudyFlowQuestion) => {
    if (checkQuestionValid(question)) {
      revealNextQuestion()
    }
  }, [checkQuestionValid, revealNextQuestion])

  // Handle completing the survey in progressive mode
  const handleCompleteSurvey = useCallback(() => {
    // Check all revealed questions have valid responses
    const allAnswered = visibleQuestions.every(q => !q.is_required || responses.has(q.id))
    if (allAnswered) {
      nextStep()
    }
  }, [visibleQuestions, responses, nextStep])

  // Show nothing while waiting for skip effect to fire
  if (visibleQuestions.length === 0) {
    return null
  }

  const sectionTitle = surveySettings.introTitle || 'Survey'
  const sectionSubtitle = surveySettings.introMessage || 'Please answer the following questions.'

  // Progressive reveal mode
  if (isProgressiveMode) {
    return (
      <StepLayout
        title={sectionTitle}
        subtitle={sectionSubtitle}
        showBackButton={false}
        actions={
          allQuestionsRevealed && (
            <BrandedButton
              onClick={handleCompleteSurvey}
              disabled={!visibleQuestions.every(q => !q.is_required || checkQuestionValid(q))}
            >
              Complete Survey
              <ArrowRight className="ml-2 h-4 w-4" />
            </BrandedButton>
          )
        }
      >
        {/* Progress Bar - only show when there are enough questions */}
        {surveySettings.showProgressBar && visibleQuestions.length >= 3 && (
          <div className="mb-6">
            <Progress value={progress} branded className="h-1" />
          </div>
        )}

        {/* Progressive Questions List */}
        <div className="space-y-8">
          {visibleQuestions.map((question, index) => {
            const isRevealed = revealedQuestionIds.has(question.id)
            const isActive = activeQuestionId === question.id
            const showContinue = shouldShowContinueButton(question) && isLastRevealedQuestion(question.id)
            const isLast = index === visibleQuestions.length - 1

            return (
              <AnimatedQuestion
                key={question.id}
                onRef={setQuestionRef(question.id)}
                questionId={question.id}
                isRevealed={isRevealed}
                isActive={isActive}
                index={index}
                className="pb-6 border-b border-border last:border-b-0"
              >
                <QuestionRenderer
                  question={question}
                  value={getResponse(question.id)}
                  onChange={handleResponseChange(question.id)}
                  showKeyboardHints={false}
                  onSelectionComplete={() => {
                    // Auto-reveal next question for choice-based questions
                    if (!shouldShowContinueButton(question)) {
                      setTimeout(() => revealNextQuestion(), 300)
                    }
                  }}
                  onEnterPress={() => handleContinueClick(question)}
                  onTextFocusChange={setIsTextInputFocused}
                  recordingContext={recordingContext}
                />

                {/* Continue button for text inputs and questions needing explicit continue */}
                {showContinue && (
                  <ContinueButton
                    onClick={() => handleContinueClick(question)}
                    disabled={question.is_required !== false && !checkQuestionValid(question)}
                    isLastQuestion={isLast && allQuestionsRevealed}
                  />
                )}
              </AnimatedQuestion>
            )
          })}
        </div>
      </StepLayout>
    )
  }

  // One per page mode (existing behavior)
  if (!currentQuestion) {
    return null
  }

  return (
    <StepLayout
      title={sectionTitle}
      subtitle={sectionSubtitle}
      showBackButton={!isFirstQuestion}
      onBack={previousQuestion}
      actions={
        aiFollowupPhase === 'evaluating' ? undefined :
        aiFollowupPhase === 'showing' && aiFollowupType === 'text' ? (
        <div className="flex justify-end">
          <BrandedButton
            onClick={() => {
              if (followupTextAnswer.trim()) handleFollowupSubmit(followupTextAnswer)
            }}
            disabled={!followupTextAnswer.trim()}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </BrandedButton>
        </div>
        ) :
        aiFollowupPhase === 'showing' ? undefined : (
        <div className="flex justify-between items-center">
          {!isFirstQuestion && (
            <Button
              variant="outline"
              size="lg"
              onClick={previousQuestion}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
              <EscapeHint variant="light" />
            </Button>
          )}
          {isFirstQuestion && <div />}
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
        )
      }
    >
      {/* Progress Bar - only show when there are enough questions */}
      {surveySettings.showProgressBar && visibleQuestions.length >= 3 && (
        <div className="mb-6">
          <Progress value={progress} branded className="h-1" />
        </div>
      )}

      {/* Question Content */}
      <div className="min-h-[200px]">
        {aiFollowupPhase === 'evaluating' || aiFollowupPhase === 'showing' ? (
          <AiFollowupQuestionView
            question={aiFollowupQuestion || ''}
            isEvaluating={aiFollowupPhase === 'evaluating'}
            followupType={aiFollowupType}
            followupConfig={aiFollowupConfig}
            onSubmit={handleFollowupSubmit}
            onAnswerChange={setFollowupTextAnswer}
          />
        ) : (
          <QuestionRenderer
            question={currentQuestion}
            value={getResponse(currentQuestion.id)}
            onChange={handleResponseChange(currentQuestion.id)}
            showKeyboardHints={showHints}
            onSelectionComplete={handleSelectionComplete}
            onEnterPress={handleEnterPress}
            onTextFocusChange={setIsTextInputFocused}
            recordingContext={recordingContext}
          />
        )}
      </div>

      {/* Auto-advance indicator */}
      <AutoAdvanceIndicator
        isAdvancing={isAdvancing}
        remainingMs={remainingMs}
        onCancel={cancelAdvance}
      />
    </StepLayout>
  )
}
