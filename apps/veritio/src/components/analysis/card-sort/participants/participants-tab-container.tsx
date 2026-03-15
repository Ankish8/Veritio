'use client'

import { useSegment } from '@/contexts/segment-context'
import {
  ParticipantsTabContainerBase,
  standardStatusFilterConfig,
  type StandardStatusFilter,
} from '@/components/analysis/shared'
import { ParticipantsList } from './participants-list'
import { SegmentsList } from './segments-list'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { StatusFilter, ResponseData } from './types'

export type { StatusFilter, ResponseData } from './types'

interface ParticipantsTabContainerProps {
  studyId: string
  participants: Participant[]
  responses: ResponseData[]
  cards: Array<{ id: string; label: string }>
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  studyMode?: 'open' | 'closed' | 'hybrid'
  initialTab?: 'list' | 'segments'
  onTabChange?: (tab: 'list' | 'segments') => void
  statusFilter?: StatusFilter
  onStatusFilterChange?: (filter: StatusFilter) => void
  displaySettings?: ParticipantDisplaySettings | null
}

export function ParticipantsTabContainer({
  studyId,
  participants,
  responses,
  cards,
  flowQuestions = [],
  flowResponses = [],
  studyMode = 'open',
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
}: ParticipantsTabContainerProps) {
  const { categoriesRange } = useSegment()

  return (
    <ParticipantsTabContainerBase<StandardStatusFilter>
      studyId={studyId}
      participants={participants}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter as StandardStatusFilter | undefined}
      onStatusFilterChange={onStatusFilterChange as ((filter: StandardStatusFilter) => void) | undefined}
      statusFilterConfig={standardStatusFilterConfig}
      segmentConfig={{ categoriesRange }}
      segmentListResponses={responses}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <ParticipantsList
          studyId={studyId}
          participants={participants}
          responses={responses}
          cards={cards}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          studyMode={studyMode}
          statusFilter={currentFilter as StatusFilter}
          displaySettings={displaySettings}
        />
      )}
      renderSegmentsList={() => (
        <SegmentsList
          studyId={studyId}
          participants={participants}
          responses={responses}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
        />
      )}
    />
  )
}
