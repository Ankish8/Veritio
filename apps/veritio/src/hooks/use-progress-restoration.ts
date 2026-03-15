'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { usePlayerActions } from '@/stores/study-flow-player'
import { useParticipantResume, type ResumeData } from './use-participant-resume'
import type { ResponseValue } from '@veritio/study-types/study-flow-types'

// LocalStorage key for saving progress
const PROGRESS_KEY_PREFIX = 'survey_progress_'

// Progress data structure - matches ResumeData for compatibility
export type SavedProgress = ResumeData

// Helper to restore progress from localStorage
function getSavedProgress(studyCode: string): SavedProgress | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${PROGRESS_KEY_PREFIX}${studyCode}_`)) {
        const saved = localStorage.getItem(key)
        if (!saved) continue
        const data = JSON.parse(saved)
        if (data.expiresAt && Date.now() > data.expiresAt) {
          localStorage.removeItem(key)
          continue
        }
        return {
          participantId: data.participantId,
          sessionToken: data.sessionToken,
          currentStep: data.currentStep,
          currentQuestionIndex: data.currentQuestionIndex,
          responses: data.responses || [],
        }
      }
    }
  } catch {
    // Silent fail - localStorage may be unavailable
  }
  return null
}

// Clear all saved progress for a study code
export function clearSavedProgress(studyCode: string): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${PROGRESS_KEY_PREFIX}${studyCode}_`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Silent fail
  }
}

// Validate a session token against the server
async function validateSessionToken(studyCode: string, sessionToken: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/participate/${studyCode}/validate-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    })
    if (!res.ok) return true // Fail open on non-200 — will be caught at submission time
    const data = await res.json()
    return data.valid === true
  } catch {
    return true // Fail open on network error
  }
}

export interface UseProgressRestorationOptions {
  studyCode: string
  resumeToken: string | null
  isPreviewMode: boolean
  studyLoaded: boolean
}

/** Restores participant progress from localStorage or URL resume token. */
export function useProgressRestoration({
  studyCode,
  resumeToken,
  isPreviewMode,
  studyLoaded,
}: UseProgressRestorationOptions) {
  const [restoredProgress, setRestoredProgress] = useState<SavedProgress | null>(null)
  const [hasCheckedLocalStorage, setHasCheckedLocalStorage] = useState(false)
  const [isRestorationComplete, setIsRestorationComplete] = useState(false)
  const [isValidatingSession, setIsValidatingSession] = useState(false)

  const hasResetForPreview = useRef(false)
  const hasRestoredProgress = useRef(false)

  const { reset: resetStore, restoreFromSaved } = usePlayerActions()

  // Fetch resume data with SWR
  const { resumeData: urlResumeData, isLoading: isResumeLoading } = useParticipantResume(
    studyCode,
    isPreviewMode ? null : resumeToken
  )

  const isCheckingProgress =
    (resumeToken && !isPreviewMode && isResumeLoading) ||
    (!hasCheckedLocalStorage && !resumeToken && !isPreviewMode) ||
    isValidatingSession

  // Handle URL resume data
  useEffect(() => {
    if (urlResumeData && !restoredProgress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoredProgress(urlResumeData)
    }
  }, [urlResumeData, restoredProgress])

  // Check localStorage for saved progress and validate session
  useEffect(() => {
    if (hasCheckedLocalStorage || (resumeToken && !isPreviewMode)) return
    const saved = getSavedProgress(studyCode)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasCheckedLocalStorage(true)

    if (!saved || saved.currentStep === 'thank_you') {
      if (saved) clearSavedProgress(studyCode)
      setIsRestorationComplete(true)
      return
    }

    // Skip validation in preview mode — no real sessions to validate
    if (isPreviewMode) {
      setRestoredProgress(saved)
      return
    }

    // Validate the session token before restoring
    setIsValidatingSession(true)
    validateSessionToken(studyCode, saved.sessionToken).then((valid) => {
      if (valid) {
        setRestoredProgress(saved)
      } else {
        clearSavedProgress(studyCode)
        setIsRestorationComplete(true)
      }
      setIsValidatingSession(false)
    })
  }, [studyCode, resumeToken, isPreviewMode, hasCheckedLocalStorage])

  // Mark restoration complete when resume loading finishes
  useEffect(() => {
    if (resumeToken && !isPreviewMode && !isResumeLoading && !urlResumeData && !restoredProgress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRestorationComplete(true)
    }
  }, [resumeToken, isPreviewMode, isResumeLoading, urlResumeData, restoredProgress])

  // Reset store for preview mode
  useLayoutEffect(() => {
    if (isPreviewMode && !hasResetForPreview.current && !restoredProgress) {
      hasResetForPreview.current = true
      resetStore()
    }
  }, [isPreviewMode, resetStore, restoredProgress])

  // Restore progress after study loads
  useEffect(() => {
    if (studyLoaded && restoredProgress && !hasRestoredProgress.current) {
      hasRestoredProgress.current = true
      restoreFromSaved(
        restoredProgress.currentStep as 'welcome' | 'identifier' | 'screening' | 'pre_study' | 'activity' | 'survey' | 'post_study' | 'thank_you',
        restoredProgress.currentQuestionIndex,
        restoredProgress.responses as Array<{ questionId: string; value: ResponseValue }>
      )
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRestorationComplete(true)
    }
  }, [studyLoaded, restoredProgress, restoreFromSaved])

  return {
    restoredProgress,
    isCheckingProgress,
    isRestorationComplete,
  }
}
