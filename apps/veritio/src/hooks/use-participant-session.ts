'use client'

import { useState, useCallback, useEffect } from 'react'
import { useProgressRestoration, type SavedProgress } from './use-progress-restoration'
import { getBrowserDataWithGeo, warmupGeoLookup } from '@/lib/browser-detection'

export type { SavedProgress }

export interface UseParticipantSessionOptions {
  studyCode: string
  resumeToken: string | null
  isPreviewMode: boolean
  studyLoaded: boolean
  urlTags: Record<string, string> | null
  identifierType?: string
  participantIdentifier?: string
}

/**
 * Hook for managing participant session state including:
 * - Session creation and tracking
 * - Progress restoration from localStorage or URL resume token
 * - Preview mode handling
 */
export function useParticipantSession({
  studyCode,
  resumeToken,
  isPreviewMode,
  studyLoaded,
  urlTags,
  identifierType,
  participantIdentifier,
}: UseParticipantSessionOptions) {
  // Core session state
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [assignedVariantId, setAssignedVariantId] = useState<string | null>(null)

  // Start geo lookup eagerly so it's ready by the time startSession is called
  // (user typically spends 3-10s reading welcome/instructions screens)
  useEffect(() => {
    if (!isPreviewMode) {
      warmupGeoLookup()
    }
  }, [isPreviewMode])

  // Use progress restoration hook
  const { restoredProgress, isCheckingProgress, isRestorationComplete } = useProgressRestoration({
    studyCode,
    resumeToken,
    isPreviewMode,
    studyLoaded,
  })

  // Initialize session from restored progress
  useEffect(() => {
    if (restoredProgress && !sessionStarted) {
      setParticipantId(restoredProgress.participantId)
      setSessionToken(restoredProgress.sessionToken)
      setSessionStarted(true)
    }
  }, [restoredProgress, sessionStarted])

  // Preview mode setup
  useEffect(() => {
    if (studyLoaded && isPreviewMode && !sessionStarted) {
      setParticipantId('preview-participant')
      setSessionToken('preview-token')
      setSessionStarted(true)
    }
  }, [studyLoaded, isPreviewMode, sessionStarted])

  // Create participant session
  const startSession = useCallback(async () => {
    if (sessionStarted || !studyLoaded) return

    if (isPreviewMode) {
      setParticipantId('preview-participant')
      setSessionToken('preview-token')
      setSessionStarted(true)
      return
    }

    try {
      // getBrowserDataWithGeo uses the cached geo promise started by warmupGeoLookup()
      // on mount — typically resolves instantly since the user spends time on welcome/instructions
      const browserData = await getBrowserDataWithGeo()

      const response = await fetch(`/api/participate/${studyCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifierType: identifierType || 'anonymous',
          identifierValue: participantIdentifier,
          urlTags,
          browserData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start session')
      }

      const responseData = await response.json()
      const { participantId: newParticipantId, sessionToken: newSessionToken, assignedVariantId: newVariantId } = responseData.data
      setParticipantId(newParticipantId)
      setSessionToken(newSessionToken)
      setAssignedVariantId(newVariantId || null)
      setSessionStarted(true)
    } catch {
      // Session start failed - continue without saving
    }
  }, [studyCode, studyLoaded, sessionStarted, identifierType, participantIdentifier, isPreviewMode, urlTags])

  return {
    participantId,
    sessionToken,
    sessionStarted,
    assignedVariantId,
    isCheckingProgress,
    isRestorationComplete,
    restoredProgress,
    startSession,
  }
}
