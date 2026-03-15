'use client'

/**
 * ResultsPageShell
 *
 * Shared results page shell component.
 * Provides the common layout, header, tabs, and state management
 * for Card Sort, Tree Test, and Survey results pages.
 *
 * REFACTORED: Split into smaller components:
 * - ResultsPageHeader: Header with breadcrumbs and actions
 * - ResultsEmptyState: No responses UI
 * - useResultsPageState: State management hook
 *
 * PERFORMANCE: Uses prefetching for instant tab switching:
 * - Background prefetch of common tabs after 1.5s
 * - Hover prefetch for remaining tabs
 */

import { useCallback } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs'

import {
  WelcomeModal,
  SegmentFilterBadges,
  QuestionnaireTab,
} from '@/components/analysis/card-sort'

import { TabPresenceSync, TabTriggerWithPresence } from '@/components/yjs'
import {
  prefetchResultsTabBundle,
  usePrefetchResultsBundles,
} from '@/lib/prefetch/results-tab-prefetch'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'
import type { FirstImpressionDisplaySettings, TestDisplaySettings } from '@veritio/analysis-shared'
import type { PostTaskData } from '../post-task-data-normalizer'

export interface QuestionnaireVariantComparison {
  primaryName: string
  compareName: string
  primaryFlowResponses: StudyFlowResponseRow[]
  compareFlowResponses: StudyFlowResponseRow[]
  primaryParticipants: Participant[]
  compareParticipants: Participant[]
  primaryPostTaskData: PostTaskData | null
  comparePostTaskData: PostTaskData | null
}

import { ResultsPageHeader } from './results-page-header'
import { ResultsEmptyState } from './results-empty-state'
import { useResultsPageState } from './use-results-page-state'

export interface ResultsPageShellProps {
  // Study identifiers
  studyId: string
  projectId: string
  projectName: string

  // Study info
  studyTitle: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyStatus: string
  shareCode: string
  studyDescription: string | null
  createdAt: string
  launchedAt: string | null
  studyMode?: 'open' | 'closed' | 'hybrid'

  // First Impression specific settings (deprecated - use testSettings)
  firstImpressionSettings?: FirstImpressionDisplaySettings | null

  // Unified test settings for all study types
  testSettings?: TestDisplaySettings | null

  // State
  hasResponses: boolean
  onEndStudy: () => Promise<void>

  // Questionnaire data (shared between study types)
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  postTaskData?: PostTaskData | null
  participants: Participant[]

  // Tab content render props
  renderOverviewContent: () => React.ReactNode
  renderParticipantsContent: (props: {
    initialTab: 'list' | 'segments'
    onTabChange: (tab: 'list' | 'segments') => void
    statusFilter: string
    onStatusFilterChange: (filter: string) => void
  }) => React.ReactNode
  renderAnalysisContent: (props: {
    onNavigateToSegments: () => void
    initialSubTab?: string
    onSubTabChange?: (tab: string) => void
    selectedTaskId?: string | null
    onSelectedTaskIdChange?: (id: string | null) => void
  }) => React.ReactNode
  renderDownloadsContent: () => React.ReactNode
  renderRecordingsContent?: () => React.ReactNode  // Optional: for studies with recordings

  // Optional: header filters (e.g., variant filter bar for AB testing)
  renderHeaderFilters?: () => React.ReactNode

  // Optional: default analysis sub-tab
  defaultAnalysisSubTab?: string

  // Optional: variant comparison for side-by-side questionnaire display
  variantComparison?: QuestionnaireVariantComparison
}

