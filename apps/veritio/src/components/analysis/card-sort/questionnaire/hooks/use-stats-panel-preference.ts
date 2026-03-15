'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'questionnaire-stats-panel-preferences'

interface StatsPanelPreferences {
  [questionId: string]: boolean
}

/**
 * Hook to persist stats panel visibility preference per question in localStorage.
 *
 * @param questionId - Unique identifier for the question
 * @returns [isOpen, setIsOpen] - Current state and setter function
 */
export function useStatsPanelPreference(
  questionId: string
): [boolean, (isOpen: boolean) => void] {
  const [isOpen, setIsOpenState] = useState<boolean>(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences: StatsPanelPreferences = JSON.parse(stored)
        if (preferences[questionId] !== undefined) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setIsOpenState(preferences[questionId])
        }
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, etc.)
    }
    setIsHydrated(true)
  }, [questionId])

  // Save preference to localStorage
  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open)

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const preferences: StatsPanelPreferences = stored ? JSON.parse(stored) : {}
      preferences[questionId] = open
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Ignore localStorage errors
    }
  }, [questionId])

  // Return false during SSR to avoid hydration mismatch (panel always collapsed on first render)
  return [isHydrated ? isOpen : false, setIsOpen]
}

