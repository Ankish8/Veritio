'use client'

import { useState, useEffect, useRef } from 'react'
import { useResponsePrevention, type ResponsePreventionData } from './use-response-prevention'
import type { ResponsePreventionLevel, ResponsePreventionSettings } from '@/components/builders/shared/types'

export interface UseDuplicatePreventionOptions {
  studyCode: string
  /** The study's response prevention settings */
  responsePreventionSettings: ResponsePreventionSettings | null
  /** Whether the study is in preview mode (skips check) */
  isPreviewMode: boolean
  /** Whether progress was restored (skips check) */
  hasRestoredProgress: boolean
  /** Whether the study has loaded */
  studyLoaded: boolean
}

export interface UseDuplicatePreventionReturn {
  /** Whether the participant is blocked from participating */
  isBlocked: boolean
  /** Message to display when blocked */
  blockMessage: string | null
  /** Current prevention level */
  preventionLevel: ResponsePreventionLevel
  /** Fingerprint data to include with submission (cookieId, fingerprintHash, fingerprintConfidence) */
  preventionData: ResponsePreventionData
}

/**
 * Hook for managing duplicate response prevention.
 * Checks if a participant has already participated based on
 * cookies, fingerprinting, or other prevention mechanisms.
 */
export function useDuplicatePrevention({
  studyCode,
  responsePreventionSettings,
  isPreviewMode,
  hasRestoredProgress,
  studyLoaded,
}: UseDuplicatePreventionOptions): UseDuplicatePreventionReturn {
  const [preventionLevel, setPreventionLevel] = useState<ResponsePreventionLevel>('none')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockMessage, setBlockMessage] = useState<string | null>(null)

  const hasCheckedDuplicate = useRef(false)

  const { checkDuplicate, preventionData } = useResponsePrevention(studyCode, preventionLevel)

  // Extract prevention settings when study loads
  useEffect(() => {
    if (studyLoaded && responsePreventionSettings) {
      const level = responsePreventionSettings.level || 'none'
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreventionLevel(level)
    }
  }, [studyLoaded, responsePreventionSettings])

  // Check for duplicate when study loads and prevention is enabled
  useEffect(() => {
    // Note: We run the check even with restored progress because:
    // - Fingerprint records only exist AFTER successful submission
    // - Someone continuing an incomplete session has no record → check passes
    // - Someone trying to retake after completion has a record → check blocks them
    if (
      studyLoaded &&
      preventionLevel !== 'none' &&
      !isPreviewMode &&
      !hasCheckedDuplicate.current
    ) {
      hasCheckedDuplicate.current = true
      checkDuplicate().then((result) => {
        if (!result.canParticipate) {
          setIsBlocked(true)
          setBlockMessage(result.message || 'You have already participated in this study.')
        }
      })
    }
  }, [studyLoaded, preventionLevel, isPreviewMode, hasRestoredProgress, checkDuplicate])

  return {
    isBlocked,
    blockMessage,
    preventionLevel,
    preventionData,
  }
}
