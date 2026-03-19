'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { StepTransition, AnimationStyles } from './css-animations'
import { Bookmark } from 'lucide-react'
// PERFORMANCE: Use granular selectors to prevent unnecessary re-renders
import {
  useStudyFlowPlayerStore,
  useCurrentStep,
  useStudyId,
  useResponses,
  useCurrentQuestionIndex,
  useEarlyEndConfig,
  usePlayerActions,
} from '@/stores/study-flow-player'
import type {
  StudyFlowSettings,
  StudyFlowQuestion,
} from '@veritio/study-types/study-flow-types'
import type { BrandingSettings } from '@/components/builders/shared/types'
import type { SurveyRule } from '@/lib/supabase/survey-rules-types'
import { Button } from '@/components/ui/button'
import { WelcomeStep } from './steps/welcome-step'
import { AgreementStep } from './steps/agreement-step'
import { ScreeningStep } from './steps/screening-step'
import { IdentifierStep } from './steps/identifier-step'
import { QuestionsStep } from './steps/questions-step'
import { SurveyQuestionsStep } from './steps/survey-questions-step'
import { InstructionsStep } from './steps/instructions-step'
import { ThankYouStep } from './steps/thank-you-step'
import { RejectionStep } from './steps/rejection-step'
import { ClosedStep } from './steps/closed-step'
import { EarlySurveyEndStep } from './steps/early-survey-end-step'
import { SaveProgressDialog } from './save-progress-dialog'
import { BrandingProvider } from './branding-provider'
import { ThemeProvider } from './theme-provider'

// LocalStorage key for saving progress
const PROGRESS_KEY_PREFIX = 'survey_progress_'

// Study meta data for welcome screen display
interface StudyMeta {
  title: string
  description: string | null
  purpose: string | null
  participantRequirements: string | null
}

interface StudyFlowPlayerProps {
  studyId: string
  participantId?: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  settings: StudyFlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions?: StudyFlowQuestion[] // For survey study type
  branding?: BrandingSettings | null
  studyMeta?: StudyMeta | null // For welcome screen display
  // PERFORMANCE: Pre-loaded survey rules (eliminates client-side API call)
  initialRules?: SurveyRule[]
  onFlowComplete: () => void
  onScreeningReject: () => void
  children?: ReactNode // The activity component (CardSortPlayer or TreeTestPlayer) - not used for survey
  // Save progress props
  studyCode?: string // Share code for the study (needed for resume URLs)
  sessionToken?: string // Session token for API calls
  isPreviewMode?: boolean // Disable save in preview mode
  // Practice round indicator (for first impression studies)
  hasPracticeRound?: boolean
}

// Page transition animations are handled by CSS via StepTransition component

