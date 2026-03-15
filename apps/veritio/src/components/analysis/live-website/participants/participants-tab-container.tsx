'use client'

import { useMemo } from 'react'
import {
  ParticipantsTabContainerBase,
  liveWebsiteStatusFilterConfig,
  type LiveWebsiteStatusFilter,
} from '@/components/analysis/shared'
import { LiveWebsiteParticipantsList } from './participants-list'
import { SegmentsList } from '../../card-sort/participants/segments-list'
import type {
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsitePostTaskResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

export type StatusFilter = LiveWebsiteStatusFilter

interface LiveWebsiteParticipantsTabContainerProps {
  studyId: string
  participants: Participant[]
  allParticipants?: Participant[]
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  postTaskResponses?: LiveWebsitePostTaskResponse[]
  events?: LiveWebsiteEvent[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  initialTab?: 'list' | 'segments'
  onTabChange?: (tab: 'list' | 'segments') => void
  statusFilter?: StatusFilter
  onStatusFilterChange?: (filter: StatusFilter) => void
  displaySettings?: ParticipantDisplaySettings | null
  abVariants?: Array<{ id: string; name: string }>
  participantVariants?: Array<{ participant_id: string; variant_id: string }>
  selectedVariantId?: string | null
  readOnly?: boolean
}

export function LiveWebsiteParticipantsTabContainer({
  studyId,
  participants,
  allParticipants,
  tasks,
  responses,
  postTaskResponses = [],
  events = [],
  flowQuestions = [],
  flowResponses = [],
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
  abVariants,
  participantVariants,
  selectedVariantId,
  readOnly,
}: LiveWebsiteParticipantsTabContainerProps) {
  const segmentListResponses = useMemo(() => {
    const timeMap = new Map<string, number>()
    for (const r of responses) {
      timeMap.set(r.participant_id, (timeMap.get(r.participant_id) || 0) + (r.duration_ms || 0))
    }
    return participants.map(p => ({
      participant_id: p.id,
      total_time_ms: timeMap.get(p.id) || 0,
    }))
  }, [participants, responses])

  return (
    <ParticipantsTabContainerBase<LiveWebsiteStatusFilter>
      studyId={studyId}
      participants={participants}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      statusFilterConfig={liveWebsiteStatusFilterConfig}
      segmentConfig={{ categoriesRange: { min: 0, max: 0 } }}
      segmentListResponses={segmentListResponses}
      readOnly={readOnly}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <LiveWebsiteParticipantsList
          studyId={studyId}
          participants={participants}
          allParticipants={allParticipants}
          tasks={tasks}
          responses={responses}
          postTaskResponses={postTaskResponses}
          events={events}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          statusFilter={currentFilter as StatusFilter}
          displaySettings={displaySettings}
          abVariants={abVariants}
          participantVariants={participantVariants}
          selectedVariantId={selectedVariantId}
          readOnly={readOnly}
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
