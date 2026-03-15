'use client'

/**
 * Public Live Website Test Results
 *
 * Full-featured public results view for live_website_test studies.
 * Mirrors the dashboard experience: variant filtering, overview, participants,
 * analysis (task results, navigation paths, click maps, events explorer),
 * recordings, and questionnaire tabs.
 */

import { useMemo, useState, useCallback, useDeferredValue } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computeLiveWebsiteMetrics } from '@/services/results/live-website-overview'
import { LiveWebsiteOverviewTab } from '@/components/analysis/live-website/overview-tab'
import { LiveWebsiteAnalysisTab } from '@/components/analysis/live-website/analysis-tab'
import { LiveWebsiteParticipantsTabContainer } from '@/components/analysis/live-website/participants/participants-tab-container'
import { VariantFilterBar } from '@/components/analysis/live-website/variant-filter-bar'
import { VariantComparisonPanel } from '@/components/analysis/live-website/variant-comparison-panel'
import { FloatingActionBarProvider } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'
import { SegmentProvider } from '@/contexts/segment-context'
import { PublicQuestionnaireSection } from './public-questionnaire-section'
import { PublicInsightsSection } from './public-insights-section'

const PublicRecordingsView = dynamic(
  () => import('./public-recordings-view'),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-16"><div className="animate-pulse text-muted-foreground">Loading recordings...</div></div> }
)

interface PublicLiveWebsiteResultsProps {
  data: any
  fullResults: any
  showOverview: boolean
  showAnalysis: boolean
  showQuestionnaire: boolean
  showAiInsights: boolean
  token: string
}

