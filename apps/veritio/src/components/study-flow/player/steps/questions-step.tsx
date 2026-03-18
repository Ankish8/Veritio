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
import { QuestionRenderer } from '../question-renderers/question-renderer'
import { AutoAdvanceIndicator } from '../auto-advance-indicator'
import { StepLayout, BrandedButton } from '../step-layout'
import { hasValidResponse, isSingleSelectChoice } from '../question-validation'
import type { ResponseValue, MultipleChoiceQuestionConfig, MultiChoiceResponseValue, AiFollowupConfig } from '@veritio/study-types/study-flow-types'
import { useAiFollowup } from '@/hooks/use-ai-followup'
import { AiFollowupQuestionView } from '../ai-followup-question-view'

const AI_FOLLOWUP_TYPES = ['single_line_text', 'multi_line_text', 'nps', 'opinion_scale', 'slider', 'multiple_choice', 'yes_no']

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

  const canProceed = useMemo(() => {
    if (!currentQuestion) return true
    return hasValidResponse(currentQuestion, responses)
  }, [currentQuestion, responses])

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

  // Typeform-style transition: button press animation → navigate
  // With AI follow-up interception for text questions
  const triggerTransition = useCallback(async (skipCanProceedCheck = false) => {
    if (isAnimating) return
    if (!skipCanProceedCheck && !canProceed) return

    // Check if current question has AI follow-up enabled
    if (currentQuestion && AI_FOLLOWUP_TYPES.includes(currentQuestion.question_type)) {
      const config = currentQuestion.config as { aiFollowup?: AiFollowupConfig; [key: string]: unknown }
      if (config?.aiFollowup?.enabled) {
        const response = responses.get(currentQuestion.id)
        const rawValue = response?.value
        // Build answerText (human-readable summary for the AI evaluator)
        let answerText = ''
        const qType = currentQuestion.question_type
        if (qType === 'single_line_text' || qType === 'multi_line_text') {
          answerText = typeof rawValue === 'string' ? rawValue : (rawValue as any)?.text || ''
        } else if (qType === 'nps') {
          const npsVal = typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
            ? (rawValue as { value: number }).value : rawValue
          answerText = typeof npsVal === 'number' ? `Rated ${npsVal} out of 10` : ''
        } else if (qType === 'opinion_scale') {
          const points = config?.scalePoints ?? 5
          answerText = typeof rawValue === 'number' ? `Rated ${rawValue} out of ${points}` : ''
        } else if (qType === 'slider') {
          const min = config?.minValue ?? 0
          const max = config?.maxValue ?? 100
          answerText = typeof rawValue === 'number' ? `Selected ${rawValue} on ${min}-${max} scale` : ''
        } else if (qType === 'multiple_choice') {
          const options = (config?.options ?? []) as { id: string; label: string }[]
          if (rawValue && typeof rawValue === 'object' && 'optionIds' in rawValue) {
            const resp = rawValue as { optionIds: string[]; otherText?: string }
            const labels = resp.optionIds.map((id: string) => options.find((o) => o.id === id)?.label ?? id)
            answerText = `Selected: ${[...labels, ...(resp.otherText ? [`Other: "${resp.otherText}"`] : [])].join(', ')}`
          } else if (rawValue && typeof rawValue === 'object' && 'optionId' in rawValue) {
            const resp = rawValue as { optionId: string; otherText?: string }
            const label = options.find((o) => o.id === resp.optionId)?.label ?? resp.optionId
            answerText = resp.otherText ? `Selected: ${label} (Other: "${resp.otherText}")` : `Selected: ${label}`
          }
        } else if (qType === 'yes_no') {
          answerText = typeof rawValue === 'boolean' ? (rawValue ? 'Yes' : 'No') : ''
        }
        if (answerText) {
          const intercepted = await evaluateAndMaybeIntercept(
            currentQuestion.id,
            currentQuestion.question_text,
            answerText,
            config,
            qType,
            rawValue
          )
          if (intercepted) return
        }
      }
    }

    setIsAnimating(true)

    // Brief pause before animation
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(true)

      // After animation completes, proceed
      animationTimeoutRef.current = setTimeout(() => {
        nextQuestion()
      }, 300)
    }, 100)
  }, [isAnimating, canProceed, nextQuestion, currentQuestion, responses, evaluateAndMaybeIntercept])

  // Keep ref in sync so setTimeout callbacks always use latest triggerTransition
  triggerTransitionRef.current = triggerTransition

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
