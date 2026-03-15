'use client'

import { useMemo } from 'react'
import {
  ParticipantsTabContainerBase,
  standardStatusFilterConfig,
  type StandardStatusFilter,
} from '@/components/analysis/shared'
import { useSurveyFlowResponses } from '@/hooks/use-survey-flow-responses'
import { SurveyParticipantsList } from './survey-participants-list'
import { SegmentsList } from '@/components/analysis/card-sort/participants'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

// Re-export the status filter type for backward compatibility
export type StatusFilter = StandardStatusFilter

interface SurveyParticipantsTabContainerProps {
  studyId: string
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  /** Initial sub-tab to show ('list' or 'segments') */
  initialTab?: 'list' | 'segments'
  /** Callback when sub-tab changes (for state persistence) */
  onTabChange?: (tab: 'list' | 'segments') => void
  /** Controlled status filter value */
  statusFilter?: StatusFilter
  /** Callback when status filter changes (for state persistence) */
  onStatusFilterChange?: (filter: StatusFilter) => void
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

/**
 * Container component for the Survey Participants tab with sub-tabs:
 * - Participants list: Table of all participants with filtering and actions
 * - Segments: Create and manage saved participant segments
 */
export function SurveyParticipantsTabContainer({
  studyId,
  participants,
  flowQuestions,
  flowResponses: initialFlowResponses,
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
}: SurveyParticipantsTabContainerProps) {
  // Lazy load flow responses if not provided (overview endpoints return empty array)
  const { flowResponses: lazyFlowResponses } = useSurveyFlowResponses(
    initialFlowResponses.length === 0 ? studyId : null // Only fetch if empty
  )
  const flowResponses = initialFlowResponses.length > 0 ? initialFlowResponses : lazyFlowResponses

  // Derive responses from participants (surveys don't have separate response records)
  const segmentListResponses = useMemo(
    () => participants.map(p => ({
      participant_id: p.id,
      total_time_ms: p.completed_at && p.started_at
        ? new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()
        : null
    })),
    [participants]
  )

  return (
    <ParticipantsTabContainerBase<StandardStatusFilter>
      studyId={studyId}
      participants={participants}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      statusFilterConfig={standardStatusFilterConfig}
      segmentConfig={{ categoriesRange: { min: 0, max: 0 } }}
      segmentListResponses={segmentListResponses}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <SurveyParticipantsList
          studyId={studyId}
          participants={participants}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          statusFilter={currentFilter as StatusFilter}
          displaySettings={displaySettings}
        />
      )}
      renderSegmentsList={() => (
        <SegmentsList
          studyId={studyId}
          participants={participants}
          responses={segmentListResponses}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
        />
      )}
    />
  )
}