export function PublicLiveWebsiteResults({
  data,
  fullResults,
  showOverview,
  showAnalysis,
  showQuestionnaire,
  showAiInsights,
  token,
}: PublicLiveWebsiteResultsProps) {
  const settings = fullResults.study?.settings || {}
  const trackingMode = settings.mode || 'url_only'
  const eyeTrackingEnabled = !!(settings.eyeTracking as any)?.enabled
  const studyId = data.study.id

  const participants = useMemo(() => fullResults.participants || [], [fullResults.participants])
  const responses = useMemo(() => fullResults.responses || [], [fullResults.responses])
  const events = useMemo(() => fullResults.events || [], [fullResults.events])
  const postTaskResponses = useMemo(() => fullResults.postTaskResponses || [], [fullResults.postTaskResponses])
  const tasks = useMemo(() => fullResults.tasks || [], [fullResults.tasks])
  const screenshots = useMemo(() => fullResults.screenshots || [], [fullResults.screenshots])
  const flowQuestions = useMemo(() => fullResults.flowQuestions || [], [fullResults.flowQuestions])
  const flowResponses = useMemo(() => fullResults.flowResponses || [], [fullResults.flowResponses])
  const abVariants = useMemo(() => fullResults.variants || [], [fullResults.variants])
  const participantVariants = useMemo(() => fullResults.participantVariants || [], [fullResults.participantVariants])

  // ─── Variant filtering ───
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVariantId, setCompareVariantId] = useState<string | null>(null)

  const deferredVariantId = useDeferredValue(selectedVariantId)
  const deferredCompareMode = useDeferredValue(compareMode)
  const deferredCompareVariantId = useDeferredValue(compareVariantId)

  // Primary variant participant IDs
  const primaryVariantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredVariantId || abVariants.length === 0) return null
    return new Set(
      participantVariants
        .filter((pv: any) => pv.variant_id === deferredVariantId)
        .map((pv: any) => pv.participant_id)
    )
  }, [deferredVariantId, abVariants.length, participantVariants])

  // Combined participant IDs (both variants in compare mode)
  const variantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredVariantId || abVariants.length === 0) return null
    if (deferredCompareMode && deferredCompareVariantId) {
      return new Set(
        participantVariants
          .filter((pv: any) => pv.variant_id === deferredVariantId || pv.variant_id === deferredCompareVariantId)
          .map((pv: any) => pv.participant_id)
      )
    }
    return primaryVariantParticipantIds
  }, [deferredVariantId, deferredCompareMode, deferredCompareVariantId, abVariants.length, participantVariants, primaryVariantParticipantIds])

  // Filtered arrays
  const filteredParticipants = useMemo(() =>
    variantParticipantIds ? participants.filter((p: any) => variantParticipantIds.has(p.id)) : participants,
  [participants, variantParticipantIds])

  const filteredResponses = useMemo(() =>
    variantParticipantIds ? responses.filter((r: any) => variantParticipantIds.has(r.participant_id)) : responses,
  [responses, variantParticipantIds])

  const filteredEvents = useMemo(() =>
    variantParticipantIds ? events.filter((e: any) => !e.participant_id || variantParticipantIds.has(e.participant_id)) : events,
  [events, variantParticipantIds])

  const filteredPostTaskResponses = useMemo(() =>
    variantParticipantIds ? postTaskResponses.filter((r: any) => variantParticipantIds.has(r.participant_id)) : postTaskResponses,
  [postTaskResponses, variantParticipantIds])

  const filteredFlowResponses = useMemo(() =>
    variantParticipantIds ? flowResponses.filter((r: any) => variantParticipantIds.has(r.participant_id)) : flowResponses,
  [flowResponses, variantParticipantIds])

  // Metrics for primary variant
  const variantMetrics = useMemo(() => {
    if (!deferredVariantId || abVariants.length === 0) return fullResults.metrics
    const primaryResp = responses.filter((r: any) => primaryVariantParticipantIds!.has(r.participant_id))
    const primaryEvents = events.filter((e: any) => !e.participant_id || primaryVariantParticipantIds!.has(e.participant_id))
    const primaryParts = participants.filter((p: any) => primaryVariantParticipantIds!.has(p.id))
    return computeLiveWebsiteMetrics(tasks, primaryResp, primaryEvents, primaryParts, trackingMode)
  }, [deferredVariantId, abVariants.length, fullResults.metrics, tasks, responses, events, participants, primaryVariantParticipantIds, trackingMode])

  // Combined metrics (for analysis tab in compare mode)
  const combinedVariantMetrics = useMemo(() => {
    if (!deferredCompareMode || !deferredCompareVariantId) return variantMetrics
    return computeLiveWebsiteMetrics(tasks, filteredResponses, filteredEvents, filteredParticipants, trackingMode)
  }, [deferredCompareMode, deferredCompareVariantId, variantMetrics, tasks, filteredResponses, filteredEvents, filteredParticipants, trackingMode])

  // Compare variant data
  const compareVariantParticipantIds = useMemo<Set<string> | null>(() => {
    if (!deferredCompareMode || !deferredCompareVariantId) return null
    return new Set(
      participantVariants
        .filter((pv: any) => pv.variant_id === deferredCompareVariantId)
        .map((pv: any) => pv.participant_id)
    )
  }, [deferredCompareMode, deferredCompareVariantId, participantVariants])

  const compareVariantMetrics = useMemo(() => {
    if (!compareVariantParticipantIds) return null
    const filtResp = responses.filter((r: any) => compareVariantParticipantIds.has(r.participant_id))
    const filtEvents = events.filter((e: any) => !e.participant_id || compareVariantParticipantIds.has(e.participant_id))
    const filtParts = participants.filter((p: any) => compareVariantParticipantIds.has(p.id))
    return computeLiveWebsiteMetrics(tasks, filtResp, filtEvents, filtParts, trackingMode)
  }, [compareVariantParticipantIds, tasks, responses, events, participants, trackingMode])

  // Primary-only arrays for compare mode analysis
  const primaryFilteredResponses = useMemo(() =>
    primaryVariantParticipantIds ? responses.filter((r: any) => primaryVariantParticipantIds.has(r.participant_id)) : responses,
  [responses, primaryVariantParticipantIds])

  const primaryFilteredEvents = useMemo(() =>
    primaryVariantParticipantIds ? events.filter((e: any) => !e.participant_id || primaryVariantParticipantIds.has(e.participant_id)) : events,
  [events, primaryVariantParticipantIds])

  const primaryFilteredParticipants = useMemo(() =>
    primaryVariantParticipantIds ? participants.filter((p: any) => primaryVariantParticipantIds.has(p.id)) : participants,
  [participants, primaryVariantParticipantIds])

  const primaryFilteredPostTaskResponses = useMemo(() =>
    primaryVariantParticipantIds ? postTaskResponses.filter((r: any) => primaryVariantParticipantIds.has(r.participant_id)) : postTaskResponses,
  [postTaskResponses, primaryVariantParticipantIds])

  const compareFilteredResponses = useMemo(() =>
    compareVariantParticipantIds ? responses.filter((r: any) => compareVariantParticipantIds.has(r.participant_id)) : [],
  [responses, compareVariantParticipantIds])

  const compareFilteredEvents = useMemo(() =>
    compareVariantParticipantIds ? events.filter((e: any) => !e.participant_id || compareVariantParticipantIds.has(e.participant_id)) : [],
  [events, compareVariantParticipantIds])

  const compareFilteredParticipants = useMemo(() =>
    compareVariantParticipantIds ? participants.filter((p: any) => compareVariantParticipantIds.has(p.id)) : [],
  [participants, compareVariantParticipantIds])

  const compareFilteredPostTaskResponses = useMemo(() =>
    compareVariantParticipantIds ? postTaskResponses.filter((r: any) => compareVariantParticipantIds.has(r.participant_id)) : [],
  [postTaskResponses, compareVariantParticipantIds])

  const variantComparison = useMemo(() => {
    if (!deferredCompareMode || !deferredCompareVariantId || !deferredVariantId || !compareVariantMetrics) return undefined
    const primaryName = abVariants.find((v: any) => v.id === deferredVariantId)?.name || 'A'
    const compareName = abVariants.find((v: any) => v.id === deferredCompareVariantId)?.name || 'B'
    return {
      primaryName,
      compareName,
      primaryMetrics: variantMetrics,
      compareMetrics: compareVariantMetrics,
      primaryResponses: primaryFilteredResponses,
      compareResponses: compareFilteredResponses,
      primaryEvents: primaryFilteredEvents,
      compareEvents: compareFilteredEvents,
      primaryParticipants: primaryFilteredParticipants,
      compareParticipants: compareFilteredParticipants,
      primaryPostTaskResponses: primaryFilteredPostTaskResponses,
      comparePostTaskResponses: compareFilteredPostTaskResponses,
    }
  }, [deferredCompareMode, deferredCompareVariantId, deferredVariantId, compareVariantMetrics,
    abVariants, variantMetrics, primaryFilteredResponses, compareFilteredResponses,
    primaryFilteredEvents, compareFilteredEvents, primaryFilteredParticipants,
    compareFilteredParticipants, primaryFilteredPostTaskResponses, compareFilteredPostTaskResponses])

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

  // ─── Determine tabs ───
  const showParticipants = data.sharedMetrics.participants
  const showRecordings = settings.recordScreen || settings.recordWebcam
  const hasQuestionnaire = showQuestionnaire && flowQuestions.length > 0
  const hasInsights = showAiInsights && !!fullResults.insightsReport

  const defaultTab = showOverview ? 'overview' : showAnalysis ? 'analysis' : 'participants'

  return (
    <SegmentProvider
      participants={participants}
      flowResponses={flowResponses}
      flowQuestions={flowQuestions}
      responses={responses}
      savedSegments={[]}
    >
      <FloatingActionBarProvider>
        <div className="space-y-4">
      {/* Variant Filter Bar */}
      {abVariants.length > 0 && (
        <VariantFilterBar
          variants={abVariants}
          selectedVariantId={selectedVariantId}
          compareMode={compareMode}
          compareVariantId={compareVariantId}
          onVariantChange={handleVariantChange}
          onCompareModeChange={handleCompareModeChange}
          onCompareVariantChange={setCompareVariantId}
        />
      )}

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList variant="underline">
          {showOverview && <TabsTrigger variant="underline" value="overview">Overview</TabsTrigger>}
          {showParticipants && <TabsTrigger variant="underline" value="participants">Participants</TabsTrigger>}
          {showAnalysis && <TabsTrigger variant="underline" value="analysis">Analysis</TabsTrigger>}
          {hasQuestionnaire && <TabsTrigger variant="underline" value="questionnaire">Questionnaire</TabsTrigger>}
          {showRecordings && <TabsTrigger variant="underline" value="recordings">Recordings</TabsTrigger>}
          {hasInsights && <TabsTrigger variant="underline" value="ai-insights">AI Insights</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        {showOverview && (
          <TabsContent value="overview" className="space-y-6">
            {compareMode && compareVariantId && compareVariantMetrics && selectedVariantId && (
              <VariantComparisonPanel
                variantA={{
                  name: abVariants.find((v: any) => v.id === selectedVariantId)?.name || 'A',
                  metrics: variantMetrics,
                }}
                variantB={{
                  name: abVariants.find((v: any) => v.id === compareVariantId)?.name || 'B',
                  metrics: compareVariantMetrics,
                }}
                trackingMode={trackingMode}
              />
            )}
            <LiveWebsiteOverviewTab
              metrics={variantMetrics}
              participants={primaryVariantParticipantIds
                ? participants.filter((p: any) => primaryVariantParticipantIds.has(p.id))
                : participants}
              taskMetrics={variantMetrics.taskMetrics}
              trackingMode={trackingMode}
            />
          </TabsContent>
        )}

        {/* Participants Tab */}
        {showParticipants && (
          <TabsContent value="participants" className="space-y-6">
            <LiveWebsiteParticipantsTabContainer
              studyId={studyId}
              participants={filteredParticipants}
              allParticipants={participants}
              tasks={tasks}
              responses={filteredResponses}
              postTaskResponses={filteredPostTaskResponses}
              events={filteredEvents}
              flowQuestions={flowQuestions}
              flowResponses={flowResponses}
              abVariants={abVariants.length > 0 ? abVariants : undefined}
              participantVariants={participantVariants}
              selectedVariantId={selectedVariantId}
              readOnly
            />
          </TabsContent>
        )}

        {/* Analysis Tab */}
        {showAnalysis && (
          <TabsContent value="analysis" className="space-y-6">
            <LiveWebsiteAnalysisTab
              studyId={studyId}
              tasks={tasks}
              responses={filteredResponses}
              postTaskResponses={filteredPostTaskResponses}
              events={filteredEvents}
              screenshots={screenshots}
              participants={filteredParticipants}
              metrics={combinedVariantMetrics}
              flowQuestions={flowQuestions}
              flowResponses={filteredFlowResponses}
              trackingMode={trackingMode}
              defaultTimeLimitSeconds={settings.defaultTimeLimitSeconds ?? null}
              eyeTrackingEnabled={eyeTrackingEnabled}
              readOnly
              variants={abVariants.length > 0 ? abVariants.map((v: any) => ({ id: v.id, name: v.name, url: v.url })) : undefined}
              variantComparison={variantComparison ? {
                primaryName: variantComparison.primaryName,
                compareName: variantComparison.compareName,
                primaryMetrics: variantComparison.primaryMetrics,
                compareMetrics: variantComparison.compareMetrics,
                primaryResponses: variantComparison.primaryResponses,
                compareResponses: variantComparison.compareResponses,
                primaryEvents: variantComparison.primaryEvents,
                compareEvents: variantComparison.compareEvents,
                primaryParticipants: variantComparison.primaryParticipants,
                compareParticipants: variantComparison.compareParticipants,
                primaryPostTaskResponses: variantComparison.primaryPostTaskResponses,
                comparePostTaskResponses: variantComparison.comparePostTaskResponses,
              } : undefined}
            />
          </TabsContent>
        )}

        {/* Questionnaire Tab */}
        {hasQuestionnaire && (
          <TabsContent value="questionnaire" className="space-y-6">
            <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
              <PublicQuestionnaireSection
                flowQuestions={flowQuestions}
                flowResponses={filteredFlowResponses}
                participants={filteredParticipants}
              />
            </div>
          </TabsContent>
        )}

        {/* Recordings Tab */}
        {showRecordings && (
          <TabsContent value="recordings" className="space-y-6">
            <PublicRecordingsView
              studyId={studyId}
              recordings={fullResults.recordings || []}
              participants={filteredParticipants}
              participantIds={variantParticipantIds}
            />
          </TabsContent>
        )}

        {/* AI Insights Tab */}
        {hasInsights && (
          <TabsContent value="ai-insights" className="space-y-6">
            <PublicInsightsSection
              reportData={fullResults.insightsReport.report_data}
              reportId={fullResults.insightsReport.id}
              hasFilePath={!!fullResults.insightsReport.file_path}
              token={token}
            />
          </TabsContent>
        )}
      </Tabs>
        </div>
      </FloatingActionBarProvider>
    </SegmentProvider>
  )
}

export default PublicLiveWebsiteResults
