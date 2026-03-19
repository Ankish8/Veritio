'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { ButtonBounce } from '../css-animations'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { useFlowSettings, useCurrentQuestionIndex, useResponses, useCurrentStep, usePlayerActions, useStudyId, useParticipantId } from '@/stores/study-flow-player'
import { useQuestionKeyboard } from '@/hooks/use-question-keyboard'
import { useAutoAdvance } from '@/hooks/use-auto-advance'
import { usePlatform } from '@veritio/ui'
import { useTriggerTransition } from '@/hooks/use-trigger-transition'
import { QuestionRenderer } from '../question-renderers/question-renderer'
import { AutoAdvanceIndicator } from '../auto-advance-indicator'
import { StepLayout, BrandedButton } from '../step-layout'
import { hasValidResponse, isSingleSelectChoice } from '../question-validation'
import type { ResponseValue, MultipleChoiceQuestionConfig, MultiChoiceResponseValue, AiFollowupConfig } from '@veritio/study-types/study-flow-types'
import { useAiFollowup } from '@/hooks/use-ai-followup'
import { AiFollowupQuestionView } from '../ai-followup-question-view'

interface QuestionsStepProps {
  section: 'pre_study' | 'post_study'
}

export function QuestionsStep({ section }: QuestionsStepProps) {
  const t = useTranslations()

  // State subscriptions
  const flowSettings = useFlowSettings()
  const currentQuestionIndex = useCurrentQuestionIndex()
  const responses = useResponses()
  const currentStep = useCurrentStep()
  const studyId = useStudyId()
  const participantId = useParticipantId()

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

  // Actions
  const {
    nextQuestion,
    previousQuestion,
    setResponse,
    getResponse,
    startQuestionTimer,
    getVisibleQuestions,
    nextStep,
  } = usePlayerActions()

  const { isTouchDevice } = usePlatform()
  const [isTextInputFocused, setIsTextInputFocused] = useState(false)
  const [followupTextAnswer, setFollowupTextAnswer] = useState('')
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const sectionSettings =
    section === 'pre_study'
      ? flowSettings.preStudyQuestions
      : flowSettings.postStudyQuestions

  const visibleQuestions = getVisibleQuestions()
  const currentQuestion = visibleQuestions[currentQuestionIndex]

  // Reset isTextInputFocused when question changes to a non-text type
  // This ensures keyboard shortcuts work for choice-based questions
  useEffect(() => {
    if (currentQuestion && !['single_line_text', 'multi_line_text'].includes(currentQuestion.question_type)) {
      setIsTextInputFocused(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, currentQuestion?.question_type])

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true
    return hasValidResponse(currentQuestion, responses)
  }, [currentQuestion, responses])

  // Transition animation with AI follow-up interception (shared hook)
  const {
    isTransitioning,
    isAnimating,
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

  // Reset animation state and AI follow-ups when question changes
  useEffect(() => {
    resetTransitionState()
    resetFollowups()
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current)
      autoAdvanceTimeoutRef.current = null
    }
  }, [currentQuestionIndex, resetFollowups, resetTransitionState])

  const progress = visibleQuestions.length > 0
    ? ((currentQuestionIndex + 1) / visibleQuestions.length) * 100
    : 100
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

  // Get current multi-select selection count for auto-advance
  const currentSelectionCount = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type !== 'multiple_choice') return 0
    const config = currentQuestion.config as MultipleChoiceQuestionConfig
    if (config.mode !== 'multi') return 0
    const response = responses.get(currentQuestion.id)
    if (!response) return 0
    return ((response.value as MultiChoiceResponseValue)?.optionIds || []).length
  }, [currentQuestion, responses])

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

  const handleNext = useCallback(() => {
    if (isAnimating) return
    triggerTransition()
  }, [isAnimating, triggerTransition])

  const handleEnterPress = useCallback(() => {
    if (canProceed && !isAnimating) {
      triggerTransition()
    }
  }, [canProceed, isAnimating, triggerTransition])

  // Auto-advance hook
  const { isAdvancing, remainingMs, cancelAdvance, triggerAdvance } = useAutoAdvance({
    enabled: sectionSettings.autoAdvance ?? false,
    questionType: currentQuestion?.question_type || 'single_line_text',
    pageMode: sectionSettings.pageMode ?? 'one_per_page',
    onAdvance: nextQuestion,
    maxSelections,
    currentSelectionCount,
  })

  // Keyboard navigation hook
  const { showHints } = useQuestionKeyboard({
    enabled: !isTouchDevice && !isAnimating,
    questionType: currentQuestion?.question_type || 'single_line_text',
    options: questionOptions,
    value: currentQuestion ? getResponse(currentQuestion.id) : undefined,
    onChange: (value) => {
      if (currentQuestion) {
        setResponse(currentQuestion.id, value)
        // Auto-advance for single-select questions (Typeform style)
        if (isSingleSelectChoice(currentQuestion) && !isAnimating) {
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
    onBack: previousQuestion,
    canProceed,
    scalePoints: (currentQuestion?.config as any)?.scalePoints || 5,
    isTextInputFocused,
    maxSelections,
  })

  // Track if we've already triggered skip for empty questions
  const hasSkipped = useRef(false)

  // Handle case where all questions are hidden by display logic
  useEffect(() => {
    if (visibleQuestions.length === 0 && !hasSkipped.current && currentStep === section) {
      hasSkipped.current = true
      nextStep()
    }
  }, [visibleQuestions.length, nextStep, currentStep, section])

  // Start timer when question changes
  useEffect(() => {
    if (currentQuestion) {
      startQuestionTimer()
    }
  }, [currentQuestionIndex, startQuestionTimer, currentQuestion])

  const handleResponseChange = useCallback((value: ResponseValue) => {
    if (currentQuestion) {
      setResponse(currentQuestion.id, value)
    }
  }, [currentQuestion, setResponse])

  // Clean up autoAdvance timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current)
    }
  }, [])

  // Show nothing while waiting for skip effect to fire
  if (visibleQuestions.length === 0 || !currentQuestion) {
    return null
  }

  // Use introTitle if set, otherwise fall back to default section title
  const defaultSectionTitle =
    section === 'pre_study' ? t('questions.beforeWeBegin') : t('questions.almostDone')
  const sectionTitle = sectionSettings.introTitle || defaultSectionTitle

  // Default subtitle
  const defaultSubtitle =
    section === 'pre_study'
      ? t('questions.preStudySubtitle')
      : t('questions.postStudySubtitle')

  return (
    <StepLayout
      title={sectionTitle}
      subtitle={sectionSettings.introMessage || defaultSubtitle}
      showBackButton
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
            {t('common.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </BrandedButton>
        </div>
        ) :
        aiFollowupPhase === 'showing' ? undefined : (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={previousQuestion}
            disabled={isAnimating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
            <EscapeHint variant="light" />
          </Button>
          {/* Typeform-style button animation */}
          <ButtonBounce isActive={isTransitioning}>
            <BrandedButton
              onClick={handleNext}
              disabled={!canProceed}
            >
              {isLastQuestion ? t('common.continue') : t('common.next')}
              <ArrowRight className="ml-2 h-4 w-4" />
              <KeyboardShortcutHint shortcut="enter" variant="dark" />
            </BrandedButton>
          </ButtonBounce>
        </div>
        )
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
            onChange={handleResponseChange}
            showKeyboardHints={showHints}
            onSelectionComplete={triggerAdvance}
            onEnterPress={handleEnterPress}
            onTextFocusChange={setIsTextInputFocused}
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
