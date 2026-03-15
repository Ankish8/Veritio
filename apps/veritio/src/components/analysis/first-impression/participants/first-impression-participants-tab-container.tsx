'use client'

/**
 * FirstImpressionParticipantsTabContainer
 *
 * First Impression-specific wrapper around ParticipantsTabContainerBase.
 * Uses firstImpressionStatusFilterConfig (same as standard: Card Sort, Survey).
 * Derives segment list responses from sessions for time filtering.
 */

import { useMemo, useCallback } from 'react'
import {
  ParticipantsTabContainerBase,
  firstImpressionStatusFilterConfig,
  type FirstImpressionStatusFilter,
} from '@/components/analysis/shared'
import { FirstImpressionParticipants } from './participants-list'
import { SegmentsList } from '@/components/analysis/card-sort/participants'
import { useColumnVisibility } from './use-column-visibility'
import { ColumnCustomizationDropdown } from './column-customization-dropdown'
import { useStudyTags } from '@/hooks/use-response-tags'
import type { FirstImpressionResultsResponse } from '@/services/results/first-impression'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

// Re-export the status filter type for backward compatibility
export type StatusFilter = FirstImpressionStatusFilter

interface FirstImpressionParticipantsTabContainerProps {
  data: FirstImpressionResultsResponse
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
 * Container component for the First Impression Participants tab with sub-tabs:
 * - Participants list: Table of all participants with filtering and actions
 * - Segments: Create and manage saved participant segments
 */
export function FirstImpressionParticipantsTabContainer({
  data,
  flowQuestions,
  flowResponses,
  initialTab = 'list',
  onTabChange,
  statusFilter,
  onStatusFilterChange,
  displaySettings = null,
}: FirstImpressionParticipantsTabContainerProps) {
  const studyId = data.study.id
  const participants = data.participants

  // Fetch response tags for segment filtering
  const { tags } = useStudyTags(studyId)

  // Column visibility state (lifted up to render dropdown in header)
  const {
    visibleColumns,
    toggleColumn,
    resetToDefaults,
    isDefaultVisibility,
  } = useColumnVisibility(studyId)

  // Derive responses from sessions (for segment time filtering)
  // First Impression uses sessions for total time tracking
  const segmentListResponses = useMemo(
    () =>
      data.sessions.map((session) => ({
        participant_id: session.participant_id,
        total_time_ms: session.total_time_ms ?? null,
      })),
    [data.sessions]
  )

  // Convert tags to ResponseTagOption format for segment filtering
  const responseTags = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    [tags]
  )

  // Render the Columns dropdown for the header
  const renderHeaderControls = useCallback(
    () => (
      <ColumnCustomizationDropdown
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onResetToDefaults={resetToDefaults}
        isDefaultVisibility={isDefaultVisibility}
      />
    ),
    [visibleColumns, toggleColumn, resetToDefaults, isDefaultVisibility]
  )

  return (
    <ParticipantsTabContainerBase<FirstImpressionStatusFilter>
      studyId={studyId}
      participants={participants}
      flowQuestions={flowQuestions}
      flowResponses={flowResponses}
      initialTab={initialTab}
      onTabChange={onTabChange}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      statusFilterConfig={firstImpressionStatusFilterConfig}
      segmentConfig={{ categoriesRange: undefined }}
      segmentListResponses={segmentListResponses}
      renderHeaderControls={renderHeaderControls}
      renderParticipantsList={({ statusFilter: currentFilter }) => (
        <FirstImpressionParticipants
          data={data}
          statusFilter={currentFilter as StatusFilter}
          visibleColumns={visibleColumns}
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
          studyType="first_impression"
          designs={data.designs.map((d) => ({
            id: d.id,
            name: d.name || `Design ${(d.position ?? 0) + 1}`,
            position: d.position ?? 0,
          }))}
          responseTags={responseTags}
        />
      )}
    />
  )
}
