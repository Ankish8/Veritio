'use client'

import { useMemo } from 'react'
import { useExcludedParticipants } from '@/hooks/analysis'
import dynamic from 'next/dynamic'
import { ResultsPageShell } from '@/components/analysis/shared/results-page-shell'
import { FirstImpressionOverview } from '@/components/analysis/first-impression/overview-tab'
import { FirstImpressionParticipantsTabContainer } from '@/components/analysis/first-impression/participants/first-impression-participants-tab-container'
import { FirstImpressionAnalysis } from '@/components/analysis/first-impression/analysis-tab'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'
import { calculateMetrics as calculateFirstImpressionMetrics } from '@/services/results/first-impression'
import type { FirstImpressionResultsResponse } from '@/services/results/first-impression'
import type { TestDisplaySettings, FirstImpressionDisplaySettings } from '@veritio/analysis-shared'
import type { ExtendedFirstImpressionSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Lazy load heavy tabs with skeleton fallbacks
const FirstImpressionDownloads = dynamic(
  () => import('@/components/analysis/first-impression/downloads-tab').then(m => ({ default: m.FirstImpressionDownloads })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)
const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

interface FirstImpressionResultsContentProps {
  results: FirstImpressionResultsResponse
  studyId: string
  projectId: string
  projectName: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function FirstImpressionResultsContent({
  results,
  studyId,
  projectId,
  projectName,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: FirstImpressionResultsContentProps) {
  // Extract display settings from study settings
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as ExtendedFirstImpressionSettings | null
    if (!settings) return null

    return {
      type: 'first_impression',
      settings: {
        exposureDurationMs: settings.exposureDurationMs ?? 5000,
        countdownDurationMs: settings.countdownDurationMs ?? 3000,
        designAssignmentMode: settings.designAssignmentMode ?? 'random_single',
        questionDisplayMode: settings.questionDisplayMode,
      } as FirstImpressionDisplaySettings,
    }
  }, [results.study.settings])

  // Extract participant display settings from study flow
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as (ExtendedFirstImpressionSettings & { studyFlow?: StudyFlowSettings }) | null
    const identifier = settings?.studyFlow?.participantIdentifier
    // Return null for anonymous mode, otherwise return settings with defaults
    if (!identifier?.type || identifier.type === 'anonymous') return null
    return identifier.displaySettings ?? {
      primaryField: 'fullName',
      secondaryField: 'email',
    }
  }, [results.study.settings])

  // Filter excluded participants from analysis data
  const { excludedIds } = useExcludedParticipants(studyId, initialExcludedIds)

  const filteredResults = useMemo(() => {
    const filteredParticipants = results.participants.filter(p => !excludedIds.has(p.id))
    const filteredSessions = results.sessions.filter(s => !excludedIds.has(s.participant_id))
    const filteredExposures = results.exposures.filter(e => !excludedIds.has(e.participant_id))
    const filteredResponses = results.responses.filter(r => !excludedIds.has(r.participant_id))
    return {
      ...results,
      participants: filteredParticipants,
      sessions: filteredSessions,
      exposures: filteredExposures,
      responses: filteredResponses,
      flowResponses: results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
      metrics: excludedIds.size === 0
        ? results.metrics
        : calculateFirstImpressionMetrics(results.designs, filteredSessions, filteredExposures, filteredResponses, filteredParticipants),
    }
  }, [results, excludedIds])

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType="first_impression"
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={filteredResults.flowResponses}
      participants={filteredResults.participants}
      defaultAnalysisSubTab="design-results"
      renderOverviewContent={() => <FirstImpressionOverview data={filteredResults} />}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <FirstImpressionParticipantsTabContainer
          data={results}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as import('@/components/analysis/first-impression/participants/first-impression-participants-tab-container').StatusFilter}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <FirstImpressionAnalysis
          data={filteredResults}
          initialSubTab={initialSubTab}
          onSubTabChange={onSubTabChange}
          onNavigateToSegments={onNavigateToSegments}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <FirstImpressionDownloads studyId={studyId} data={filteredResults} />

        </div>
      )}
      renderRecordingsContent={() => (
        <RecordingsTab
          studyId={studyId}
          participants={filteredResults.participants}
          displaySettings={participantDisplaySettings}
          excludedParticipantIds={excludedIds}
        />
      )}
    />
  )
}
