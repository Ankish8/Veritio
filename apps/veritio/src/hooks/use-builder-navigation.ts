'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { BuilderTabId } from '@/components/builders/shared'
import type { ActiveFlowSection } from '@/stores/study-flow-builder'

/**
 * useBuilderNavigation - Syncs builder navigation state with URL parameters
 *
 * This hook implements the industry-standard pattern of persisting UI navigation
 * state in the URL. Benefits:
 * - State survives page refresh
 * - Shareable links (teammates can see exact view)
 * - Browser back/forward navigation works
 * - Bookmarkable states
 *
 * URL Structure:
 * /projects/[id]/studies/[id]/builder?tab=study-flow&section=screening&question=abc123
 */

// Valid tab IDs for the builder
const VALID_TABS: BuilderTabId[] = [
  'details',
  'content',
  'tree',
  'tasks',
  'prototype',              // Prototype test
  'prototype-tasks',        // Prototype test tasks
  'first-click-tasks',      // First-click test tasks
  'first-impression-designs', // First impression test designs
  'live-website-setup',     // Live website test setup
  'live-website-tasks',     // Live website test tasks
  'study-flow',
  'settings',
  'branding',
  'sharing'                 // Sharing tab
]

// Valid section IDs for study flow
const VALID_SECTIONS: ActiveFlowSection[] = [
  'welcome', 'agreement', 'screening', 'identifier',
  'pre_study', 'instructions', 'post_study', 'survey', 'thank_you', 'closed'
]

interface UseBuilderNavigationOptions {
  /** Default tab when none specified in URL */
  defaultTab?: BuilderTabId
  /** Default section when none specified in URL */
  defaultSection?: ActiveFlowSection
  /** Called when URL params change (for syncing with external state) */
  onNavigationChange?: (params: BuilderNavigationState) => void
}

export interface BuilderNavigationState {
  tab: BuilderTabId
  section: ActiveFlowSection
  questionId: string | null
}

interface BuildBuilderNavigationURLInput {
  pathname: string
  currentSearch: string
  updates: Partial<BuilderNavigationState>
  defaultTab?: BuilderTabId
  defaultSection?: ActiveFlowSection
}

/**
 * Merge builder navigation changes into the current URL without losing
 * unrelated query parameters.
 */
export function buildBuilderNavigationURL({
  pathname,
  currentSearch,
  updates,
  defaultTab = 'details',
  defaultSection = 'welcome',
}: BuildBuilderNavigationURLInput): string {
  const params = new URLSearchParams(currentSearch)

  if (updates.tab !== undefined) {
    if (updates.tab === defaultTab) {
      params.delete('tab')
    } else {
      params.set('tab', updates.tab)
    }
  }

  if (updates.section !== undefined) {
    if (updates.section === defaultSection) {
      params.delete('section')
    } else {
      params.set('section', updates.section)
    }
  }

  if (updates.questionId !== undefined) {
    if (updates.questionId === null) {
      params.delete('question')
    } else {
      params.set('question', updates.questionId)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

interface UseBuilderNavigationReturn extends BuilderNavigationState {
  /** Set the active tab (updates URL) */
  setTab: (tab: BuilderTabId) => void
  /** Set the active section (updates URL) */
  setSection: (section: ActiveFlowSection) => void
  /** Set the selected question (updates URL) */
  setQuestionId: (questionId: string | null) => void
  /** Update multiple params at once (single URL update) */
  setNavigation: (params: Partial<BuilderNavigationState>) => void
  /** Check if URL params have been read */
  isReady: boolean
}

export function useBuilderNavigation(
  options: UseBuilderNavigationOptions = {}
): UseBuilderNavigationReturn {
  const {
    defaultTab = 'details',
    defaultSection = 'welcome',
    onNavigationChange
  } = options

  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Track if component is mounted/hydrated to prevent router dispatch before initialization
  const isMountedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Parse current URL params with validation
  const currentState = useMemo((): BuilderNavigationState => {
    const tabParam = searchParams.get('tab')
    const sectionParam = searchParams.get('section')
    const questionParam = searchParams.get('question')

    // Validate tab - fallback to default if invalid
    const tab: BuilderTabId = tabParam && VALID_TABS.includes(tabParam as BuilderTabId)
      ? (tabParam as BuilderTabId)
      : defaultTab

    // Validate section - fallback to default if invalid
    const section: ActiveFlowSection = sectionParam && VALID_SECTIONS.includes(sectionParam as ActiveFlowSection)
      ? (sectionParam as ActiveFlowSection)
      : defaultSection

    // Question ID can be any string or null
    const questionId = questionParam || null

    return { tab, section, questionId }
  }, [searchParams, defaultTab, defaultSection])

  // Update URL without full page reload
  const updateURL = useCallback((newParams: Partial<BuilderNavigationState>) => {
    // Guard against router dispatch before initialization (Next.js 16)
    if (!isMountedRef.current) return

    const newURL = buildBuilderNavigationURL({
      pathname,
      currentSearch: searchParams.toString(),
      updates: newParams,
      defaultTab,
      defaultSection,
    })

    // Builder tabs are local UI state. Native history updates are integrated
    // with Next.js useSearchParams, but do not request a new RSC payload for the
    // force-dynamic builder page. This keeps deep links/reload persistence while
    // making the selected tab update in the same client interaction.
    window.history.replaceState(null, '', newURL)
  }, [searchParams, pathname, defaultTab, defaultSection])

  // Individual setters for convenience
  const setTab = useCallback((tab: BuilderTabId) => {
    updateURL({ tab })
  }, [updateURL])

  const setSection = useCallback((section: ActiveFlowSection) => {
    updateURL({ section })
  }, [updateURL])

  const setQuestionId = useCallback((questionId: string | null) => {
    updateURL({ questionId })
  }, [updateURL])

  const setNavigation = useCallback((params: Partial<BuilderNavigationState>) => {
    updateURL(params)
  }, [updateURL])

  // Notify parent component when navigation changes (for syncing with stores)
  useEffect(() => {
    onNavigationChange?.(currentState)
  }, [currentState, onNavigationChange])

  return {
    ...currentState,
    setTab,
    setSection,
    setQuestionId,
    setNavigation,
    isReady: true, // searchParams is always ready in client components
  }
}

/**
 * Helper to build a shareable URL for a specific builder state
 */
export function buildBuilderURL(
  basePath: string,
  state: Partial<BuilderNavigationState>
): string {
  const params = new URLSearchParams()

  if (state.tab && state.tab !== 'details') {
    params.set('tab', state.tab)
  }
  if (state.section && state.section !== 'welcome') {
    params.set('section', state.section)
  }
  if (state.questionId) {
    params.set('question', state.questionId)
  }

  return params.toString() ? `${basePath}?${params.toString()}` : basePath
}