export function ResultsPageShell({
  studyId,
  projectId,
  projectName,
  studyTitle,
  studyType,
  studyStatus,
  shareCode,
  studyDescription,
  createdAt,
  launchedAt,
  studyMode,
  firstImpressionSettings,
  testSettings,
  hasResponses,
  onEndStudy,
  flowQuestions = [],
  flowResponses = [],
  postTaskData,
  participants,
  renderOverviewContent,
  renderParticipantsContent,
  renderAnalysisContent,
  renderDownloadsContent,
  renderRecordingsContent,
  renderHeaderFilters,
  defaultAnalysisSubTab = 'cards',
  variantComparison,
}: ResultsPageShellProps) {
  // Use extracted state hook
  const {
    persistedState,
    setActiveMainTab,
    setParticipantsSubTab,
    setStatusFilter,
    setAnalysisSubTab,
    setSelectedTaskId,
    handleNavigateToSegments,
  } = useResultsPageState({
    studyId,
    studyType,
    studyStatus,
    studyMode,
    studyDescription,
    createdAt,
    launchedAt,
    participantCount: participants.length,
    defaultAnalysisSubTab,
    firstImpressionSettings,
    testSettings,
  })

  // Prefetch common tab bundles after page load (network-aware)
  usePrefetchResultsBundles(studyType)

  // Memoized prefetch handler for tab hover
  const handleTabPrefetch = useCallback((tabId: string) => {
    prefetchResultsTabBundle(tabId)
  }, [])

  return (
    <>
      {/* Sync active tab to Yjs awareness for real-time collaboration */}
      <TabPresenceSync activeTab={persistedState.activeMainTab} />

      {/* Welcome modal for first-time visitors */}
      <WelcomeModal studyId={studyId} studyType={studyType} />

      {/* Header with breadcrumbs and actions */}
      <ResultsPageHeader
        projectId={projectId}
        projectName={projectName}
        studyId={studyId}
        studyTitle={studyTitle}
        studyStatus={studyStatus}
        shareCode={shareCode}
        onEndStudy={onEndStudy}
      />

      <div className="flex flex-1 flex-col gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 min-w-0">
        {/* Segment Filter Badges */}
        <SegmentFilterBadges />

        {!hasResponses ? (
          <ResultsEmptyState
            projectId={projectId}
            studyId={studyId}
            studyStatus={studyStatus}
          />
        ) : (
          <Tabs
            value={persistedState.activeMainTab}
            onValueChange={setActiveMainTab}
            className="space-y-2 flex flex-col flex-1 min-h-0"
          >
            {/* Variant filter above tabs */}
            {renderHeaderFilters?.()}

            {/* Sticky main tabs - stays visible when scrolling */}
            <div className="sticky top-0 z-20 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1 pb-1">
              <ScrollableTabsList variant="underline">
                <TabTriggerWithPresence
                  tabId="overview"
                  activeTab={persistedState.activeMainTab}
                  label="Overview"
                  onPrefetch={handleTabPrefetch}
                />
                <TabTriggerWithPresence
                  tabId="participants"
                  activeTab={persistedState.activeMainTab}
                  label="Participants"
                  onPrefetch={handleTabPrefetch}
                />
                <TabTriggerWithPresence
                  tabId="questionnaire"
                  activeTab={persistedState.activeMainTab}
                  label="Questionnaire"
                  onPrefetch={handleTabPrefetch}
                />
                <TabTriggerWithPresence
                  tabId="analysis"
                  activeTab={persistedState.activeMainTab}
                  label="Analysis"
                  onPrefetch={handleTabPrefetch}
                />
                {renderRecordingsContent && (
                  <TabTriggerWithPresence
                    tabId="recordings"
                    activeTab={persistedState.activeMainTab}
                    label="Recordings"
                    onPrefetch={handleTabPrefetch}
                  />
                )}
                <TabTriggerWithPresence
                  tabId="report"
                  activeTab={persistedState.activeMainTab}
                  label="Report"
                  onPrefetch={handleTabPrefetch}
                />
              </ScrollableTabsList>
            </div>

            {/* Keep Overview and Analysis mounted to preserve expensive state/data */}
            <TabsContent value="overview" keepMounted>{renderOverviewContent()}</TabsContent>

            <TabsContent value="participants" className="flex-1 flex flex-col min-h-0">
              {renderParticipantsContent({
                initialTab: persistedState.participantsSubTab as 'list' | 'segments',
                onTabChange: setParticipantsSubTab as (tab: 'list' | 'segments') => void,
                statusFilter: persistedState.statusFilter,
                onStatusFilterChange: setStatusFilter,
              })}
            </TabsContent>

            <TabsContent value="questionnaire">
              {variantComparison ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {variantComparison.primaryName} &middot; {variantComparison.primaryParticipants.length} participants
                    </h3>
                    <QuestionnaireTab
                      studyId={studyId}
                      flowQuestions={flowQuestions}
                      flowResponses={variantComparison.primaryFlowResponses}
                      participants={variantComparison.primaryParticipants}
                      postTaskData={variantComparison.primaryPostTaskData}
                      onNavigateToSegments={handleNavigateToSegments}
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {variantComparison.compareName} &middot; {variantComparison.compareParticipants.length} participants
                    </h3>
                    <QuestionnaireTab
                      studyId={studyId}
                      flowQuestions={flowQuestions}
                      flowResponses={variantComparison.compareFlowResponses}
                      participants={variantComparison.compareParticipants}
                      postTaskData={variantComparison.comparePostTaskData}
                      onNavigateToSegments={handleNavigateToSegments}
                    />
                  </div>
                </div>
              ) : (
                <QuestionnaireTab
                  studyId={studyId}
                  flowQuestions={flowQuestions}
                  flowResponses={flowResponses}
                  participants={participants}
                  postTaskData={postTaskData}
                  onNavigateToSegments={handleNavigateToSegments}
                />
              )}
            </TabsContent>

            {/* Analysis tab - keepMounted prevents heavy visualizations from remounting */}
            <TabsContent value="analysis" keepMounted>
              {renderAnalysisContent({
                onNavigateToSegments: handleNavigateToSegments,
                initialSubTab: persistedState.analysisSubTab,
                onSubTabChange: setAnalysisSubTab,
                selectedTaskId: persistedState.selectedTaskId,
                onSelectedTaskIdChange: setSelectedTaskId,
              })}
            </TabsContent>

            {renderRecordingsContent && (
              <TabsContent value="recordings" className="flex-1 flex flex-col min-h-0">{renderRecordingsContent()}</TabsContent>
            )}

            <TabsContent value="report">{renderDownloadsContent()}</TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}
