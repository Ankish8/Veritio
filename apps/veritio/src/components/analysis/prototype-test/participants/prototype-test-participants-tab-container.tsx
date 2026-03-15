'use client'

import { useMemo } from 'react'
import {
  ParticipantsTabContainerBase,
  prototypeTestStatusFilterConfig,
  type PrototypeTestStatusFilter,
} from '@/components/analysis/shared'
import { usePrototypeTestParticipants } from '@/hooks'
import { PrototypeTestParticipantsList } from './prototype-test-participants-list'
import { SegmentsList } from '../../card-sort/participants/segments-list'
import type {
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

// Re-export the status filter type for backward compatibility
export type StatusFilter = PrototypeTestStatusFilter

interface PrototypeTestParticipantsTabContainerProps {
  studyId: string
  /** Initial participants from server (used as fallback) */
  participants: Participant[]
  /** Initial tasks from server (used as fallback) */
  tasks: PrototypeTestTask[]
  /** Initial task attempts from server (used as fallback) */
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  initialTab?: 'list' | 'segments'
  onTabChange?: (tab: 'list' | 'segments') => void
  statusFilter?: StatusFilter
  onStatusFilterChange?: (filter: StatusFilter) => void
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
  /** Polling interval in milliseconds (default: 30000ms = 30 seconds, 0 to disable) */
  refreshInterval?: number
}

export function PrototypeTestParticipantsTabContainer({
  studyId,
  participants: initialParticipants,
  tasks: initialTasks,
  taskAttempts: initialTaskAttempts,
  flowQuestions: initialFlowQuestions = [],
  flowResponses: initialFlowResponses = [],
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
  refreshInterval = 2 * 60 * 1000, // 2 minutes
}: PrototypeTestParticipantsTabContainerProps) {
  const {
    participants,
    tasks,
    taskAttempts,
    flowQuestions,
    flowResponses,
  } = usePrototypeTestParticipants(studyId, {
    fallbackData: {
      participants: initialParticipants,
      tasks: initialTasks,
      taskAttempts: initialTaskAttempts,
      flowQuestions: initialFlowQuestions,
      flowResponses: initialFlowResponses,
    },
    refreshInterval,
    revalidateOnFocus: true,
  })

  const segmentListResponses = useMemo(
    () => taskAttempts.map(a => ({
      participant_id: a.participant_id,
      total_time_ms: a.total_time_ms,
    })),
    [taskAttempts]
  )

  return (
    <ParticipantsTabContainerBase<PrototypeTestStatusFilter>
      studyId={studyId}
      participants={participants}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      statusFilterConfig={prototypeTestStatusFilterConfig}
      segmentConfig={{ categoriesRange: { min: 0, max: 0 } }}
      segmentListResponses={segmentListResponses}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <PrototypeTestParticipantsList
          studyId={studyId}
          participants={participants}
          tasks={tasks}
          taskAttempts={taskAttempts}
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