export function StudyFlowPlayer({
  studyId,
  participantId,
  studyType,
  settings,
  screeningQuestions,
  preStudyQuestions,
  postStudyQuestions,
  surveyQuestions,
  branding,
  studyMeta,
  initialRules,
  onFlowComplete,
  onScreeningReject,
  children,
  studyCode,
  sessionToken,
  isPreviewMode = false,
  hasPracticeRound = false,
}: StudyFlowPlayerProps) {
  // PERFORMANCE: Use granular selectors - each only triggers re-renders when its value changes
  const currentStep = useCurrentStep()
  const storedStudyId = useStudyId()
  const responses = useResponses()
  const currentQuestionIndex = useCurrentQuestionIndex()
  const earlyEndConfig = useEarlyEndConfig()

  // Actions are stable references (don't cause re-renders)
  const { nextStep: _nextStep, getResponsesForSubmission } = usePlayerActions()

  // Initialize still needs direct store access for the initialize function
  const initialize = useStudyFlowPlayerStore(s => s.initialize)

  // Save progress dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  // Check if save button should be shown (only during active survey steps)
  // Show in preview mode too so the feature can be tested
  const showSaveButton = studyCode &&
    sessionToken &&
    ['survey', 'pre_study', 'post_study', 'screening'].includes(currentStep)

  // Save to localStorage
  const handleSaveToDevice = useCallback(async () => {
    if (!studyCode || !participantId) return

    // Convert Map to array for JSON serialization
    const responsesArray = Array.from(responses.entries()).map(([questionId, resp]) => ({
      questionId,
      value: resp.value,
    }))

    const progressData = {
      studyId,
      participantId,
      sessionToken,
      currentStep,
      currentQuestionIndex,
      responses: responsesArray,
      lastSaved: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    localStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${studyCode}_${participantId}`,
      JSON.stringify(progressData)
    )
  }, [studyId, studyCode, participantId, sessionToken, currentStep, currentQuestionIndex, responses])

  // Get resume link via API (saves progress to server for cross-device resume)
  const handleGetResumeLink = useCallback(async (): Promise<string> => {
    if (!studyCode || !sessionToken) {
      throw new Error('Missing study code or session token')
    }

    // In preview mode, return a mock URL (no real session exists)
    if (isPreviewMode) {
      const baseUrl = window.location.origin
      return `${baseUrl}/s/${studyCode}?resume=preview-demo-token`
    }

    // Prepare progress data for server-side storage
    const responsesArray = Array.from(responses.entries()).map(([questionId, resp]) => ({
      questionId,
      value: resp.value,
    }))

    const progressData = {
      currentStep,
      currentQuestionIndex,
      responses: responsesArray,
    }

    const response = await fetch(`/api/participate/${studyCode}/resume-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, progress: progressData }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate resume link')
    }

    const data = await response.json()
    return data.data.resumeUrl
  }, [studyCode, sessionToken, isPreviewMode, currentStep, currentQuestionIndex, responses])

  // Track if we've initialized for this study
  const hasInitialized = useRef(false)
  const initializedStudyId = useRef<string | null>(null)

  // Initialize the player store ONCE per study
  // Using refs prevents re-initialization when props change references
  useEffect(() => {
    // Only initialize if:
    // 1. We haven't initialized yet, OR
    // 2. The study ID changed (different study), OR
    // 3. The store was reset (storedStudyId is null but we thought we initialized)
    const storeWasReset = hasInitialized.current && storedStudyId === null
    if (!hasInitialized.current || initializedStudyId.current !== studyId || storeWasReset) {
      hasInitialized.current = true
      initializedStudyId.current = studyId
      initialize({
        studyId,
        participantId: participantId || '',
        studyType,
        settings,
        screeningQuestions,
        preStudyQuestions,
        postStudyQuestions,
        branding,
        surveyQuestions,
        studyMeta,
        initialRules,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, storedStudyId]) // Also depend on storedStudyId to detect resets

  // AUTO-SAVE: Automatically save progress to localStorage on every change
  // This ensures participants don't lose progress on refresh
  useEffect(() => {
    // Skip in preview mode - only save for real participants
    if (isPreviewMode) return

    // Skip if missing required data
    if (!studyCode || !participantId || participantId === 'pending') return

    // Skip if we're on welcome step (nothing to save yet)
    if (currentStep === 'welcome') return

    // Convert Map to array for JSON serialization
    const responsesArray = Array.from(responses.entries()).map(([questionId, resp]) => ({
      questionId,
      value: resp.value,
    }))

    const progressData = {
      studyId,
      participantId,
      sessionToken,
      currentStep,
      currentQuestionIndex,
      responses: responsesArray,
      lastSaved: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    // Save to localStorage
    localStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${studyCode}_${participantId}`,
      JSON.stringify(progressData)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, studyCode, participantId, sessionToken, currentStep, currentQuestionIndex, responses])

  // Submit responses when leaving question steps
  const submitResponses = async () => {
    const responses = getResponsesForSubmission()
    if (responses.length === 0) return

    try {
      await fetch(`/api/studies/${studyId}/flow-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })
    } catch {
      // Silent fail - responses are saved locally and can be retried
    }
  }

  // Handle flow completion
  const handleFlowComplete = async () => {
    await submitResponses()
    onFlowComplete()
  }

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep key="welcome" />
      case 'agreement':
        return <AgreementStep key="agreement" onReject={onScreeningReject} />
      case 'screening':
        return (
          <ScreeningStep
            key="screening"
            onComplete={submitResponses}
          />
        )
      case 'identifier':
        return <IdentifierStep key="identifier" />
      case 'pre_study':
        return <QuestionsStep key="pre_study" section="pre_study" />
      case 'instructions':
        return <InstructionsStep key="instructions" studyType={studyType} hasPracticeRound={hasPracticeRound} />
      case 'activity':
        // Render the activity component (passed as children) - only for card_sort/tree_test/prototype_test
        // Must be flex flex-col to propagate height to activity players
        return (
          <div key="activity" className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
        )
      case 'survey':
        // Survey questionnaire step - the main activity for survey study type
        return <SurveyQuestionsStep key="survey" />
      case 'post_study':
        return <QuestionsStep key="post_study" section="post_study" />
      case 'thank_you':
        return <ThankYouStep key="thank_you" onComplete={handleFlowComplete} />
      case 'rejected':
        return <RejectionStep key="rejected" />
      case 'closed':
        return <ClosedStep key="closed" />
      case 'early_end':
        // Early survey termination based on logic rules
        return (
          <EarlySurveyEndStep
            key="early_end"
            config={earlyEndConfig || {
              title: 'Survey Complete',
              message: 'Thank you for your participation.',
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <ThemeProvider themeMode={branding?.themeMode}>
      <BrandingProvider branding={branding}>
        <div
          className="min-h-dvh flex flex-col text-foreground overflow-x-hidden"
          style={{ backgroundColor: 'var(--style-page-bg)' }}
        >
        {/* Save Progress Button - floating in top right during survey steps */}
        {showSaveButton && (
          <div className="fixed top-4 right-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              className="bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Save Progress
            </Button>
          </div>
        )}

        <AnimationStyles />
        <StepTransition
          stepKey={currentStep}
          className="flex-1 flex flex-col min-h-0"
        >
          {renderStep()}
        </StepTransition>

        {/* Save Progress Dialog */}
        {studyCode && (
          <SaveProgressDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            onSaveToDevice={handleSaveToDevice}
            onGetResumeLink={handleGetResumeLink}
          />
        )}
        </div>
      </BrandingProvider>
    </ThemeProvider>
  )
}

// Re-export for convenience
export { useStudyFlowPlayerStore }
