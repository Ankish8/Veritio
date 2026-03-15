'use client'

import { useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useExcludedParticipants } from '@/hooks/analysis'
import {
  ResultsOverview as CardSortResultsOverview,
  ParticipantsTabContainer,
  AnalysisTab,
  SharingTab,
} from '@/components/analysis/card-sort'
import { ResultsPageShell } from '@/components/analysis/shared'
import { DownloadsTabSkeleton, RecordingsTabSkeleton } from '@/components/dashboard/skeletons'
import type { CardSortResultsData } from './types'
import type { StatusFilter } from '@/components/analysis/card-sort/participants/participants-tab-container'
import type { TestDisplaySettings, CardSortDisplaySettings } from '@veritio/analysis-shared'
import type { ExtendedCardSortSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

// Lazy load heavy tabs with skeleton fallbacks
const DownloadsTab = dynamic(
  () => import('@/components/analysis/card-sort/downloads-tab').then(m => ({ default: m.DownloadsTab })),
  { ssr: false, loading: () => <DownloadsTabSkeleton /> }
)
const RecordingsTab = dynamic(
  () => import('@/components/analysis/recordings').then(m => ({ default: m.RecordingsTab })),
  { ssr: false, loading: () => <RecordingsTabSkeleton /> }
)

export interface CardSortResultsContentProps {
  results: CardSortResultsData
  projectId: string
  projectName: string
  studyId: string
  hasResponses: boolean
  onEndStudy: () => Promise<void>
  initialExcludedIds?: string[]
}

export function CardSortResultsContent({
  results,
  projectId,
  projectName,
  studyId,
  hasResponses,
  onEndStudy,
  initialExcludedIds,
}: CardSortResultsContentProps) {
  // Transform snake_case standardizations to camelCase for AnalysisTab
  const transformedStandardizations = useMemo(() => {
    return (results.standardizations || []).map((s) => ({
      standardizedName: s.standardized_name,
      originalNames: s.original_names,
      agreementScore: s.agreement_score ?? 0,
    }))
  }, [results.standardizations])

  // Live standardizations state — updated when user saves from Categories tab
  const [liveStandardizations, setLiveStandardizations] = useState(transformedStandardizations)

  const handleStandardizationsSaved = useCallback((saved: typeof transformedStandardizations) => {
    setLiveStandardizations(saved)
  }, [])

  // Extract display settings from study settings
  const testSettings = useMemo<TestDisplaySettings | null>(() => {
    const settings = results.study.settings as unknown as ExtendedCardSortSettings | null
    if (!settings || !settings.mode) return null

    return {
      type: 'card_sort',
      settings: {
        mode: settings.mode,
        randomizeCards: settings.randomizeCards,
        showProgress: settings.showProgress,
        allowSkip: settings.allowSkip,
      } as CardSortDisplaySettings,
    }
  }, [results.study.settings])

  // Extract participant display settings from study flow
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = results.study.settings as unknown as (ExtendedCardSortSettings & { studyFlow?: StudyFlowSettings }) | null
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
    (results.flowResponses || []).filter(r => !excludedIds.has(r.participant_id)),
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
      studyType="card_sort"
      studyStatus={results.study.status}
      shareCode={results.study.share_code}
      studyDescription={results.study.description}
      createdAt={results.study.created_at}
      launchedAt={results.study.launched_at}
      studyMode={results.study.settings?.mode}
      testSettings={testSettings}
      hasResponses={hasResponses}
      onEndStudy={onEndStudy}
      flowQuestions={results.flowQuestions}
      flowResponses={filteredFlowResponses}
      participants={filteredParticipants}
      defaultAnalysisSubTab="cards"
      renderOverviewContent={() => (
        <CardSortResultsOverview
          stats={filteredStats}
          responses={filteredResponses}
          participants={filteredParticipants}
          cards={results.cards}
          standardizations={liveStandardizations}
        />
      )}
      renderParticipantsContent={({ initialTab, onTabChange, statusFilter, onStatusFilterChange }) => (
        <ParticipantsTabContainer
          studyId={studyId}
          responses={results.responses}
          participants={results.participants}
          cards={results.cards}
          flowQuestions={results.flowQuestions}
          flowResponses={results.flowResponses || []}
          studyMode={results.study.settings?.mode || 'open'}
          initialTab={initialTab}
          onTabChange={onTabChange}
          statusFilter={statusFilter as StatusFilter}
          onStatusFilterChange={onStatusFilterChange}
          displaySettings={participantDisplaySettings}
        />
      )}
      renderAnalysisContent={({ onNavigateToSegments, initialSubTab, onSubTabChange }) => (
        <AnalysisTab
          studyId={studyId}
          cards={results.cards}
          categories={results.categories}
          responses={filteredResponses}
          participants={filteredParticipants}
          standardizations={transformedStandardizations}
          analysis={results.analysis}
          mode={results.study.settings?.mode || 'open'}
          onNavigateToSegments={onNavigateToSegments}
          initialSubTab={initialSubTab}
          onSubTabChange={onSubTabChange}
          onStandardizationsSaved={handleStandardizationsSaved}
        />
      )}
      renderDownloadsContent={() => (
        <div className="space-y-6">
          {/* <AiInsightsCard studyId={studyId} hasResponses={hasResponses} /> */}
          <SharingTab studyId={studyId} shareCode={results.study.share_code} studyStatus={results.study.status} />
          <DownloadsTab
            studyId={studyId}
            studyTitle={results.study.title}
            cards={results.cards}
            categories={results.categories}
            responses={filteredResponses.map((r) => ({
              participant_id: r.participant_id,
              card_placements: (r.card_placements || {}) as Record<string, string>,
              custom_categories: r.custom_categories as Array<{ id: string; label: string }> | null,
              total_time_ms: r.total_time_ms,
              created_at: r.created_at || '',
            }))}
            participants={filteredParticipants.map((p) => ({
              id: p.id,
              status: p.status || '',
              started_at: p.started_at || '',
              completed_at: p.completed_at,
            }))}
            similarityMatrix={results.analysis?.similarityMatrix?.matrix}
            categoryAgreement={results.analysis?.categoryAgreement}
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
