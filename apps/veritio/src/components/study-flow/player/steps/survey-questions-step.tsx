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
import { usePlatform } from '@veritio/ui'
import { useProgressiveReveal } from '@/hooks/use-progressive-reveal'
import { useTriggerTransition } from '@/hooks/use-trigger-transition'
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
  const [followupTextAnswer, setFollowupTextAnswer] = useState('')
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Transition animation with AI follow-up interception (shared hook)
  const {
    isTransitioning,
    isAnimating,
    setIsAnimating,
    triggerTransition,
    triggerTransitionRef,
    startTransitionAnimation,
    resetTransitionState,
  } = useTriggerTransition({
    isAnimating: false,
    canProceed,
    nextQuestion,
    currentQuestion,
    responses,
    evaluateAndMaybeIntercept,
  })

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
      () => startTransitionAnimation()
    )
  }, [currentQuestion, setFollowupAnswer, submitFollowupAndContinue, startTransitionAnimation])

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
  }, [currentQuestion, isAnimating, triggerTransitionRef])

  // Reset animation state and AI follow-ups when question changes
  useEffect(() => {
    resetTransitionState()
    resetFollowups()
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }, [currentQuestionIndex, resetFollowups, resetTransitionState])

  // Clean up autoAdvance timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

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
        <SurveyActionBar
          aiFollowupPhase={aiFollowupPhase}
          aiFollowupType={aiFollowupType}
          followupTextAnswer={followupTextAnswer}
          handleFollowupSubmit={handleFollowupSubmit}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          isTransitioning={isTransitioning}
          canProceed={canProceed}
          handleNext={handleNext}
          previousQuestion={previousQuestion}
        />
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

/* ---------- Extracted sub-components ---------- */

interface SurveyActionBarProps {
  aiFollowupPhase: string
  aiFollowupType: string
  followupTextAnswer: string
  handleFollowupSubmit: (response: unknown) => void
  isFirstQuestion: boolean
  isLastQuestion: boolean
  isTransitioning: boolean
  canProceed: boolean
  handleNext: () => void
  previousQuestion: () => void
}

function SurveyActionBar({
  aiFollowupPhase,
  aiFollowupType,
  followupTextAnswer,
  handleFollowupSubmit,
  isFirstQuestion,
  isLastQuestion,
  isTransitioning,
  canProceed,
  handleNext,
  previousQuestion,
}: SurveyActionBarProps) {
  if (aiFollowupPhase === 'evaluating') return undefined

  if (aiFollowupPhase === 'showing' && aiFollowupType === 'text') {
    return (
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
    )
  }

  if (aiFollowupPhase === 'showing') return undefined

  return (
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
