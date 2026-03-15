'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'questionnaire-chart-preferences'

export type ChartType =
  // Choice questions (radio, dropdown, checkbox)
  | 'horizontal-bar'
  | 'pie-chart'
  | 'vertical-bar'
  // Text questions
  | 'response-table'
  | 'word-cloud'
  // Text subtype: Numerical
  | 'numerical-histogram'
  // Text subtype: Date
  | 'date-timeline'
  // Text subtype: Email
  | 'email-domains'
  // Likert questions
  | 'distribution-table'
  | 'stacked-bar'
  | 'diverging-bar'
  // NPS questions
  | 'nps-default'
  | 'nps-gauge'
  | 'nps-donut'
  // Matrix questions
  | 'heat-map'
  | 'grouped-bar'
  | 'matrix-stacked-bar'
  // Ranking questions
  | 'rank-distribution'
  | 'rank-table'
  // Slider questions
  | 'slider-histogram'
  // Audio response questions
  | 'audio-response-list'
  // Constant Sum questions
  | 'constant-sum-table'
  | 'constant-sum-bars'
  | 'constant-sum-pie'
  // Semantic Differential questions
  | 'semantic-diff-profile'
  | 'semantic-diff-heatmap'
  | 'semantic-diff-distribution'

interface ChartPreferences {
  [questionId: string]: ChartType
}

/**
 * Hook to persist chart type preferences per question in localStorage.
 *
 * @param questionId - Unique identifier for the question
 * @param defaultType - Default chart type to use if no preference is stored
 * @returns [currentChartType, setChartType] - Current chart type and setter function
 */
export function useChartPreference(
  questionId: string,
  defaultType: ChartType
): [ChartType, (type: ChartType) => void] {
  const [chartType, setChartTypeState] = useState<ChartType>(defaultType)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const preferences: ChartPreferences = JSON.parse(stored)
        if (preferences[questionId]) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setChartTypeState(preferences[questionId])
        }
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, etc.)
    }
    setIsHydrated(true)
  }, [questionId])

  // Save preference to localStorage
  const setChartType = useCallback((type: ChartType) => {
    setChartTypeState(type)

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const preferences: ChartPreferences = stored ? JSON.parse(stored) : {}
      preferences[questionId] = type
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Ignore localStorage errors
    }
  }, [questionId])

  // Return default type during SSR to avoid hydration mismatch
  return [isHydrated ? chartType : defaultType, setChartType]
}

