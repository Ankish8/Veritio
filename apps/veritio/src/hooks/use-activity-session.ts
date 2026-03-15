'use client'

import { useState, useCallback, useRef } from 'react'

interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface UseActivitySessionOptions {
  /** Study share code for API calls */
  shareCode: string
  /** Whether the player is embedded within StudyFlowPlayer */
  embeddedMode?: boolean
  /** Preview mode - skips API calls */
  previewMode?: boolean
  /** Session token from parent component (for embedded mode) */
  propSessionToken?: string | null
  /** Participant ID from parent component (for embedded mode) */
  propParticipantId?: string | null
  /** Callback when activity completes successfully */
  onComplete?: () => void
  /** Fingerprint data for response prevention tracking */
  preventionData?: ResponsePreventionData
  /** Participant demographic data collected during identifier step */
  demographicData?: Record<string, unknown> | null
}

export interface ActivitySessionState {
  /** Participant ID (set after session initialization) */
  participantId: string | null
  /** Session token (from prop in embedded mode, or from local state) */
  sessionToken: string | null
  /** Error message if initialization or submission failed */
  errorMessage: string
  /** Whether session has been initialized */
  isInitialized: boolean
  /** Initialize the session (call before starting activity) */
  initializeSession: () => Promise<boolean>
  /** Generic submit function for any test type */
  submitActivity: <T>(submitPath: string, data: T) => Promise<boolean>
}

/** Hook for managing activity session state (standalone, embedded, and preview modes). */
export function useActivitySession({
  shareCode,
  embeddedMode = false,
  previewMode = false,
  propSessionToken,
  propParticipantId,
  onComplete,
  preventionData,
  demographicData,
}: UseActivitySessionOptions): ActivitySessionState {
  // In embedded mode, use the prop participantId directly
  const [participantId, setParticipantId] = useState<string | null>(propParticipantId ?? null)
  const [localSessionToken, setLocalSessionToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Use prop sessionToken (for embedded mode) or local state (for standalone mode)
  const sessionToken = propSessionToken || localSessionToken

  // Prevent double submission (synchronous guard against race conditions)
  const isSubmittingRef = useRef(false)
  // Stores the in-progress init promise so concurrent callers wait rather than erroring
  const initPromiseRef = useRef<Promise<boolean> | null>(null)

  const initializeSession = useCallback((): Promise<boolean> => {
    // Already initialized
    if (isInitialized) return Promise.resolve(true)

    // Return the in-progress promise so concurrent callers wait for it
    if (initPromiseRef.current) return initPromiseRef.current

    initPromiseRef.current = (async () => {
      // Preview mode - set fake IDs
      if (previewMode) {
        setParticipantId('preview-participant')
        setLocalSessionToken('preview-session')
        setIsInitialized(true)
        return true
      }

      // Embedded mode with session token already provided
      if (embeddedMode && propSessionToken) {
        setIsInitialized(true)
        return true
      }

      // Standalone mode - create session
      try {
        const response = await fetch(`/api/participate/${shareCode}`, { method: 'POST' })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to start session')
        }
        const { data } = await response.json()
        setParticipantId(data.participantId)
        setLocalSessionToken(data.sessionToken)
        setIsInitialized(true)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start session'
        setErrorMessage(message)
        initPromiseRef.current = null // Allow retry on failure
        return false
      }
    })()

    return initPromiseRef.current
  }, [shareCode, embeddedMode, previewMode, propSessionToken, isInitialized])

  const submitActivity = useCallback(async <T>(submitPath: string, data: T): Promise<boolean> => {
    // Synchronous guard to prevent double-submission from rapid clicks
    if (isSubmittingRef.current) return false
    isSubmittingRef.current = true

    // Preview mode - skip API call
    if (previewMode) {
      onComplete?.()
      return true
    }

    // Need sessionToken to submit
    if (!sessionToken) {
      // No session token available - complete without submitting
      // This shouldn't happen in production, but prevents crashes
      onComplete?.()
      return true
    }

    try {
      // Merge fingerprint and demographic data into the submission
      const submissionData = {
        ...data,
        demographicData: demographicData ?? null,
        cookieId: preventionData?.cookieId || undefined,
        fingerprintHash: preventionData?.fingerprintHash || undefined,
        fingerprintConfidence: preventionData?.fingerprintConfidence || undefined,
      }

      const response = await fetch(submitPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      })

      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || 'Failed to submit')
      }

      onComplete?.()
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit'
      setErrorMessage(message)
      // Reset guard on error so user can retry
      isSubmittingRef.current = false
      return false
    }
  }, [previewMode, sessionToken, onComplete, preventionData, demographicData])

  return {
    participantId,
    sessionToken,
    errorMessage,
    isInitialized,
    initializeSession,
    submitActivity,
  }
}
