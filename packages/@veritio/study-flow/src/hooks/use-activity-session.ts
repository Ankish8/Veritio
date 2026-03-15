'use client'

import { useState, useCallback, useRef } from 'react'

interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface UseActivitySessionOptions {
  shareCode: string
  embeddedMode?: boolean
  previewMode?: boolean
  propSessionToken?: string | null
  propParticipantId?: string | null
  onComplete?: () => void
  preventionData?: ResponsePreventionData
  demographicData?: Record<string, unknown> | null
}

export interface ActivitySessionState {
  participantId: string | null
  sessionToken: string | null
  errorMessage: string
  isInitialized: boolean
  initializeSession: () => Promise<boolean>
  submitActivity: <T>(submitPath: string, data: T) => Promise<boolean>
}

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
  const [participantId, setParticipantId] = useState<string | null>(propParticipantId ?? null)
  const [localSessionToken, setLocalSessionToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  const sessionToken = propSessionToken || localSessionToken
  const initializingRef = useRef(false)
  const isSubmittingRef = useRef(false)

  const initializeSession = useCallback(async (): Promise<boolean> => {
    if (isInitialized) return true
    if (initializingRef.current) return false
    initializingRef.current = true

    if (previewMode) {
      setParticipantId('preview-participant')
      setLocalSessionToken('preview-session')
      setIsInitialized(true)
      initializingRef.current = false
      return true
    }

    if (embeddedMode && propSessionToken) {
      setIsInitialized(true)
      initializingRef.current = false
      return true
    }

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
      initializingRef.current = false
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session'
      setErrorMessage(message)
      initializingRef.current = false
      return false
    }
  }, [shareCode, embeddedMode, previewMode, propSessionToken, isInitialized])

  const submitActivity = useCallback(async <T>(submitPath: string, data: T): Promise<boolean> => {
    if (isSubmittingRef.current) return false
    isSubmittingRef.current = true

    if (previewMode) {
      onComplete?.()
      return true
    }

    if (!sessionToken) {
      onComplete?.()
      return true
    }

    try {
      const submissionData = {
        ...data,
        demographicData: demographicData ?? null,
        cookieId: preventionData?.cookieId ?? null,
        fingerprintHash: preventionData?.fingerprintHash ?? null,
        fingerprintConfidence: preventionData?.fingerprintConfidence ?? null,
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
