'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { ResultsPageShell } from '@/components/analysis/shared'
import { useExcludedParticipants } from '@/hooks/analysis'
import { DownloadsTabSkeleton } from '@/components/dashboard/skeletons'
import { SharingTab } from '@/components/analysis/card-sort'

// Survey components
import {
  SurveyResultsOverview,
  SurveyAnalysisTab,
  SurveyParticipantsTabContainer,
} from '@/components/analysis/survey'

import type { TestDisplaySettings, SurveyDisplaySettings } from '@veritio/analysis-shared'
import type { ExtendedSurveySettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Lazy load Downloads tab with skeleton fallback (Survey doesn't have Recordings)
const SurveyDownloadsTab = dynamic(
  () => import('@/components/analysis/survey/downloads-tab').then(m => ({ default: m.SurveyDownloadsTab })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)

import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface SurveyResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'survey'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

interface SurveyResultsContentProps {
  results: SurveyResultsData
  projectId: string
  projectName: string
  studyId: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function SurveyResultsContent({
  results,
  projectId,
  projectName,
  studyId,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: SurveyResultsContentProps) {
  // Extract display settings from study settings
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as ExtendedSurveySettings | null
    if (!settings) return null

    return {
      type: 'survey',
      settings: {
        showOneQuestionPerPage: settings.showOneQuestionPerPage,
        randomizeQuestions: settings.randomizeQuestions,
        showProgressBar: settings.showProgressBar,
        allowSkipQuestions: settings.allowSkipQuestions,
      } as SurveyDisplaySettings,
    }
  }, [results.study.settings])

  // Extract participant display settings from study flow
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as (ExtendedSurveySettings & { studyFlow?: StudyFlowSettings }) | null
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

  const filteredFlowResponses = useMemo(() =>
    results.flowResponses.filter(r => !excludedIds.has(r.participant_id)),
  [results.flowResponses, excludedIds])

  // Recompute participant stats from filtered data
  const filteredStats = useMemo(() => {
    if (excludedIds.size === 0) return results.stats
    const completed = filteredParticipants.filter(p => p.status === 'completed')
    const abandoned = filteredParticipants.filter(p => p.status === 'abandoned')
    const completedWithTimes = completed.filter(p => p.started_at && p.completed_at)
    const avgCompletionTimeMs = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, p) => sum + (new Date(p.completed_at!).getTime() - new Date(p.started_at!).getTime()), 0) / completedWithTimes.length
      : 0
    return {
      totalParticipants: filteredParticipants.length,
      completedParticipants: completed.length,
      abandonedParticipants: abandoned.length,
      completionRate: filteredParticipants.length > 0 ? (completed.length / filteredParticipants.length) * 100 : 0,
      avgCompletionTimeMs,
    }
  }, [excludedIds.size, results.stats, filteredParticipants])

  return (
    <ResultsPageShell
      studyId={studyId}
      projectId={projectId}
      projectName={projectName}
      studyTitle={results.study.title}
      studyType="survey"
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      studyMode={undefined} // Surveys don't have modes
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={filteredFlowResponses}
      participants={filteredParticipants}
      defaultAnalysisSubTab="questions"
      renderOverviewContent={() => (
        <SurveyResultsOverview
          studyId={studyId}
          stats={filteredStats}
          participants={filteredParticipants}
          flowQuestions={results.flowQuestions}
          flowResponses={filteredFlowResponses}
        />
      )}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <SurveyParticipantsTabContainer
          studyId={studyId}
          participants={results.participants}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as import('@/components/analysis/survey').StatusFilter}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <SurveyAnalysisTab
          studyId={studyId}
          flowQuestions={results.flowQuestions}
          flowResponses={filteredFlowResponses}
          participants={filteredParticipants}
          onNavigateToSegments={onNavigateToSegments}
          initialSubTab={initialSubTab}
          onSubTabChange={onSubTabChange}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <SurveyDownloadsTab
            studyId={studyId}
            studyTitle={results.study.title}
            flowQuestions={results.flowQuestions}
            flowResponses={filteredFlowResponses}
            participants={filteredParticipants}
          />

        </div>
      )}
    />
  )
}
