'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY_PREFIX = 'results-state-'

export interface ResultsPageState {
  /** Main tab: 'overview' | 'participants' | 'questionnaire' | 'analysis' | 'downloads' | 'sharing' */
  activeMainTab: string
  /** Participants sub-tab: 'list' | 'segments' */
  participantsSubTab: 'list' | 'segments'
  /** Status filter: 'all' | 'completed' | 'abandoned' | 'in_progress' | 'with_responses' | 'no_responses' */
  statusFilter: string
  /** Analysis sub-tab (varies by study type) */
  analysisSubTab: string
  /** Selected task ID (Tree Test specific) */
  selectedTaskId: string | null
  /** Active segment ID from segment store */
  activeSegmentId: string | null
}

const DEFAULT_STATE: ResultsPageState = {
  activeMainTab: 'overview',
  participantsSubTab: 'list',
  statusFilter: 'completed',
  analysisSubTab: 'tasks',
  selectedTaskId: null,
  activeSegmentId: null,
}

/** Hook to persist results page UI state (tabs, filters, selections) in localStorage. */
export function usePersistedResultsState(
  studyId: string,
  overrideDefaults?: Partial<ResultsPageState>
) {
  const defaults = { ...DEFAULT_STATE, ...overrideDefaults }
  const [state, setState] = useState<ResultsPageState>(defaults)
  const [isHydrated, setIsHydrated] = useState(false)
  const storageKey = `${STORAGE_KEY_PREFIX}${studyId}`

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ResultsPageState>
        // Merge stored values with defaults (in case new fields were added)
        setState({ ...defaults, ...parsed })
      }
    } catch {
      // Ignore localStorage errors (SSR, private browsing, quota exceeded)
    }
    setIsHydrated(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId]) // Only re-run when studyId changes

  // Helper to persist state to localStorage
  const persist = useCallback((newState: ResultsPageState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState))
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey])

  // Individual setters - each updates state and persists
  const setActiveMainTab = useCallback((tab: string) => {
    setState(prev => {
      const next = { ...prev, activeMainTab: tab }
      persist(next)
      return next
    })
  }, [persist])

  const setParticipantsSubTab = useCallback((tab: 'list' | 'segments') => {
    setState(prev => {
      const next = { ...prev, participantsSubTab: tab }
      persist(next)
      return next
    })
  }, [persist])

  const setStatusFilter = useCallback((filter: string) => {
    setState(prev => {
      const next = { ...prev, statusFilter: filter }
      persist(next)
      return next
    })
  }, [persist])

  const setAnalysisSubTab = useCallback((tab: string) => {
    setState(prev => {
      const next = { ...prev, analysisSubTab: tab }
      persist(next)
      return next
    })
  }, [persist])

  const setSelectedTaskId = useCallback((taskId: string | null) => {
    setState(prev => {
      const next = { ...prev, selectedTaskId: taskId }
      persist(next)
      return next
    })
  }, [persist])

  const setActiveSegmentId = useCallback((segmentId: string | null) => {
    setState(prev => {
      const next = { ...prev, activeSegmentId: segmentId }
      persist(next)
      return next
    })
  }, [persist])

  // Return defaults during SSR to prevent hydration mismatch
  return {
    state: isHydrated ? state : defaults,
    setActiveMainTab,
    setParticipantsSubTab,
    setStatusFilter,
    setAnalysisSubTab,
    setSelectedTaskId,
    setActiveSegmentId,
    isHydrated,
  }
}

export function clearResultsState(studyId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${studyId}`)
  } catch {
    // Ignore errors
  }
}
