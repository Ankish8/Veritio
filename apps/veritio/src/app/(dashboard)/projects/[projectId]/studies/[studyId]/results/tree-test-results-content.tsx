'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ResultsPageShell } from '@/components/analysis/shared'
import { useExcludedParticipants } from '@/hooks/analysis'
import { normalizePostTaskData } from '@/components/analysis/shared/post-task-data-normalizer'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'

// Tree Test components
import {
  ResultsOverview as TreeTestResultsOverview,
  TreeTestAnalysisTab,
  TreeTestParticipantsTabContainer,
} from '@/components/analysis/tree-test'

import type { TestDisplaySettings, TreeTestDisplaySettings } from '@veritio/analysis-shared'
import type { ExtendedTreeTestSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Lazy load heavy tabs with skeleton fallbacks
const TreeTestDownloadsTab = dynamic(
  () => import('@/components/analysis/tree-test/downloads-tab').then(m => ({ default: m.TreeTestDownloadsTab })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)
const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

import { computeTreeTestMetrics } from '@/lib/algorithms/tree-test-analysis'
import type { OverallMetrics, TreeTestResponse, Participant as TreeTestParticipant } from '@/lib/algorithms/tree-test-analysis'
import type { Task, TreeNode, StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface TreeTestResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'tree_test'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  postTaskResponses: Array<{ id: string; participant_id: string; task_id: string; question_id: string; value: unknown }>
  participants: TreeTestParticipant[]
  metrics: OverallMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

interface TreeTestResultsContentProps {
  results: TreeTestResultsData
  projectId: string
  projectName: string
  studyId: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function TreeTestResultsContent({
  results,
  projectId,
  projectName,
  studyId,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: TreeTestResultsContentProps) {
  // Extract display settings from study settings
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as ExtendedTreeTestSettings | null
    if (!settings) return null

    return {
      type: 'tree_test',
      settings: {
        randomizeTasks: settings.randomizeTasks,
        showBreadcrumbs: settings.showBreadcrumbs,
        allowBack: settings.allowBack,
        showTaskProgress: settings.showTaskProgress,
      } as TreeTestDisplaySettings,
    }
  }, [results.study.settings])

  // Extract participant display settings from study flow
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as (ExtendedTreeTestSettings & { studyFlow?: StudyFlowSettings }) | null
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

  const filteredParticipants = useMemo(() =>
    results.participants.filter(p => !excludedIds.has(p.id)),
  [results.participants, excludedIds])

  const filteredResponses = useMemo(() =>
    results.responses.filter(r => !excludedIds.has(r.participant_id)),
  [results.responses, excludedIds])

  const filteredFlowResponses = useMemo(() =>
    results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
  [results.flowResponses, excludedIds])

  // Recompute metrics from filtered data (skip when no exclusions for perf)
  const filteredMetrics = useMemo(() => {
    if (excludedIds.size === 0) return results.metrics
    return computeTreeTestMetrics(results.tasks, results.nodes, filteredResponses, filteredParticipants)
  }, [excludedIds.size, results.metrics, results.tasks, results.nodes, filteredResponses, filteredParticipants])

  const postTaskData = useMemo(() => normalizePostTaskData(
    results.tasks,
    (results.postTaskResponses || []).filter(r => !excludedIds.has(r.participant_id)),
    studyId,
    { titleField: 'question', positionField: 'position' }
  ), [results.tasks, results.postTaskResponses, studyId, excludedIds])

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType="tree_test"
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      studyMode={undefined} // Tree tests don't have modes
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={filteredFlowResponses}
      postTaskData={postTaskData}
      participants={filteredParticipants as unknown as Participant[]}
      defaultAnalysisSubTab="tasks"
      renderOverviewContent={() => (
        <TreeTestResultsOverview
          metrics={filteredMetrics}
          responses={filteredResponses}
          participants={filteredParticipants as unknown as { country?: string | null; region?: string | null }[]}
          tasks={results.tasks}
          nodes={results.nodes}
        />
      )}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <TreeTestParticipantsTabContainer
          studyId={studyId}
          participants={results.participants}
          responses={results.responses}
          tasks={results.tasks}
          nodes={results.nodes}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as import('@/components/analysis/tree-test/participants/tree-test-participants-tab-container').StatusFilter}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, selectedTaskId, onSelectedTaskIdChange }) => (
        <TreeTestAnalysisTab
          studyId={studyId}
          tasks={results.tasks}
          nodes={results.nodes}
          responses={filteredResponses}
          participants={filteredParticipants}
          metrics={filteredMetrics}
          onNavigateToSegments={onNavigateToSegments}
          initialSelectedTaskId={selectedTaskId}
          onSelectedTaskIdChange={onSelectedTaskIdChange}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <TreeTestDownloadsTab
            studyId={studyId}
            studyTitle={results.study.title}
            tasks={results.tasks}
            nodes={results.nodes}
            responses={filteredResponses}
            participants={filteredParticipants}
            metrics={filteredMetrics}
          />

        </div>
      )}
      renderRecordingsContent={() => (
        <RecordingsTab
          studyId={studyId}
          participants={filteredParticipants as unknown as Participant[]}
          displaySettings={participantDisplaySettings}
          excludedParticipantIds={excludedIds}
        />
      )}
    />
  )
}
