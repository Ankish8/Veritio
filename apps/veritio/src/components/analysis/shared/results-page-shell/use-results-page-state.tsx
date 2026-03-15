'use client'

/**
 * useResultsPageState
 *
 * Hook that encapsulates all state management for the results page shell.
 * Handles persisted state, segment restoration, and panel setup.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/sonner'
import { useSegment } from '@/contexts/segment-context'
import { usePersistedResultsState, useAuthFetch } from '@/hooks'
import {
  useFloatingActionBar,
  StudyInfoPanel,
  type ActionButton,
} from '@/components/analysis/shared/floating-action-bar'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { Info, Sparkles } from 'lucide-react'
import { AssistantPanel } from '@/components/analysis/shared/assistant/assistant-panel'
import { useAssistantPendingEvents } from '@/hooks/use-assistant-pending-events'

import type { FirstImpressionDisplaySettings, TestDisplaySettings } from '@veritio/analysis-shared'

type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'

export interface UseResultsPageStateOptions {
  studyId: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyStatus: string
  studyMode?: 'open' | 'closed' | 'hybrid'
  studyDescription: string | null
  createdAt: string
  launchedAt: string | null
  participantCount?: number
  defaultAnalysisSubTab?: string
  // First Impression specific settings (deprecated - use testSettings)
  firstImpressionSettings?: FirstImpressionDisplaySettings | null
  // Unified test settings for all study types
  testSettings?: TestDisplaySettings | null
}

export interface ResultsPageStateReturn {
  // Persisted state
  persistedState: {
    activeMainTab: string
    participantsSubTab: string
    statusFilter: string
    analysisSubTab: string
    selectedTaskId: string | null
    activeSegmentId: string | null
  }
  setActiveMainTab: (tab: string) => void
  setParticipantsSubTab: (tab: 'list' | 'segments') => void
  setStatusFilter: (filter: string) => void
  setAnalysisSubTab: (tab: string) => void
  setSelectedTaskId: (id: string | null) => void
  isHydrated: boolean

  // Navigation
  handleNavigateToSegments: () => void
}

export function useResultsPageState({
  studyId,
  studyType,
  studyStatus,
  studyMode,
  studyDescription,
  createdAt,
  launchedAt,
  participantCount = 0,
  defaultAnalysisSubTab = 'cards',
  firstImpressionSettings,
  testSettings,
}: UseResultsPageStateOptions): ResultsPageStateReturn {
  const authFetch = useAuthFetch()
  const { applySegment, activeSegmentId, savedSegments } = useSegment()
  const { addPageAction, removePageAction, setActivePanel, closePanel, activePanel } = useFloatingActionBar()
  const { loadFromStudy, meta } = useStudyMetaStore()
  const { pendingCount } = useAssistantPendingEvents(activePanel === 'ai-assistant')
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // Persisted UI state
  const {
    state: persistedState,
    setActiveMainTab,
    setParticipantsSubTab,
    setStatusFilter,
    setAnalysisSubTab,
    setSelectedTaskId,
    setActiveSegmentId,
    isHydrated,
  } = usePersistedResultsState(studyId, { analysisSubTab: defaultAnalysisSubTab })

  // Track initialization
  const hasInitializedRef = useRef(false)
  const hasRestoredSegmentRef = useRef(false)

  // Status change handler for pause/resume/reopen
  const handleStatusChange = useCallback(async (newStatus: StudyStatus) => {
    setIsChangingStatus(true)
    try {
      const response = await authFetch(`/api/studies/${studyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      const updatedStudy = await response.json()
      if (updatedStudy?.id) {
        loadFromStudy(updatedStudy)
      }

      const currentStatus = meta.status || studyStatus
      const labels: Record<StudyStatus, string> = {
        draft: 'moved to draft',
        active: newStatus === 'active' && currentStatus === 'paused' ? 'resumed' : 'launched',
        paused: 'paused',
        completed: 'completed',
      }
      toast.success(`Study ${labels[newStatus]}`)
    } catch {
      toast.error('Failed to update study status')
    } finally {
      setIsChangingStatus(false)
    }
  }, [authFetch, studyId, loadFromStudy, meta.status, studyStatus])

  // Get reactive status from store (falls back to prop if not loaded)
  const effectiveStatus = meta.status || studyStatus

  // Memoize panel content
  const studyInfoPanelContent = useMemo(
    () => (
      <StudyInfoPanel
        studyType={studyType}
        status={effectiveStatus}
        studyMode={studyMode}
        description={studyDescription}
        createdAt={createdAt}
        launchedAt={launchedAt}
        participantCount={participantCount}
        firstImpressionSettings={firstImpressionSettings}
        testSettings={testSettings}
        onStatusChange={handleStatusChange}
        isChangingStatus={isChangingStatus}
      />
    ),
    [studyType, effectiveStatus, studyMode, studyDescription, createdAt, launchedAt, participantCount, firstImpressionSettings, testSettings, handleStatusChange, isChangingStatus]
  )

  // Restore persisted segment on page load
  useEffect(() => {
    if (!isHydrated || hasRestoredSegmentRef.current) return
    if (!persistedState.activeSegmentId) {
      hasRestoredSegmentRef.current = true
      return
    }

    const segmentExists = savedSegments.some((s) => s.id === persistedState.activeSegmentId)
    if (segmentExists) {
      applySegment(persistedState.activeSegmentId)
    } else {
      setActiveSegmentId(null)
    }
    hasRestoredSegmentRef.current = true
  }, [isHydrated, persistedState.activeSegmentId, savedSegments, applySegment, setActiveSegmentId])

  // Persist segment changes
  useEffect(() => {
    if (!isHydrated || !hasRestoredSegmentRef.current) return
    if (activeSegmentId !== persistedState.activeSegmentId) {
      setActiveSegmentId(activeSegmentId)
    }
  }, [activeSegmentId, isHydrated, persistedState.activeSegmentId, setActiveSegmentId])

  // Register study info action
  useEffect(() => {
    const studyInfoAction: ActionButton = {
      id: 'study-info',
      icon: Info,
      tooltip: 'Study Info',
      panelTitle: 'Study Info',
      panelContent: studyInfoPanelContent,
      order: 0,
    }

    addPageAction(studyInfoAction)

    return () => {
      removePageAction('study-info')
    }
  }, [studyId, studyInfoPanelContent, addPageAction, removePageAction])

  // Register AI assistant action
  const isPanelOpen = activePanel === 'ai-assistant'
  const assistantPanelContent = useMemo(
    () => (
      <AssistantPanel
        studyId={studyId}
        studyType={studyType}
        onClose={() => closePanel()}
        isPanelOpen={isPanelOpen}
      />
    ),
    [studyId, studyType, closePanel, isPanelOpen]
  )

  useEffect(() => {
    const assistantAction: ActionButton = {
      id: 'ai-assistant',
      icon: Sparkles,
      tooltip: 'Veritio AI',
      panelWidth: 420,
      panelContent: assistantPanelContent,
      hidden: false,
      badge: pendingCount > 0 ? pendingCount : undefined,
    }

    addPageAction(assistantAction)
  }, [studyId, assistantPanelContent, addPageAction, pendingCount])

  // Listen for toast "Open Assistant" action clicks
  useEffect(() => {
    const handleOpenAssistant = () => setActivePanel('ai-assistant')
    document.addEventListener('open-ai-assistant', handleOpenAssistant)
    return () => document.removeEventListener('open-ai-assistant', handleOpenAssistant)
  }, [setActivePanel])

  // Handle OAuth return flow on initial mount (panels start collapsed by default)
  useEffect(() => {
    if (!hasInitializedRef.current) {
      const oauthPending = sessionStorage.getItem('composio_oauth_pending')
      if (oauthPending) {
        sessionStorage.removeItem('composio_oauth_pending')
        setActivePanel('ai-assistant')
      }
      hasInitializedRef.current = true
    }
  }, [setActivePanel])

  // Auto-open/close panels based on active tab
  useEffect(() => {
    if (!hasInitializedRef.current) return
    // Panels stay collapsed by default; user opens them via sidebar icons
  }, [persistedState.activeMainTab, setActivePanel])

  // Navigation handler
  const handleNavigateToSegments = () => {
    setParticipantsSubTab('segments')
    setActiveMainTab('participants')
  }

  // Wrap setActiveMainTab to close participant detail panel on tab change
  const handleSetActiveMainTab = useCallback((tab: string) => {
    setActiveMainTab(tab)
    // Close any open participant detail panel when switching main tabs
    closePanel()
  }, [setActiveMainTab, closePanel])

  return {
    persistedState,
    setActiveMainTab: handleSetActiveMainTab,
    setParticipantsSubTab,
    setStatusFilter,
    setAnalysisSubTab,
    setSelectedTaskId,
    isHydrated,
    handleNavigateToSegments,
  }
}
