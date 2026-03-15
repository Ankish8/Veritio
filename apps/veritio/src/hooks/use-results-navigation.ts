'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo, startTransition } from 'react'

/** Main results page tab IDs */
export type ResultsTabId =
  | 'overview'
  | 'participants'
  | 'questionnaire'
  | 'analysis'
  | 'insights'
  | 'recordings'
  | 'downloads'
  | 'sharing'

/** Analysis sub-tab IDs (varies by study type) */
export type AnalysisSubTabId =
  // Card Sort
  | 'cards'
  | 'categories'
  | 'standardization'
  | 'results-matrix'
  | 'similarity'
  | 'pca'
  // Tree Test
  | 'task-results'
  | 'pie-tree'
  | 'first-click'
  | 'paths'
  | 'destinations'
  // Survey
  | 'questions'
  | 'crosstab'
  | 'correlation'
  // Prototype Test / First Click
  | 'click-maps'
  // First Impression
  | 'design-results'
  | 'question-responses'
  | 'word-cloud'
  | 'comparison'

/** Valid main tabs for URL validation */
const VALID_MAIN_TABS: ResultsTabId[] = [
  'overview',
  'participants',
  'questionnaire',
  'analysis',
  'insights',
  'recordings',
  'downloads',
  'sharing',
]

interface UseResultsNavigationOptions {
  /** Default tab when none specified in URL */
  defaultTab?: ResultsTabId
  /** Default sub-tab for analysis tab */
  defaultSubTab?: AnalysisSubTabId | null
}

interface UseResultsNavigationReturn {
  /** Current active main tab */
  tab: ResultsTabId
  /** Current analysis sub-tab (null if not on analysis tab) */
  subTab: AnalysisSubTabId | null
  /** Selected task/item ID (for task detail views) */
  selectedId: string | null
  /** Set the main tab */
  setTab: (tab: ResultsTabId) => void
  /** Set the analysis sub-tab */
  setSubTab: (subTab: AnalysisSubTabId) => void
  /** Set the selected task/item ID */
  setSelectedId: (id: string | null) => void
  /** Set tab and sub-tab together */
  setTabState: (tab: ResultsTabId, subTab?: AnalysisSubTabId | null, selectedId?: string | null) => void
}

/** Manages results page navigation state via URL search params. */
export function useResultsNavigation(
  options: UseResultsNavigationOptions = {}
): UseResultsNavigationReturn {
  const { defaultTab = 'overview', defaultSubTab = null } = options
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tabParam = searchParams.get('tab')
  const subTabParam = searchParams.get('subTab')
  const selectedIdParam = searchParams.get('selected')

  const tab: ResultsTabId = useMemo(() => {
    if (tabParam && VALID_MAIN_TABS.includes(tabParam as ResultsTabId)) {
      return tabParam as ResultsTabId
    }
    return defaultTab
  }, [tabParam, defaultTab])

  const subTab: AnalysisSubTabId | null = useMemo(() => {
    if (tab === 'analysis' && subTabParam) {
      return subTabParam as AnalysisSubTabId
    }
    return tab === 'analysis' ? defaultSubTab : null
  }, [tab, subTabParam, defaultSubTab])

  const selectedId: string | null = useMemo(() => {
    return selectedIdParam || null
  }, [selectedIdParam])

  const updateURL = useCallback(
    (
      newTab: ResultsTabId,
      newSubTab?: AnalysisSubTabId | null,
      newSelectedId?: string | null
    ) => {
      const params = new URLSearchParams(searchParams.toString())

      if (newTab === defaultTab) {
        params.delete('tab')
      } else {
        params.set('tab', newTab)
      }

      if (newTab === 'analysis' && newSubTab) {
        params.set('subTab', newSubTab)
      } else {
        params.delete('subTab')
      }

      if (newSelectedId) {
        params.set('selected', newSelectedId)
      } else {
        params.delete('selected')
      }

      const queryString = params.toString()
      const newURL = queryString ? `${pathname}?${queryString}` : pathname

      startTransition(() => {
        router.replace(newURL, { scroll: false })
      })
    },
    [searchParams, pathname, router, defaultTab]
  )

  const setTab = useCallback(
    (newTab: ResultsTabId) => {
      updateURL(newTab, null, null)
    },
    [updateURL]
  )

  const setSubTab = useCallback(
    (newSubTab: AnalysisSubTabId) => {
      updateURL('analysis', newSubTab, selectedId)
    },
    [updateURL, selectedId]
  )

  const setSelectedId = useCallback(
    (newSelectedId: string | null) => {
      updateURL(tab, subTab, newSelectedId)
    },
    [updateURL, tab, subTab]
  )

  const setTabState = useCallback(
    (
      newTab: ResultsTabId,
      newSubTab?: AnalysisSubTabId | null,
      newSelectedId?: string | null
    ) => {
      updateURL(newTab, newSubTab ?? null, newSelectedId ?? null)
    },
    [updateURL]
  )

  return {
    tab,
    subTab,
    selectedId,
    setTab,
    setSubTab,
    setSelectedId,
    setTabState,
  }
}
