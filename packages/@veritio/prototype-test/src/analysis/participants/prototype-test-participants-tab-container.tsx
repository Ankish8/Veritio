'use client'
import { useMemo } from 'react'
import {
  ParticipantsTabContainerBase,
  prototypeTestStatusFilterConfig,
  type PrototypeTestStatusFilter,
} from '@veritio/analysis-shared'
import { usePrototypeTestParticipants } from '@veritio/prototype-test/hooks'
import { PrototypeTestParticipantsList } from './prototype-test-participants-list'
import { SegmentsList } from '../../card-sort/participants/segments-list'
import type {
  Participant,
  StudyFlowQuestion,
  StudyFlowResponse,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Re-export the status filter type for backward compatibility
export type StatusFilter = PrototypeTestStatusFilter

interface PrototypeTestParticipantsTabContainerProps {
  studyId: string
  participants: Participant[]
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions?: StudyFlowQuestion[]
  flowResponses?: StudyFlowResponse[]
  initialTab?: 'list' | 'segments'
  onTabChange?: (tab: 'list' | 'segments') => void
  statusFilter?: StatusFilter
  onStatusFilterChange?: (filter: StatusFilter) => void
  displaySettings?: ParticipantDisplaySettings | null
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
  refreshInterval = 30000, // Default: poll every 30 seconds
}: PrototypeTestParticipantsTabContainerProps) {
  // Use SWR hook with polling for real-time updates
  // Server data is used as fallback for instant first render
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

  // Convert task attempts to responses format for SegmentsList
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
