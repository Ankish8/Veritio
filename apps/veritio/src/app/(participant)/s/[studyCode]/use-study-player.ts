'use client'

import { useEffect, useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStudyFlowPlayerStore } from '@/stores/study-flow-player'
import { useParticipantSession } from '@/hooks/use-participant-session'
import { useDuplicatePrevention } from '@/hooks/use-duplicate-prevention'
import {
  useParticipantStudy,
  type ParticipantStudyData,
  type PasswordRequiredResponse,
} from '@/hooks/use-participant-study'
import type { ResponsePreventionSettings } from '@/components/builders/shared/types'
import { clearSavedProgress } from '@/hooks/use-progress-restoration'

// Reserved URL parameters that should not be captured as url_tags
const RESERVED_PARAMS = ['preview', 'password', 'resume']

export interface UseStudyPlayerOptions {
  studyCode: string
  initialStudy: ParticipantStudyData | null
  initialPasswordRequired: PasswordRequiredResponse | null
  initialError: string | null
  isPreviewMode: boolean
}

export function useStudyPlayer({
  studyCode,
  initialStudy,
  initialPasswordRequired,
  initialError,
  isPreviewMode,
}: UseStudyPlayerOptions) {
  // Show skeleton until client has mounted and the store is initialized.
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true)
  }, [])

  const searchParams = useSearchParams()
  const resumeToken = searchParams.get('resume')

  // Extract URL tags from search params (excluding reserved parameters)
  const urlTags = useMemo(() => {
    const tags: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      if (!RESERVED_PARAMS.includes(key.toLowerCase())) {
        tags[key] = value
      }
    })
    return Object.keys(tags).length > 0 ? tags : null
  }, [searchParams])

  // Detect if participant entered via widget (eligible for incentives)
  const isWidgetParticipant = useMemo(() => {
    if (!urlTags) return false
    return urlTags['utm_source'] === 'widget' || !!urlTags['embed-code-id']
  }, [urlTags])

  // Password submission state
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>()

  // Skip SWR fetch when we have server data (study, password required, OR error)
  const shouldSkipFetch = !submittedPassword && (initialStudy !== null || initialPasswordRequired !== null || initialError !== null)

  const {
    study: swrStudy,
    passwordRequired: swrPasswordRequired,
    isLoading,
    error: swrError,
    isPasswordError,
  } = useParticipantStudy({
    studyCode,
    password: submittedPassword,
    isPreview: isPreviewMode,
    skip: shouldSkipFetch,
  })

  // Use server data initially, fall back to SWR data after password submission
  const study = submittedPassword ? swrStudy : initialStudy
  const passwordRequired = submittedPassword ? swrPasswordRequired : initialPasswordRequired
  const error = submittedPassword ? swrError : initialError

  // Store access
  const {
    currentStep,
    setActivityComplete,
    nextStep,
    setSessionToken,
    setParticipantId,
    identifierType,
    participantIdentifier,
    participantDemographicData,
  } = useStudyFlowPlayerStore()

  // Rehydrate persisted store on mount (before user can interact).
  useEffect(() => {
    useStudyFlowPlayerStore.persist.rehydrate()
  }, [])

  // Session management hook
  const {
    participantId,
    sessionToken,
    sessionStarted,
    assignedVariantId,
    isRestorationComplete,
    restoredProgress,
    startSession,
  } = useParticipantSession({
    studyCode,
    resumeToken,
    isPreviewMode,
    studyLoaded: !!study,
    urlTags,
    identifierType: identifierType ?? undefined,
    participantIdentifier: participantIdentifier ?? undefined,
  })

  // Duplicate prevention hook - also provides fingerprint data for submission
  const { isBlocked, blockMessage, preventionData } = useDuplicatePrevention({
    studyCode,
    responsePreventionSettings: study?.response_prevention_settings as ResponsePreventionSettings | null,
    isPreviewMode,
    hasRestoredProgress: !!restoredProgress,
    studyLoaded: !!study,
  })

  // Start session only when the participant reaches the actual study activity.
  useEffect(() => {
    const shouldStartSession =
      currentStep === 'activity' ||
      currentStep === 'survey'

    if (shouldStartSession && !sessionStarted) {
      startSession()
    }
  }, [currentStep, sessionStarted, startSession])

  // Sync sessionToken and participantId to store for audio recording support
  useEffect(() => {
    if (sessionToken) {
      setSessionToken(sessionToken)
    }
  }, [sessionToken, setSessionToken])

  useEffect(() => {
    if (participantId) {
      setParticipantId(participantId)
    }
  }, [participantId, setParticipantId])

  // Handle flow completion
  const handleFlowComplete = useCallback(async () => {
    const completeWithRetry = async (retriesLeft: number) => {
      if (study?.study_type === 'survey' && !isPreviewMode) {
        if (sessionToken) {
          try {
            await fetch(`/api/participate/${studyCode}/complete/survey`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionToken,
                demographicData: participantDemographicData,
                cookieId: preventionData.cookieId,
                fingerprintHash: preventionData.fingerprintHash,
                fingerprintConfidence: preventionData.fingerprintConfidence,
              }),
            })
          } catch {
            // Silent fail
          }
        } else if (retriesLeft > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
          await completeWithRetry(retriesLeft - 1)
        } else {
          // Could not complete survey - no sessionToken after retries
        }
      }
    }

    await completeWithRetry(5)

    // Clear saved progress to prevent thank_you flash on revisit
    clearSavedProgress(studyCode)
  }, [study?.study_type, sessionToken, studyCode, isPreviewMode, participantDemographicData, preventionData])

  const handleScreeningReject = useCallback(() => {}, [])

  const handleActivityComplete = useCallback(() => {
    setActivityComplete(true)
    nextStep()
  }, [setActivityComplete, nextStep])

  const handlePasswordSubmit = useCallback((password: string) => {
    setSubmittedPassword(password)
  }, [])

  return {
    hasMounted,
    study,
    passwordRequired,
    error,
    isLoading,
    isPasswordError,
    isBlocked,
    blockMessage,
    preventionData,
    currentStep,
    participantId,
    sessionToken,
    assignedVariantId,
    restoredProgress,
    isRestorationComplete,
    submittedPassword,
    isWidgetParticipant,
    participantDemographicData,
    handleFlowComplete,
    handleScreeningReject,
    handleActivityComplete,
    handlePasswordSubmit,
  }
}
