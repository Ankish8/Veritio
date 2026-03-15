'use client'

import { useEffect, useCallback, useRef } from 'react'
import type { QuestionType, ResponseValue } from '@veritio/study-types/study-flow-types'
import { handleQuestionKeypress, getKeyboardHint } from '@/lib/study-flow/keyboard-handlers'

interface QuestionOption {
  id: string
  label: string
}

interface UseQuestionKeyboardOptions {
  enabled: boolean
  questionType: QuestionType
  options?: QuestionOption[]
  value: ResponseValue | undefined
  onChange: (value: ResponseValue) => void
  onNext?: () => void
  onBack?: () => void
  canProceed?: boolean
  scalePoints?: number
  isTextInputFocused?: boolean
  onSelectionComplete?: () => void
  maxSelections?: number
}

interface UseQuestionKeyboardReturn {
  getOptionHint: (index: number) => string
  showHints: boolean
}

/** Keyboard navigation for question renderers (A-Z selection, Enter/Escape navigation). */
export function useQuestionKeyboard({
  enabled,
  questionType,
  options = [],
  value,
  onChange,
  onNext,
  onBack,
  canProceed = true,
  scalePoints = 5,
  isTextInputFocused = false,
  onSelectionComplete,
  maxSelections,
}: UseQuestionKeyboardOptions): UseQuestionKeyboardReturn {
  const isTouchDevice = useRef(false)
  const lastNpsKey = useRef<{ key: string; time: number } | null>(null)

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || isTextInputFocused) return

      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // Navigation: Enter to continue
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (canProceed && onNext) {
          e.preventDefault()
          onNext()
        }
        return
      }

      // Navigation: Escape to go back
      if (e.key === 'Escape') {
        e.preventDefault()
        onBack?.()
        return
      }

      // Option selection via letter/number keys
      const key = e.key.toUpperCase()
      const handled = handleQuestionKeypress(key, {
        questionType,
        options,
        value,
        onChange,
        scalePoints,
        maxSelections,
        onSelectionComplete,
        lastNpsKey,
      })

      if (handled) {
        e.preventDefault()
      }
    },
    [enabled, isTextInputFocused, questionType, options, value, onChange, onNext, onBack, canProceed, scalePoints, onSelectionComplete, maxSelections]
  )

  useEffect(() => {
    if (enabled && !isTextInputFocused) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, isTextInputFocused, handleKeyDown])

  const getOptionHint = useCallback(
    (index: number): string => getKeyboardHint(questionType, index),
    [questionType]
  )

  return {
    getOptionHint,
    // showHints only depends on device type, NOT on enabled state
    // This prevents visual "flash" when keyboard events are temporarily disabled during transitions
    // eslint-disable-next-line react-hooks/refs
    showHints: !isTouchDevice.current,
  }
}
