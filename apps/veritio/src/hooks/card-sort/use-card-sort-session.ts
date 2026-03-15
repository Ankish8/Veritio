'use client'

import { useState, useRef, useCallback } from 'react'

export type CardSortPlayerState = 'welcome' | 'recording_consent' | 'sorting' | 'submitting' | 'complete' | 'error'

interface PlacedCard {
  cardId: string
  categoryId: string
}

interface CustomCategory {
  id: string
  label: string
}

interface CategoryWithLabel {
  id: string
  label: string
}

interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

interface UseCardSortSessionOptions {
  shareCode: string
  embeddedMode?: boolean
  previewMode?: boolean
  onComplete?: () => void
  /** Fingerprint data for response prevention tracking */
  preventionData?: ResponsePreventionData
  /** Participant demographic data collected during identifier step */
  demographicData?: Record<string, unknown> | null
  /** External session token (used in embedded mode where parent manages session) */
  externalSessionToken?: string | null
  /** External participant ID (used in embedded mode where parent manages session) */
  externalParticipantId?: string | null
}

interface UseCardSortSessionReturn {
  state: CardSortPlayerState
  sessionToken: string | null
  participantId: string | null
  errorMessage: string
  startTimeRef: React.MutableRefObject<number>
  handleStart: () => Promise<void>
  handleSubmit: (
    placedCards: PlacedCard[],
    customCategories: CustomCategory[],
    allCategories: CategoryWithLabel[],
    validationErrors: string[]
  ) => Promise<void>
  setValidationError: (error: string | null) => void
  validationError: string | null
}

export function useCardSortSession({
  shareCode,
  embeddedMode = false,
  previewMode = false,
  onComplete,
  preventionData,
  demographicData,
  externalSessionToken,
  externalParticipantId,
}: UseCardSortSessionOptions): UseCardSortSessionReturn {
  // In embedded mode, skip directly to sorting
  const [state, setState] = useState<CardSortPlayerState>(embeddedMode ? 'sorting' : 'welcome')
  // In embedded mode, use external session token/participantId; otherwise manage internally
  const [internalSessionToken, setInternalSessionToken] = useState<string | null>(null)
  const [internalParticipantId, setInternalParticipantId] = useState<string | null>(null)
  const sessionToken = embeddedMode ? externalSessionToken ?? null : internalSessionToken
  const participantId = embeddedMode ? externalParticipantId ?? null : internalParticipantId
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  // Initialize start time immediately in embedded mode (handleStart is skipped)
  const startTimeRef = useRef<number>(embeddedMode ? Date.now() : 0)
  // Ref to prevent double-submission (synchronous guard against race conditions)
  const isSubmittingRef = useRef<boolean>(false)

  const handleStart = useCallback(async () => {
    try {
      // Create participant session
      const response = await fetch(`/api/participate/${shareCode}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start session')
      }

      const { data } = await response.json()
      setInternalSessionToken(data.sessionToken)
      setInternalParticipantId(data.participantId)
      startTimeRef.current = Date.now()
      setState('sorting')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start')
      setState('error')
    }
  }, [shareCode])

  const handleSubmit = useCallback(async (
    placedCards: PlacedCard[],
    customCategories: CustomCategory[],
    allCategories: CategoryWithLabel[],
    validationErrors: string[]
  ) => {
    // Synchronous guard to prevent double-submission from rapid clicks
    // (React state updates are async, so we use a ref for immediate protection)
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true

    // Validate before submitting
    if (validationErrors.length > 0) {
      setValidationError(validationErrors.join('\n'))
      isSubmittingRef.current = false
      return
    }

    if (!sessionToken && !embeddedMode && !previewMode) {
      isSubmittingRef.current = false
      return
    }

    setState('submitting')

    // In preview mode, skip API call and just mark as complete
    if (previewMode) {
      setState('complete')
      onComplete?.()
      return
    }

    try {
      // Build card placements object: { cardId: categoryId/categoryLabel }
      const cardPlacements: Record<string, string> = {}
      placedCards.forEach((p) => {
        const category = allCategories.find((c) => c.id === p.categoryId)
        cardPlacements[p.cardId] = category?.label || p.categoryId
      })

      // Build custom categories array (just the labels - cardIds are already in cardPlacements)
      const customCats = customCategories.map((c) => c.label)

      const totalTimeMs = Date.now() - startTimeRef.current

      const response = await fetch(`/api/participate/${shareCode}/submit/card-sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          cardPlacements,
          customCategories: customCats.length > 0 ? customCats : null,
          totalTimeMs,
          demographicData: demographicData ?? null,
          // Include fingerprint data for response prevention tracking
          cookieId: preventionData?.cookieId || undefined,
          fingerprintHash: preventionData?.fingerprintHash || undefined,
          fingerprintConfidence: preventionData?.fingerprintConfidence || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setState('complete')
      // Notify parent when activity completes (for embedded mode)
      onComplete?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit')
      setState('error')
      isSubmittingRef.current = false
    }
  }, [shareCode, sessionToken, embeddedMode, previewMode, onComplete, preventionData, demographicData])

  return {
    state,
    sessionToken,
    participantId,
    errorMessage,
    startTimeRef,
    handleStart,
    handleSubmit,
    setValidationError,
    validationError,
  }
}
