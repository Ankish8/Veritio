'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useExcludedParticipants } from '@/hooks/analysis'
import { ResultsPageShell } from '@/components/analysis/shared'
import { normalizePostTaskData } from '@/components/analysis/shared/post-task-data-normalizer'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'
import type { TestDisplaySettings, PrototypeTestDisplaySettings } from '@veritio/analysis-shared'
import type { ExtendedPrototypeTestSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Prototype Test components - direct imports to avoid barrel export loading everything
import { computePrototypeTestMetrics } from '@/lib/algorithms/prototype-test-analysis'
import { ResultsOverview as PrototypeTestResultsOverview } from '@/components/analysis/prototype-test/results-overview'
import { PrototypeTestParticipantsTabContainer } from '@/components/analysis/prototype-test/participants/prototype-test-participants-tab-container'
import { PrototypeTestAnalysisTab } from '@/components/analysis/prototype-test/analysis-tab'

// Heavy components lazy loaded with skeleton fallbacks (ExcelJS, jsPDF only load when Downloads tab clicked)
const PrototypeTestDownloadsTab = dynamic(
  () => import('@/components/analysis/prototype-test/downloads-tab').then(m => ({ default: m.PrototypeTestDownloadsTab })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)

// Recording components
const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

import type { PrototypeTestResultsData } from './types'

interface PrototypeTestResultsContentProps {
  results: PrototypeTestResultsData
  projectId: string
  projectName: string
  studyId: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function PrototypeTestResultsContent({
  results,
  projectId,
  projectName,
  studyId,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: PrototypeTestResultsContentProps) {
  // Extract display settings from study settings
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as ExtendedPrototypeTestSettings | null
    if (!settings) return null

    return {
      type: 'prototype_test',
      settings: {
        randomizeTasks: settings.randomizeTasks,
        showTaskProgress: settings.showTaskProgress,
        clickableAreaFlashing: settings.clickableAreaFlashing,
        tasksEndAutomatically: settings.tasksEndAutomatically,
      } as PrototypeTestDisplaySettings,
    }
  }, [results.study.settings])

  // Extract participant display settings from study flow
  // Uses getDisplaySettingsFromStudy for proper defaults when displaySettings is undefined
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as (ExtendedPrototypeTestSettings & { studyFlow?: StudyFlowSettings }) | null
    const identifier = settings?.studyFlow?.participantIdentifier
    // Return null for anonymous mode, otherwise return settings with defaults
    if (!identifier?.type || identifier.type === 'anonymous') return null
    // Provide defaults if displaySettings is not configured
    return identifier.displaySettings ?? {
      primaryField: 'fullName',
      secondaryField: 'email',
    }
  }, [results.study.settings])

  // Filter excluded participants from analysis data
  const { excludedIds } = useExcludedParticipants(studyId, initialExcludedIds)

  const filteredParticipants = useMemo(() =>
    results.participants.filter(p => !excludedIds.has(p.id)),
  [results.participants, excludedIds])

  const filteredTaskAttempts = useMemo(() =>
    results.taskAttempts.filter(a => !excludedIds.has(a.participant_id)),
  [results.taskAttempts, excludedIds])

  const filteredFlowResponses = useMemo(() =>
    results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
  [results.flowResponses, excludedIds])

  // Recompute metrics from filtered data (skip when no exclusions for perf)
  const filteredMetrics = useMemo(() => {
    if (excludedIds.size === 0) return results.metrics
    return computePrototypeTestMetrics(results.tasks, filteredTaskAttempts, filteredParticipants)
  }, [excludedIds.size, results.metrics, results.tasks, filteredTaskAttempts, filteredParticipants])

  const postTaskData = useMemo(() => normalizePostTaskData(
    results.tasks,
    (results.postTaskResponses || []).filter(r => !excludedIds.has(r.participant_id)),
    studyId,
    { titleField: 'instruction', positionField: 'position' }
  ), [results.tasks, results.postTaskResponses, studyId, excludedIds])

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType="prototype_test"
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      studyMode={undefined}
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={filteredFlowResponses}
      postTaskData={postTaskData}
      participants={filteredParticipants}
      defaultAnalysisSubTab="task-results"
      renderOverviewContent={() => (
        <PrototypeTestResultsOverview
          metrics={filteredMetrics}
          participants={filteredParticipants}
          taskMetrics={filteredMetrics.taskMetrics}
        />
      )}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <PrototypeTestParticipantsTabContainer
          studyId={studyId}
          participants={results.participants}
          tasks={results.tasks}
          taskAttempts={results.taskAttempts}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as 'all' | 'completed' | 'abandoned' | 'in_progress'}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <PrototypeTestAnalysisTab
          studyId={studyId}
          tasks={results.tasks}
          frames={results.frames}
          taskAttempts={filteredTaskAttempts}
          participants={filteredParticipants}
          metrics={filteredMetrics}
          flowQuestions={results.flowQuestions}
          flowResponses={filteredFlowResponses}
          onNavigateToSegments={onNavigateToSegments}
          initialSubTab={initialSubTab}
          onSubTabChange={onSubTabChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <PrototypeTestDownloadsTab
            studyId={studyId}
            studyTitle={results.study.title}
            studyDescription={results.study.description}
            tasks={results.tasks}
            taskAttempts={filteredTaskAttempts}
            participants={filteredParticipants}
            metrics={filteredMetrics}
            flowQuestions={results.flowQuestions}
            flowResponses={filteredFlowResponses}
          />

        </div>
      )}
      renderRecordingsContent={() => (
        <RecordingsTab
          studyId={studyId}
          participants={filteredParticipants}
          displaySettings={participantDisplaySettings}
          excludedParticipantIds={excludedIds}
        />
      )}
    />
  )
}
