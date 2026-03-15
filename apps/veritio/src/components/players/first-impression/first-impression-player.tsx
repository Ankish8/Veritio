'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import {
  CountdownOverlay,
  ExposureScreen,
  PracticeCompleteScreen,
  SubmittingScreen,
  CompleteScreen,
  ErrorScreen,
} from './components'
import {
  PostTaskQuestionsScreen,
  type PostTaskQuestionResponse,
} from '../shared'
import { useImagePreloader } from './hooks'
import { RecordingConsentScreen } from '../shared/recording-consent-screen'
import { RecordingIndicator } from '../shared/recording-indicator'
import { useSessionRecording } from '@/hooks/use-session-recording'
import { useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import { Loader2 } from 'lucide-react'
import type {
  FirstImpressionPhase,
  FirstImpressionPlayerProps,
  FirstImpressionDesignWithQuestions,
  ExposureEvent,
  DesignResponse,
  DeviceInfo,
} from './types'

function detectDeviceType(viewportWidth: number): 'desktop' | 'tablet' | 'mobile' {
  if (viewportWidth < 768) return 'mobile'
  if (viewportWidth < 1024) return 'tablet'
  return 'desktop'
}

function getDeviceInfo(): DeviceInfo {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768
  return {
    deviceType: detectDeviceType(viewportWidth),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewportWidth,
    viewportHeight,
  }
}

function selectDesignByWeight(
  designs: FirstImpressionDesignWithQuestions[]
): FirstImpressionDesignWithQuestions {
  // Filter out practice designs
  const testDesigns = designs.filter((d) => !d.is_practice)

  if (testDesigns.length === 0) {
    throw new Error('No test designs available')
  }

  if (testDesigns.length === 1) {
    return testDesigns[0]
  }

  // Calculate total weight
  const totalWeight = testDesigns.reduce((sum, d) => sum + d.weight, 0)

  // Random value between 0 and totalWeight
  const random = Math.random() * totalWeight

  // Find the design that this random value falls into
  let accumulated = 0
  for (const design of testDesigns) {
    accumulated += design.weight
    if (random < accumulated) {
      return design
    }
  }

  // Fallback to first (shouldn't reach here)
  return testDesigns[0]
}

export function FirstImpressionPlayer({
  studyId,
  shareCode,
  designs: allDesigns,
  settings,
  embeddedMode = false,
  previewMode = false,
  sessionToken,
  participantId,
  onComplete,
  preventionData,
}: FirstImpressionPlayerProps) {
  // Determine which designs to show based on assignment mode
  const designsToShow = useMemo(() => {
    const practiceDesign = allDesigns.find((d) => d.is_practice)
    const testDesigns = allDesigns.filter((d) => !d.is_practice)

    // Include practice if a practice design exists - derive from designs themselves
    // rather than relying solely on settings.allowPracticeDesign (which may not be synced)
    const includePractice = practiceDesign != null

    if (settings.designAssignmentMode === 'sequential_all') {
      // Show all designs in order
      return includePractice ? [practiceDesign, ...testDesigns] : testDesigns
    } else {
      // Random single - select one design based on weights
      const selectedDesign = selectDesignByWeight(allDesigns)
      return includePractice ? [practiceDesign, selectedDesign] : [selectedDesign]
    }
  }, [allDesigns, settings.designAssignmentMode])

  const { isComplete: imagesLoaded } = useImagePreloader(designsToShow)

  // Determine initial phase: start with countdown immediately (images preload in background)
  // Only block on loading if there's no countdown to overlap with
  const countdownSeconds = Math.round(settings.countdownDurationMs / 1000)
  const initialPhase: FirstImpressionPhase = countdownSeconds > 0 ? 'countdown' : 'exposure'

  // State
  const [phase, setPhase] = useState<FirstImpressionPhase>(initialPhase)
  const [currentDesignIndex, setCurrentDesignIndex] = useState(0)
  const [, setResponses] = useState<DesignResponse[]>([])
  const [hasShownRecordingConsent, setHasShownRecordingConsent] = useState(false)

  // Ref mirror for responses - prevents stale closure bugs when callbacks
  // call setResponses then immediately call another callback that reads responses.
  // Pattern: update ref synchronously before calling dependent callbacks.
  const responsesRef = useRef<DesignResponse[]>([])

  // Track when questions phase started (set when transitioning to questions)
  const questionsStartedAtRef = useRef<number | null>(null)

  // Capture device info once at start
  const deviceInfoRef = useRef<DeviceInfo>(getDeviceInfo())

  // Get demographic data from study flow store (collected during identifier step)
  const participantDemographicData = useStudyFlowPlayerStore(
    (state) => state.participantDemographicData
  )

  // Recording settings
  const recordingEnabled = settings.sessionRecordingSettings?.enabled ?? false

  // Session recording hook
  const {
    isRecording,
    isPaused,
    isUploading,
    uploadProgress,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useSessionRecording({
    studyId,
    participantId: participantId || '',
    sessionToken: sessionToken || '',
    captureMode: settings.sessionRecordingSettings?.captureMode || 'audio',
    scope: 'session',
  })

  const currentDesign = designsToShow[currentDesignIndex]
  const isLastDesign = currentDesignIndex === designsToShow.length - 1
  const exposureDurationMs = settings.exposureDurationMs
  const isPracticeDesign = currentDesign?.is_practice ?? false

  // Recording consent handlers
  const handleRecordingConsent = useCallback(async () => {
    try {
      await startRecording()
    } catch {
      // Recording failed - continue without it
    }
    setHasShownRecordingConsent(true)
  }, [startRecording])

  const handleRecordingDecline = useCallback(() => {
    setHasShownRecordingConsent(true)
  }, [])

  // Countdown complete handler - if images aren't loaded yet, show a brief loading state
  // before transitioning to exposure. The 'waiting_for_images' phase is handled below.
  const handleCountdownComplete = useCallback(() => {
    setPhase('exposure')
  }, [])

  // Exposure complete handler
  const handleExposureComplete = useCallback((exposure: ExposureEvent) => {
    // Store exposure data with questionsStartedAt initialized
    const now = Date.now()
    const response: DesignResponse = {
      designId: currentDesign.id,
      exposure,
      questionAnswers: {},
      questionsStartedAt: null, // Will be set when questions phase starts
      completedAt: 0, // Will be set when questions are done
    }

    // Update ref synchronously before any dependent callbacks read it
    responsesRef.current = [...responsesRef.current, response]
    setResponses((prev) => [...prev, response])

    // Practice designs: show practice complete screen (no questions)
    if (isPracticeDesign) {
      setPhase('practice_complete')
      return
    }

    // Regular designs: move to questions if any, otherwise next design
    if (currentDesign.questions.length > 0) {
      // Track when questions phase starts
      questionsStartedAtRef.current = now
      setPhase('questions')
    } else {
      handleQuestionsComplete([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDesign, isPracticeDesign])

  // Questions complete handler - converts PostTaskQuestionResponse[] to Record<string, any>
  const handleQuestionsComplete = useCallback((questionResponses: PostTaskQuestionResponse[]) => {
    // Convert array of responses to a Record format, including timing
    const answers: Record<string, any> = {}
    for (const response of questionResponses) {
      answers[response.questionId] = {
        value: response.value,
        responseTimeMs: response.responseTimeMs,
      }
    }

    // Update ref synchronously BEFORE calling handleSubmit to prevent stale closure
    const updated = [...responsesRef.current]
    const lastIndex = updated.length - 1
    if (lastIndex >= 0) {
      updated[lastIndex] = {
        ...updated[lastIndex],
        questionAnswers: answers,
        questionsStartedAt: questionsStartedAtRef.current,
        completedAt: Date.now(),
      }
    }
    responsesRef.current = updated
    setResponses(updated)

    // Reset questions started ref for next design
    questionsStartedAtRef.current = null

    if (isLastDesign) {
      // All designs complete - submit
      handleSubmit()
    } else {
      // Move to next design - go directly to countdown (or exposure if countdown is 0)
      setCurrentDesignIndex((prev) => prev + 1)
      setPhase(countdownSeconds > 0 ? 'countdown' : 'exposure')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastDesign, countdownSeconds])

  // Practice complete handler - moves to the first real design
  const handlePracticeComplete = useCallback(() => {
    // Mark the practice response as complete - update ref synchronously
    const updated = [...responsesRef.current]
    const lastIndex = updated.length - 1
    if (lastIndex >= 0) {
      updated[lastIndex] = {
        ...updated[lastIndex],
        completedAt: Date.now(),
      }
    }
    responsesRef.current = updated
    setResponses(updated)

    // Move to next design (the first real design)
    setCurrentDesignIndex((prev) => prev + 1)
    setPhase(countdownSeconds > 0 ? 'countdown' : 'exposure')
  }, [countdownSeconds])

  // Submit handler - reads from responsesRef to avoid stale closure bugs
  const handleSubmit = useCallback(async () => {
    // Stop recording if active
    if (isRecording) {
      try {
        await stopRecording()
      } catch {
        // Continue with submission anyway
      }
    }

    if (previewMode) {
      setPhase('complete')
      onComplete?.()
      return
    }

    setPhase('submitting')

    try {
      // Read from ref for fresh data (avoids stale closure from handleQuestionsComplete)
      const currentResponses = responsesRef.current

      // Get the selected design ID for random_single mode
      const selectedDesignId =
        settings.designAssignmentMode === 'random_single'
          ? designsToShow.find((d) => !d.is_practice)?.id
          : undefined

      const response = await fetch(`/api/participate/${shareCode}/first-impression/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          responses: currentResponses.map((r) => ({
            designId: r.designId,
            exposure: r.exposure,
            questionAnswers: r.questionAnswers,
            questionsStartedAt: r.questionsStartedAt,
            completedAt: r.completedAt,
          })),
          selectedDesignId,
          assignmentMode: settings.designAssignmentMode,
          deviceInfo: deviceInfoRef.current,
          demographicData: participantDemographicData,
          cookieId: preventionData?.cookieId,
          fingerprintHash: preventionData?.fingerprintHash,
          fingerprintConfidence: preventionData?.fingerprintConfidence,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit responses')
      }

      setPhase('complete')
      onComplete?.()
    } catch {
      // Error state will be shown to user
      setPhase('error')
    }
  }, [
    isRecording,
    stopRecording,
    previewMode,
    onComplete,
    shareCode,
    sessionToken,
    settings.designAssignmentMode,
    designsToShow,
    preventionData,
    participantDemographicData,
  ])

  // Show recording consent first if enabled
  if (
    recordingEnabled &&
    !hasShownRecordingConsent &&
    !isRecording &&
    !recordingError
  ) {
    return (
      <RecordingConsentScreen
        captureMode={settings.sessionRecordingSettings?.captureMode || 'audio'}
        studyType="first_impression"
        onConsent={handleRecordingConsent}
        onDecline={handleRecordingDecline}
        allowDecline
        privacyNotice={settings.sessionRecordingSettings?.privacyNotice}
      />
    )
  }

  // Recording indicator (shown during all phases if recording)
  const recordingIndicator = isRecording && (
    <RecordingIndicator
      isRecording={isRecording}
      isPaused={isPaused}
      isUploading={isUploading}
      uploadProgress={uploadProgress}
    />
  )

  // Phase: Countdown
  if (phase === 'countdown') {
    return (
      <>
        {recordingIndicator}
        <CountdownOverlay
          durationSeconds={countdownSeconds}
          onComplete={handleCountdownComplete}
          isPractice={isPracticeDesign}
        />
      </>
    )
  }

  // Phase: Exposure - wait for images if they're still loading (rare: only if countdown was shorter than image load)
  if (phase === 'exposure' && !imagesLoaded && designsToShow.length > 0) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ backgroundColor: 'var(--style-page-bg, #ffffff)' }}
      >
        <Loader2
          className="w-8 h-8 animate-spin mb-4"
          style={{ color: 'var(--brand, #3b82f6)' }}
        />
        <p
          className="text-sm"
          style={{ color: 'var(--style-text-secondary, #666)' }}
        >
          Almost ready...
        </p>
      </div>
    )
  }

  // Phase: Exposure
  if (phase === 'exposure' && currentDesign) {
    return (
      <>
        {recordingIndicator}
        <ExposureScreen
          design={currentDesign}
          durationMs={exposureDurationMs}
          countdownDurationMs={settings.countdownDurationMs}
          exposureSequence={currentDesignIndex + 1}
          showTimer={settings.showTimerToParticipant}
          showProgress={settings.showProgressIndicator}
          designNumber={currentDesignIndex + 1}
          totalDesigns={designsToShow.length}
          displayMode={settings.displayMode || 'fit'}
          backgroundColor={settings.backgroundColor || '#ffffff'}
          onComplete={handleExposureComplete}
          isPractice={isPracticeDesign}
        />
      </>
    )
  }

  // Phase: Practice Complete - shown after practice design exposure
  if (phase === 'practice_complete') {
    return (
      <>
        {recordingIndicator}
        <PracticeCompleteScreen onContinue={handlePracticeComplete} />
      </>
    )
  }

  // Phase: Questions - uses shared PostTaskQuestionsScreen for consistent UI
  if (phase === 'questions' && currentDesign) {
    // Map 'all_on_page' to 'all_on_one' for PostTaskQuestionsScreen compatibility
    const pageMode = settings.questionDisplayMode === 'all_on_page' ? 'all_on_one' : 'one_per_page'
    const designTitle = currentDesign.name || `Design ${currentDesignIndex + 1}`

    return (
      <>
        {recordingIndicator}
        <PostTaskQuestionsScreen
          taskNumber={currentDesignIndex + 1}
          questions={currentDesign.questions}
          onComplete={handleQuestionsComplete}
          pageMode={pageMode}
          autoAdvanceEnabled={settings.autoAdvanceQuestions ?? false}
          title={`${designTitle} Feedback`}
          subtitle="Please share your first impressions about what you just saw."
        />
      </>
    )
  }

  // Phase: Submitting
  if (phase === 'submitting') {
    return <SubmittingScreen />
  }

  // Phase: Complete
  // In embedded mode, don't show our own complete screen - the study flow handles it
  if (phase === 'complete') {
    return embeddedMode ? <SubmittingScreen /> : <CompleteScreen />
  }

  // Error fallback
  return <ErrorScreen errorMessage="An error occurred. Please contact support." />
}
