'use client'

import { useMemo, useState, useCallback, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { useExcludedParticipants } from '@/hooks/analysis'
import { ResultsPageShell } from '@/components/analysis/shared'
import { normalizePostTaskData } from '@/components/analysis/shared/post-task-data-normalizer'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'
import type { TestDisplaySettings } from '@veritio/analysis-shared'
import type { ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Live Website components - direct imports for critical path
import { computeLiveWebsiteMetrics } from '@/services/results/live-website-overview'
import { LiveWebsiteOverviewTab } from '@/components/analysis/live-website/overview-tab'
import { LiveWebsiteParticipantsTabContainer } from '@/components/analysis/live-website/participants/participants-tab-container'
import { LiveWebsiteAnalysisTab } from '@/components/analysis/live-website/analysis-tab'
import { VariantFilterBar } from '@/components/analysis/live-website/variant-filter-bar'
import { VariantComparisonPanel } from '@/components/analysis/live-website/variant-comparison-panel'

// Heavy components lazy loaded
const LiveWebsiteDownloadsTab = dynamic(
  () => import('@/components/analysis/live-website/downloads-tab').then(m => ({ default: m.LiveWebsiteDownloadsTab })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)

const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

import type { LiveWebsiteResultsData } from './types'

interface LiveWebsiteSettings {
  websiteUrl?: string
  mode?: 'url_only' | 'reverse_proxy' | 'snippet'
  snippetId?: string
  snippetVerified?: boolean
  recordScreen?: boolean
  recordWebcam?: boolean
  trackClickEvents?: boolean
  trackScrollDepth?: boolean
  allowMobile?: boolean
  allowSkipTasks?: boolean
  showTaskProgress?: boolean
  defaultTimeLimitSeconds?: number
  widgetPosition?: string
  studyFlow?: StudyFlowSettings
  [key: string]: unknown
}

export interface LiveWebsiteDisplaySettings {
  websiteUrl?: string
  trackingMode?: string
  recordScreen?: boolean
  trackClickEvents?: boolean
  trackScrollDepth?: boolean
  allowSkipTasks?: boolean
  showTaskProgress?: boolean
  defaultTimeLimitSeconds?: number
}

interface LiveWebsiteResultsContentProps {
  results: LiveWebsiteResultsData
  projectId: string
  projectName: string
  studyId: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function LiveWebsiteResultsContent({
  results,
  projectId,
  projectName,
  studyId,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: LiveWebsiteResultsContentProps) {
  const settings = results.study.settings as LiveWebsiteSettings | null
  const trackingMode = settings?.mode || 'url_only'
  const eyeTrackingEnabled = !!(settings?.eyeTracking as any)?.enabled

  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    if (!settings) return null

    return {
      type: 'live_website_test' as any,
      settings: {
        websiteUrl: settings.websiteUrl,
        trackingMode: settings.mode,
        recordScreen: settings.recordScreen,
        trackClickEvents: settings.trackClickEvents,
        trackScrollDepth: settings.trackScrollDepth,
        allowSkipTasks: settings.allowSkipTasks,
        showTaskProgress: settings.showTaskProgress,
        defaultTimeLimitSeconds: settings.defaultTimeLimitSeconds,
      } as LiveWebsiteDisplaySettings,
    }
  }, [settings])

  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const identifier = settings?.studyFlow?.participantIdentifier
    if (!identifier?.type || identifier.type === 'anonymous') return null
    return identifier.displaySettings ?? {
      primaryField: 'fullName',
      secondaryField: 'email',
    }
  }, [settings])

  // Filter excluded participants from analysis data (BEFORE variant filtering)
  const { excludedIds } = useExcludedParticipants(studyId, initialExcludedIds)

  const includedParticipants = useMemo(() =>
    results.participants.filter(p => !excludedIds.has(p.id)),
  [results.participants, excludedIds])

  const includedResponses = useMemo(() =>
    results.responses.filter(r => !excludedIds.has(r.participant_id)),
  [results.responses, excludedIds])

  const includedEvents = useMemo(() =>
    results.events.filter(e => !e.participant_id || !excludedIds.has(e.participant_id)),
  [results.events, excludedIds])

  const includedPostTaskResponses = useMemo(() =>
    results.postTaskResponses.filter(r => !excludedIds.has(r.participant_id)),
  [results.postTaskResponses, excludedIds])

  const includedFlowResponses = useMemo(() =>
    results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
  [results.flowResponses, excludedIds])

  // AB Testing variant support — global state shared across all tabs
  const abVariants = useMemo(() => results.variants || [], [results.variants])
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVariantId, setCompareVariantId] = useState<string | null>(null)

  // Deferred values: tab highlight uses immediate state, heavy filtering uses deferred
  const deferredVariantId = useDeferredValue(selectedVariantId)
  const deferredCompareMode = useDeferredValue(compareMode)
  const deferredCompareVariantId = useDeferredValue(compareVariantId)
  const _isVariantStale = deferredVariantId !== selectedVariantId
    || deferredCompareMode !== compareMode
    || deferredCompareVariantId !== compareVariantId

  // Participant IDs belonging to the PRIMARY selected variant only (for metrics)
  const primaryVariantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredVariantId || abVariants.length === 0) return null
    return new Set(
      results.participantVariants
        .filter(pv => pv.variant_id === deferredVariantId)
        .map(pv => pv.participant_id)
    )
  }, [deferredVariantId, abVariants.length, results.participantVariants])

  // Participant IDs for data display — in compare mode includes BOTH variants
  const variantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredVariantId || abVariants.length === 0) return null
    if (deferredCompareMode && deferredCompareVariantId) {
      return new Set(
        results.participantVariants
          .filter(pv => pv.variant_id === deferredVariantId || pv.variant_id === deferredCompareVariantId)
          .map(pv => pv.participant_id)
      )
    }
    return primaryVariantParticipantIds
  }, [deferredVariantId, deferredCompareMode, deferredCompareVariantId, abVariants.length, results.participantVariants, primaryVariantParticipantIds])

  // Pre-filtered arrays for variant selection — built on top of exclusion-filtered arrays
  // Used by Overview, Analysis, Downloads (these should never see excluded participants)
  const variantFilteredResponses = useMemo(() =>
    variantParticipantIds
      ? includedResponses.filter(r => variantParticipantIds.has(r.participant_id))
      : includedResponses,
  [includedResponses, variantParticipantIds])

  const variantFilteredEvents = useMemo(() =>
    variantParticipantIds
      ? includedEvents.filter(e => !e.participant_id || variantParticipantIds.has(e.participant_id))
      : includedEvents,
  [includedEvents, variantParticipantIds])

  const variantFilteredParticipants = useMemo(() =>
    variantParticipantIds
      ? includedParticipants.filter(p => variantParticipantIds.has(p.id))
      : includedParticipants,
  [includedParticipants, variantParticipantIds])

  const variantFilteredPostTaskResponses = useMemo(() =>
    variantParticipantIds
      ? includedPostTaskResponses.filter(r => variantParticipantIds.has(r.participant_id))
      : includedPostTaskResponses,
  [includedPostTaskResponses, variantParticipantIds])

  const variantFilteredFlowResponses = useMemo(() =>
    variantParticipantIds
      ? includedFlowResponses.filter(r => variantParticipantIds.has(r.participant_id))
      : includedFlowResponses,
  [includedFlowResponses, variantParticipantIds])

  const postTaskData = useMemo(() => normalizePostTaskData(
    results.tasks,
    variantFilteredPostTaskResponses,
    studyId,
    { titleField: 'title', positionField: 'order_position' }
  ), [results.tasks, variantFilteredPostTaskResponses, studyId])

  // Variant-only filtered arrays for Participants tab (NOT exclusion-filtered —
  // participants list has its own useExcludedParticipants for exclude/include toggling)
  const allVariantParticipants = useMemo(() =>
    variantParticipantIds
      ? results.participants.filter(p => variantParticipantIds.has(p.id))
      : results.participants,
  [results.participants, variantParticipantIds])

  const allVariantResponses = useMemo(() =>
    variantParticipantIds
      ? results.responses.filter(r => variantParticipantIds.has(r.participant_id))
      : results.responses,
  [results.responses, variantParticipantIds])

  const allVariantEvents = useMemo(() =>
    variantParticipantIds
      ? results.events.filter(e => !e.participant_id || variantParticipantIds.has(e.participant_id))
      : results.events,
  [results.events, variantParticipantIds])

  const allVariantPostTaskResponses = useMemo(() =>
    variantParticipantIds
      ? results.postTaskResponses.filter(r => variantParticipantIds.has(r.participant_id))
      : results.postTaskResponses,
  [results.postTaskResponses, variantParticipantIds])

  // Metrics for the PRIMARY selected variant (or all) — used by Overview for side-by-side comparison
  const variantMetrics = useMemo(() => {
    if (!deferredVariantId || abVariants.length === 0) {
      // Recompute metrics from exclusion-filtered data when no variant selected
      if (excludedIds.size === 0) return results.metrics
      return computeLiveWebsiteMetrics(
        results.tasks, includedResponses, includedEvents, includedParticipants, trackingMode
      )
    }
    // Always use primary variant only for metrics (not the combined compare set)
    const primaryResp = includedResponses.filter(r => primaryVariantParticipantIds!.has(r.participant_id))
    const primaryEvents = includedEvents.filter(e => !e.participant_id || primaryVariantParticipantIds!.has(e.participant_id))
    const primaryParts = includedParticipants.filter(p => primaryVariantParticipantIds!.has(p.id))
    return computeLiveWebsiteMetrics(results.tasks, primaryResp, primaryEvents, primaryParts, trackingMode)
  }, [deferredVariantId, abVariants.length, results.tasks, results.metrics, excludedIds.size,
    includedResponses, includedEvents, includedParticipants, primaryVariantParticipantIds, trackingMode])

  // Metrics for the combined variant set (B+C when comparing) — used by Analysis, Downloads
  const combinedVariantMetrics = useMemo(() => {
    if (!deferredCompareMode || !deferredCompareVariantId) return variantMetrics
    return computeLiveWebsiteMetrics(
      results.tasks, variantFilteredResponses, variantFilteredEvents, variantFilteredParticipants, trackingMode
    )
  }, [deferredCompareMode, deferredCompareVariantId, variantMetrics, results.tasks,
    variantFilteredResponses, variantFilteredEvents, variantFilteredParticipants, trackingMode])

  // Participant IDs for the comparison variant (built from join table, same source as primary)
  const compareVariantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredCompareMode || !deferredCompareVariantId) return null
    return new Set(
      results.participantVariants
        .filter(pv => pv.variant_id === deferredCompareVariantId)
        .map(pv => pv.participant_id)
    )
  }, [deferredCompareMode, deferredCompareVariantId, results.participantVariants])

  // Metrics for the comparison variant (only when comparing) — uses exclusion-filtered source
  const compareVariantMetrics = useMemo(() => {
    if (!compareVariantParticipantIds) return null
    const filtResp = includedResponses.filter(r => compareVariantParticipantIds.has(r.participant_id))
    const filtEvents = includedEvents.filter(e => !e.participant_id || compareVariantParticipantIds.has(e.participant_id))
    const filtParts = includedParticipants.filter(p => compareVariantParticipantIds.has(p.id))
    return computeLiveWebsiteMetrics(results.tasks, filtResp, filtEvents, filtParts, trackingMode)
  }, [compareVariantParticipantIds, results.tasks, includedResponses, includedEvents, includedParticipants, trackingMode])

  // Per-variant filtered arrays for side-by-side comparison in Analysis & Questionnaire tabs
  const compareVariantFilteredResponses = useMemo(() =>
    compareVariantParticipantIds
      ? includedResponses.filter(r => compareVariantParticipantIds.has(r.participant_id))
      : [],
  [includedResponses, compareVariantParticipantIds])

  const compareVariantFilteredEvents = useMemo(() =>
    compareVariantParticipantIds
      ? includedEvents.filter(e => !e.participant_id || compareVariantParticipantIds.has(e.participant_id))
      : [],
  [includedEvents, compareVariantParticipantIds])

  const compareVariantFilteredParticipants = useMemo(() =>
    compareVariantParticipantIds
      ? includedParticipants.filter(p => compareVariantParticipantIds.has(p.id))
      : [],
  [includedParticipants, compareVariantParticipantIds])

  const compareVariantFilteredPostTaskResponses = useMemo(() =>
    compareVariantParticipantIds
      ? includedPostTaskResponses.filter(r => compareVariantParticipantIds.has(r.participant_id))
      : [],
  [includedPostTaskResponses, compareVariantParticipantIds])

  const compareVariantFilteredFlowResponses = useMemo(() =>
    compareVariantParticipantIds
      ? includedFlowResponses.filter(r => compareVariantParticipantIds.has(r.participant_id))
      : [],
  [includedFlowResponses, compareVariantParticipantIds])

  const comparePostTaskData = useMemo(() => {
    if (!compareVariantParticipantIds) return null
    return normalizePostTaskData(
      results.tasks,
      compareVariantFilteredPostTaskResponses,
      studyId,
      { titleField: 'title', positionField: 'order_position' }
    )
  }, [results.tasks, compareVariantFilteredPostTaskResponses, studyId, compareVariantParticipantIds])

  // Primary variant filtered arrays (when comparing, these are just the primary variant's data)
  const primaryVariantFilteredResponses = useMemo(() =>
    primaryVariantParticipantIds
      ? includedResponses.filter(r => primaryVariantParticipantIds.has(r.participant_id))
      : includedResponses,
  [includedResponses, primaryVariantParticipantIds])

  const primaryVariantFilteredEvents = useMemo(() =>
    primaryVariantParticipantIds
      ? includedEvents.filter(e => !e.participant_id || primaryVariantParticipantIds.has(e.participant_id))
      : includedEvents,
  [includedEvents, primaryVariantParticipantIds])

  const primaryVariantFilteredParticipants = useMemo(() =>
    primaryVariantParticipantIds
      ? includedParticipants.filter(p => primaryVariantParticipantIds.has(p.id))
      : includedParticipants,
  [includedParticipants, primaryVariantParticipantIds])

  const primaryVariantFilteredPostTaskResponses = useMemo(() =>
    primaryVariantParticipantIds
      ? includedPostTaskResponses.filter(r => primaryVariantParticipantIds.has(r.participant_id))
      : includedPostTaskResponses,
  [includedPostTaskResponses, primaryVariantParticipantIds])

  const primaryVariantFilteredFlowResponses = useMemo(() =>
    primaryVariantParticipantIds
      ? includedFlowResponses.filter(r => primaryVariantParticipantIds.has(r.participant_id))
      : includedFlowResponses,
  [includedFlowResponses, primaryVariantParticipantIds])

  const primaryPostTaskData = useMemo(() => {
    if (!deferredCompareMode || !deferredCompareVariantId) return null
    return normalizePostTaskData(
      results.tasks,
      primaryVariantFilteredPostTaskResponses,
      studyId,
      { titleField: 'title', positionField: 'order_position' }
    )
  }, [results.tasks, primaryVariantFilteredPostTaskResponses, studyId, deferredCompareMode, deferredCompareVariantId])

  // Build the variant comparison object (null when not comparing)
  const variantComparison = useMemo(() => {
    if (!deferredCompareMode || !deferredCompareVariantId || !deferredVariantId || !compareVariantMetrics) return null
    const primaryName = abVariants.find(v => v.id === deferredVariantId)?.name || 'A'
    const compareName = abVariants.find(v => v.id === deferredCompareVariantId)?.name || 'B'
    return { primaryName, compareName }
  }, [deferredCompareMode, deferredCompareVariantId, deferredVariantId, compareVariantMetrics, abVariants])

  const handleVariantChange = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
    if (!variantId) {
      setCompareMode(false)
      setCompareVariantId(null)
    }
  }, [])

  const handleCompareModeChange = useCallback((enabled: boolean) => {
    setCompareMode(enabled)
    if (!enabled) setCompareVariantId(null)
  }, [])

  const handleCompareVariantChange = setCompareVariantId

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType={"live_website_test" as any}
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={variantFilteredFlowResponses}
      postTaskData={postTaskData}
      participants={variantFilteredParticipants}
      defaultAnalysisSubTab="task-results"
      variantComparison={variantComparison ? {
        primaryName: variantComparison.primaryName,
        compareName: variantComparison.compareName,
        primaryFlowResponses: primaryVariantFilteredFlowResponses,
        compareFlowResponses: compareVariantFilteredFlowResponses,
        primaryParticipants: primaryVariantFilteredParticipants,
        compareParticipants: compareVariantFilteredParticipants,
        primaryPostTaskData: primaryPostTaskData ?? postTaskData,
        comparePostTaskData: comparePostTaskData,
      } : undefined}
      renderHeaderFilters={abVariants.length > 0 ? () => (
        <VariantFilterBar
          variants={abVariants}
          selectedVariantId={selectedVariantId}
          compareMode={compareMode}
          compareVariantId={compareVariantId}
          onVariantChange={handleVariantChange}
          onCompareModeChange={handleCompareModeChange}
          onCompareVariantChange={handleCompareVariantChange}
        />
      ) : undefined}
      renderOverviewContent={() => (
        <>
          {compareMode && compareVariantId && compareVariantMetrics && selectedVariantId && (
            <VariantComparisonPanel
              variantA={{
                name: abVariants.find(v => v.id === selectedVariantId)?.name || 'A',
                metrics: variantMetrics,
              }}
              variantB={{
                name: abVariants.find(v => v.id === compareVariantId)?.name || 'B',
                metrics: compareVariantMetrics,
              }}
              trackingMode={trackingMode}
            />
          )}
          <LiveWebsiteOverviewTab
            metrics={variantMetrics}
            participants={primaryVariantParticipantIds
              ? includedParticipants.filter(p => primaryVariantParticipantIds.has(p.id))
              : includedParticipants}
            taskMetrics={variantMetrics.taskMetrics}
            trackingMode={trackingMode}
          />
        </>
      )}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <LiveWebsiteParticipantsTabContainer
          studyId={studyId}
          participants={allVariantParticipants}
          allParticipants={results.participants}
          tasks={results.tasks}
          responses={allVariantResponses}
          postTaskResponses={allVariantPostTaskResponses}
          events={allVariantEvents}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as 'all' | 'completed' | 'abandoned' | 'in_progress'}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
          abVariants={abVariants.length > 0 ? abVariants : undefined}
          participantVariants={results.participantVariants}
          selectedVariantId={selectedVariantId}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <LiveWebsiteAnalysisTab
          studyId={studyId}
          tasks={results.tasks}
          responses={variantFilteredResponses}
          postTaskResponses={variantFilteredPostTaskResponses}
          events={variantFilteredEvents}
          screenshots={results.screenshots}
          participants={variantFilteredParticipants}
          metrics={combinedVariantMetrics}
          flowQuestions={results.flowQuestions}
          flowResponses={variantFilteredFlowResponses}
          trackingMode={trackingMode}
          onNavigateToSegments={onNavigateToSegments}
          initialSubTab={initialSubTab}
          onSubTabChange={onSubTabChange}
          displaySettings={participantDisplaySettings}
          defaultTimeLimitSeconds={settings?.defaultTimeLimitSeconds ?? null}
          eyeTrackingEnabled={eyeTrackingEnabled}
          variants={abVariants.length > 0 ? results.variants?.map(v => ({ id: v.id, name: v.name, url: v.url })) : undefined}
          variantComparison={variantComparison ? {
            primaryName: variantComparison.primaryName,
            compareName: variantComparison.compareName,
            primaryMetrics: variantMetrics,
            compareMetrics: compareVariantMetrics!,
            primaryResponses: primaryVariantFilteredResponses,
            compareResponses: compareVariantFilteredResponses,
            primaryEvents: primaryVariantFilteredEvents,
            compareEvents: compareVariantFilteredEvents,
            primaryParticipants: primaryVariantFilteredParticipants,
            compareParticipants: compareVariantFilteredParticipants,
            primaryPostTaskResponses: primaryVariantFilteredPostTaskResponses,
            comparePostTaskResponses: compareVariantFilteredPostTaskResponses,
          } : undefined}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <LiveWebsiteDownloadsTab
            studyId={studyId}
            studyTitle={results.study.title}
            studyDescription={results.study.description}
            tasks={results.tasks}
            responses={variantFilteredResponses}
            events={variantFilteredEvents}
            participants={variantFilteredParticipants}
            metrics={variantMetrics}
            trackingMode={trackingMode}
          />

        </div>
      )}
      renderRecordingsContent={() => (
        <RecordingsTab
          studyId={studyId}
          participants={variantFilteredParticipants}
          displaySettings={participantDisplaySettings}
          participantIds={variantParticipantIds}
          excludedParticipantIds={excludedIds}
        />
      )}
    />
  )
}
