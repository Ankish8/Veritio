'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { useSegment } from '@/contexts/segment-context'
import { useParticipantDetailPanel } from '@/hooks'
import { useExcludedParticipants } from '@/hooks/analysis'
import {
  ParticipantsListBase,
  ParticipantDetailPanel,
  ParticipantStatusBadge,
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  type RowHandlers,
} from '@/components/analysis/shared'
import { TreeTestParticipantDetailContent } from './tree-test-participant-detail-content'
import { formatTime } from '@/lib/utils'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { Task, TreeNode, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'
import type { ExtendedParticipant } from './types'

type StatusFilter = 'all' | 'included' | 'completed' | 'abandoned' | 'in_progress' | 'excluded' | 'with_responses' | 'no_responses'

interface TreeTestParticipantsListProps {
  studyId: string
  participants: ExtendedParticipant[]
  responses: TreeTestResponse[]
  tasks: Task[]
  nodes: TreeNode[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  statusFilter: StatusFilter
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

export interface ParticipantSummary {
  participant: ExtendedParticipant
  responses: TreeTestResponse[]
  successCount: number
  directCount: number
  totalTime: number
  participantIndex: number
  isExcluded: boolean
  identifier: string | null
  demographics: ParticipantDemographicData | null
  urlTags: Record<string, string> | null
  flowResponses: StudyFlowResponseRow[]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Tree Test participants list using shared ParticipantsListBase for common infrastructure.
 * Uses FloatingActionBar for sidebar panel display.
 */
export function TreeTestParticipantsList({
  studyId,
  participants,
  responses,
  tasks,
  nodes,
  flowQuestions = [],
  flowResponses = [],
  statusFilter,
  displaySettings = null,
}: TreeTestParticipantsListProps) {
  const { excludedIds: excludedParticipantIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(studyId)
  const { filteredParticipantIds } = useSegment()

  // Build lookup maps
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // Group flow responses by participant
  const flowResponsesByParticipant = useMemo(() => {
    const map = new Map<string, StudyFlowResponseRow[]>()
    for (const response of flowResponses) {
      const existing = map.get(response.participant_id) || []
      existing.push(response)
      map.set(response.participant_id, existing)
    }
    return map
  }, [flowResponses])

  // Group responses by participant and compute summaries
  const participantSummaries: ParticipantSummary[] = useMemo(() => {
    return participants.map((participant, index) => {
      const participantResponses = responses.filter(
        (r) => r.participant_id === participant.id
      )
      const successCount = participantResponses.filter((r) => r.is_correct).length
      const directCount = participantResponses.filter((r) => r.is_direct).length
      const totalTime = participantResponses.reduce(
        (sum, r) => sum + (r.total_time_ms || 0),
        0
      )

      // Extract demographics from participant metadata (handles nested and legacy formats)
      const demographics = extractDemographicsFromMetadata(participant.metadata)

      const urlTags = parseUrlTags(participant.url_tags)

      // Get flow responses for this participant
      const participantFlowResponses = flowResponsesByParticipant.get(participant.id) || []

      return {
        participant,
        responses: participantResponses,
        successCount,
        directCount,
        totalTime,
        participantIndex: index + 1,
        isExcluded: excludedParticipantIds.has(participant.id),
        identifier: participant.identifier_value || null,
        demographics,
        urlTags,
        flowResponses: participantFlowResponses,
      }
    })
  }, [participants, responses, excludedParticipantIds, flowResponsesByParticipant])

  // Filter by status and segment
  const filteredSummaries = useMemo(() => {
    let filtered = participantSummaries

    // Apply status filter
    if (statusFilter === 'included') {
      filtered = filtered.filter((s) => !s.isExcluded)
    } else if (statusFilter === 'excluded') {
      filtered = filtered.filter((s) => s.isExcluded)
    } else if (statusFilter === 'with_responses') {
      filtered = filtered.filter((s) => s.responses.length > 0 && !s.isExcluded)
    } else if (statusFilter === 'no_responses') {
      filtered = filtered.filter((s) => s.responses.length === 0 && !s.isExcluded)
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.participant.status === statusFilter && !s.isExcluded)
    }

    // Apply segment filter
    if (filteredParticipantIds) {
      filtered = filtered.filter((s) => filteredParticipantIds.has(s.participant.id))
    }

    // Sort by completion time (most recent first)
    return filtered.sort((a, b) => {
      const aTime = a.participant.completed_at || a.participant.started_at || ''
      const bTime = b.participant.completed_at || b.participant.started_at || ''
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [participantSummaries, statusFilter, filteredParticipantIds])

  // Render column headers using shared GridHeaderCell
  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>Participant</GridHeaderCell>
      <GridHeaderCell align="center">Status</GridHeaderCell>
      <GridHeaderCell align="center">Time Taken</GridHeaderCell>
      <GridHeaderCell align="center">Tasks Correct</GridHeaderCell>
      <GridHeaderCell align="center">Direct</GridHeaderCell>
      <GridHeaderCell align="center">Completed</GridHeaderCell>
    </>
  ), [])

  // Render a single row using shared grid components
  const renderRow = useCallback((summary: ParticipantSummary, _index: number, handlers: RowHandlers) => {
    // Resolve participant display based on settings
    const display = resolveParticipantDisplay(displaySettings, {
      index: summary.participantIndex,
      demographics: summary.demographics,
    })

    return (
      <GridRow
        key={summary.participant.id}
        onClick={handlers.onClick}
        isExcluded={summary.isExcluded}
        isSelected={handlers.isSelected}
      >
        <GridCheckboxCell
          checked={handlers.isSelected}
          onCheckedChange={handlers.onToggleSelect}
        />
        <GridCell>
          <div className="flex flex-col">
            <span className="font-medium">
              <span className="border-b border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-colors cursor-pointer">
                {display.primary}
              </span>
              {summary.isExcluded && <Badge variant="secondary" className="ml-2 text-xs">Excluded</Badge>}
            </span>
            {display.secondary && (
              <span className="text-sm text-muted-foreground">{display.secondary}</span>
            )}
          </div>
        </GridCell>
      <GridCell align="center">
        <ParticipantStatusBadge status={summary.participant.status || 'abandoned'} />
      </GridCell>
      <GridCell align="center">{formatTime(summary.totalTime)}</GridCell>
      <GridCell align="center">
        <span className={summary.successCount === tasks.length ? 'text-green-600 font-medium' : ''}>
          {summary.successCount} / {tasks.length}
        </span>
      </GridCell>
      <GridCell align="center">
        <span className={summary.directCount === tasks.length ? 'text-green-600 font-medium' : ''}>
          {summary.directCount} / {tasks.length}
        </span>
      </GridCell>
      <GridCell align="center">
        {summary.participant.completed_at
          ? formatDate(summary.participant.completed_at)
          : '—'}
      </GridCell>
    </GridRow>
    )
  }, [tasks.length, displaySettings])

  // Panel management via shared hook
  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<ParticipantSummary>()

  // Render panel content when selected participant changes
  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    // Calculate stats for the panel
    const startedAt = new Date(row.participant.started_at || new Date())
    const completedAt = row.participant.completed_at ? new Date(row.participant.completed_at) : null

    // Questions answered = flow responses count
    const questionsAnswered = row.flowResponses.length
    const questionsTotal = flowQuestions.length

    // Combined close handler - closes panel and notifies ParticipantsListBase
    const handleClose = () => {
      closePanel()
      handlers.onClose()
    }

    setPanelContent(
      <ParticipantDetailPanel
        participantIndex={row.participantIndex}
        identifier={row.identifier}
        participantId={row.participant.id}
        stats={{
          questionsAnswered,
          questionsTotal,
          completionPercent: questionsTotal > 0 ? Math.round((questionsAnswered / questionsTotal) * 100) : 100,
          timeTakenMs: row.totalTime,
          status: row.participant.status || 'unknown',
          startedAt,
          completedAt,
        }}
        demographics={row.demographics}
        urlTags={row.urlTags}
        isExcluded={row.isExcluded}
        onClose={handleClose}
        onNavigate={handlers.onNavigate}
        canNavigatePrev={handlers.canNavigatePrev}
        canNavigateNext={handlers.canNavigateNext}
        onToggleExclude={(exclude) => handlers.onToggleExclude?.(row.participant.id, exclude)}
      >
        <TreeTestParticipantDetailContent
          studyId={studyId}
          successCount={row.successCount}
          directCount={row.directCount}
          totalTime={row.totalTime}
          totalTasks={tasks.length}
          responses={row.responses}
          tasks={tasks}
          taskMap={taskMap}
          nodeMap={nodeMap}
          flowResponses={row.flowResponses}
          flowQuestions={flowQuestions}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, tasks, taskMap, nodeMap, flowQuestions, setPanelContent, closePanel, studyId])

  // Column widths for proper alignment between header and virtualized body
  // Order: checkbox, participant, status, time, tasks correct, direct, completed
  const columnWidths = ['5%', '22%', '14%', '14%', '15%', '15%', '15%']

  return (
    <ParticipantsListBase<ParticipantSummary>
      items={filteredSummaries}
      getParticipantId={(item) => item.participant.id}
      isExcluded={(item) => item.isExcluded}
      onExclusionChange={toggleExclude}
      onBulkExclusionChange={bulkToggleExclude}
      renderColumns={renderColumns}
      renderRow={renderRow}
      renderDetailDialog={renderDetailDialog}
      columnWidths={columnWidths}
      paginationLabel="participants"
    />
  )
}
