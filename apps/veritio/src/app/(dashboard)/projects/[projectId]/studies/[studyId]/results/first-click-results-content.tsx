'use client'

import { useMemo } from 'react'
import { useExcludedParticipants } from '@/hooks/analysis'
import dynamic from 'next/dynamic'
import { ResultsPageShell } from '@/components/analysis/shared/results-page-shell'
import { normalizePostTaskData } from '@/components/analysis/shared/post-task-data-normalizer'
import { FirstClickOverview } from '@/components/analysis/first-click/overview-tab'
import { FirstClickParticipants } from '@/components/analysis/first-click/participants/participants-list'
import { FirstClickAnalysis } from '@/components/analysis/first-click/analysis-tab'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'
import { calculateMetrics as calculateFirstClickMetrics } from '@/services/results/first-click'
import type { FirstClickResultsResponse } from '@/services/results/first-click'
import type { TestDisplaySettings, FirstClickDisplaySettings } from '@veritio/analysis-shared'
import type { FirstClickTestSettings } from '@veritio/study-types'
import type { ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Lazy load heavy tabs with skeleton fallbacks
const FirstClickDownloads = dynamic(
  () => import('@/components/analysis/first-click/downloads-tab').then(m => ({ default: m.FirstClickDownloads })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)
const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

interface FirstClickResultsContentProps {
  results: FirstClickResultsResponse
  studyId: string
  projectId: string
  projectName: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function FirstClickResultsContent({
  results,
  studyId,
  projectId,
  projectName,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: FirstClickResultsContentProps) {
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as FirstClickTestSettings | null
    if (!settings) return null

    return {
      type: 'first_click',
      settings: {
        randomizeTasks: settings.randomizeTasks ?? settings.randomize_tasks,
        startTasksImmediately: settings.startTasksImmediately ?? settings.start_tasks_immediately,
        showTaskProgress: settings.showTaskProgress ?? settings.show_task_progress,
        imageScaling: settings.imageScaling ?? settings.image_scaling,
      } as FirstClickDisplaySettings,
    }
  }, [results.study.settings])

  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as (FirstClickTestSettings & { studyFlow?: StudyFlowSettings }) | null
    const identifier = settings?.studyFlow?.participantIdentifier
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
    const filteredResponses = results.responses.filter(r => !excludedIds.has(r.participant_id))
    return {
      ...results,
      participants: filteredParticipants,
      responses: filteredResponses,
      flowResponses: results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
      postTaskResponses: (results.postTaskResponses || []).filter(r => !excludedIds.has(r.participant_id)),
      metrics: excludedIds.size === 0
        ? results.metrics
        : calculateFirstClickMetrics(results.tasks, filteredResponses, filteredParticipants),
    }
  }, [results, excludedIds])

  const postTaskData = useMemo(() => normalizePostTaskData(
    results.tasks,
    filteredResults.postTaskResponses || [],
    studyId,
    { titleField: 'instruction', positionField: 'position' }
  ), [results.tasks, filteredResults.postTaskResponses, studyId])

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType="first_click"
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
      postTaskData={postTaskData}
      participants={filteredResults.participants}
      defaultAnalysisSubTab="task-results"
      renderOverviewContent={() => <FirstClickOverview data={filteredResults} />}
      renderParticipantsContent={(props) => (
        <FirstClickParticipants {...props} data={results} displaySettings={participantDisplaySettings} />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <FirstClickAnalysis
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
          <FirstClickDownloads studyId={studyId} data={filteredResults} />

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
