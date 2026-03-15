'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { QuestionType } from '@veritio/study-types/study-flow-types'

const AUTO_ADVANCE_DELAY = 300 // milliseconds

interface UseAutoAdvanceOptions {
  /** Whether auto-advance is enabled in settings */
  enabled: boolean
  /** Current question type */
  questionType: QuestionType
  /** Page mode - only works in one_per_page mode */
  pageMode: 'one_per_page' | 'all_on_one'
  /** Callback to advance to next question */
  onAdvance: () => void
  /** For checkbox: max selections limit (only auto-advance when reached) */
  maxSelections?: number
  /** For checkbox: current selection count */
  currentSelectionCount?: number
}

interface UseAutoAdvanceReturn {
  /** Whether auto-advance countdown is active */
  isAdvancing: boolean
  /** Remaining time in milliseconds */
  remainingMs: number
  /** Cancel the auto-advance */
  cancelAdvance: () => void
  /** Trigger auto-advance (call when selection is made) */
  triggerAdvance: () => void
}

/**
 * Question types that support auto-advance
 *
 * Note: Rating questions (NPS, opinion_scale, slider) are excluded to give users
 * time to review their selection before advancing, since these involve deliberate
 * consideration rather than quick selection.
 */
const AUTO_ADVANCE_QUESTION_TYPES: QuestionType[] = [
  'multiple_choice', // single/dropdown auto-advances on selection, multi only when maxSelections reached
  'yes_no',
  'image_choice', // single auto-advances on selection, multi only when maxSelections reached
]

/**
 * Hook for auto-advancing to next question after selection.
 *
 * Features:
 * - 300ms fixed delay before advancing
 * - Cancel via Escape key or cancelAdvance()
 * - Only works in one_per_page mode
 * - Checkbox only auto-advances when maxSelections is reached
 */
export function useAutoAdvance({
  enabled,
  questionType,
  pageMode,
  onAdvance,
  maxSelections,
  currentSelectionCount = 0,
}: UseAutoAdvanceOptions): UseAutoAdvanceReturn {
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [remainingMs, setRemainingMs] = useState(AUTO_ADVANCE_DELAY)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Check if auto-advance is applicable for this question type
  const isApplicable =
    enabled &&
    pageMode === 'one_per_page' &&
    AUTO_ADVANCE_QUESTION_TYPES.includes(questionType)

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cancel auto-advance
  const cancelAdvance = useCallback(() => {
    clearTimers()
    setIsAdvancing(false)
    setRemainingMs(AUTO_ADVANCE_DELAY)
  }, [clearTimers])

  // Trigger auto-advance
  const triggerAdvance = useCallback(() => {
    if (!isApplicable) return

    // For multi-select (multiple_choice with maxSelections), only auto-advance when maxSelections is reached
    if (maxSelections !== undefined) {
      if (currentSelectionCount < maxSelections) {
        return
      }
    }

    // Clear any existing timers
    clearTimers()

    // Start countdown
    setIsAdvancing(true)
    setRemainingMs(AUTO_ADVANCE_DELAY)
    startTimeRef.current = Date.now()

    // Update remaining time every 50ms for smooth progress
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, AUTO_ADVANCE_DELAY - elapsed)
      setRemainingMs(remaining)
    }, 50)

    // Trigger advance after delay
    timerRef.current = setTimeout(() => {
      clearTimers()
      setIsAdvancing(false)
      setRemainingMs(AUTO_ADVANCE_DELAY)
      onAdvance()
    }, AUTO_ADVANCE_DELAY)
  }, [isApplicable, maxSelections, currentSelectionCount, clearTimers, onAdvance])

  // Handle Escape key to cancel
  useEffect(() => {
    if (!isAdvancing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelAdvance()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAdvancing, cancelAdvance])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  return {
    isAdvancing,
    remainingMs,
    cancelAdvance,
    triggerAdvance,
  }
}
