'use client'

import { useMemo } from 'react'
import {
  ParticipantsTabContainerBase,
  treeTestStatusFilterConfig,
  type TreeTestStatusFilter,
} from '@/components/analysis/shared'
import { TreeTestParticipantsList } from './tree-test-participants-list'
import { SegmentsList } from '../../card-sort/participants/segments-list'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { Task, TreeNode, StudyFlowQuestionRow, StudyFlowResponseRow, Participant as FullParticipant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { ExtendedParticipant } from './types'

// Re-export the status filter type for backward compatibility
export type StatusFilter = TreeTestStatusFilter

interface TreeTestParticipantsTabContainerProps {
  studyId: string
  participants: ExtendedParticipant[]
  responses: TreeTestResponse[]
  tasks: Task[]
  nodes: TreeNode[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
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
 * Container component for the Tree Test Participants tab with sub-tabs:
 * - Participants list: Table of all participants with filtering and actions
 * - Segments: Create and manage saved participant segments
 */
export function TreeTestParticipantsTabContainer({
  studyId,
  participants,
  responses,
  tasks,
  nodes,
  flowQuestions = [],
  flowResponses = [],
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
}: TreeTestParticipantsTabContainerProps) {
  // Build set of participants with responses for activity-based filtering
  const participantsWithResponses = useMemo(
    () => new Set(responses.map(r => r.participant_id)),
    [responses]
  )

  // Convert tree test responses to format expected by SegmentsList
  const segmentListResponses = useMemo(
    () => responses.map(r => ({
      participant_id: r.participant_id,
      total_time_ms: r.total_time_ms,
    })),
    [responses]
  )

  return (
    <ParticipantsTabContainerBase<TreeTestStatusFilter>
      studyId={studyId}
      participants={participants as unknown as FullParticipant[]}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      statusFilterConfig={treeTestStatusFilterConfig}
      statusFilterExtraData={{ participantsWithResponses }}
      segmentConfig={{ categoriesRange: { min: 0, max: 0 } }} // Tree tests don't have categories
      segmentListResponses={segmentListResponses}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <TreeTestParticipantsList
          studyId={studyId}
          participants={participants}
          responses={responses}
          tasks={tasks}
          nodes={nodes}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
          statusFilter={currentFilter as StatusFilter}
          displaySettings={displaySettings}
        />
      )}
      renderSegmentsList={() => (
        <SegmentsList
          studyId={studyId}
          participants={participants as unknown as FullParticipant[]}
          responses={segmentListResponses}
          flowQuestions={flowQuestions}
          flowResponses={flowResponses}
        />
      )}
    />
  )
}
