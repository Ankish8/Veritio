'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  ParticipantsListBase,
  ParticipantDetailPanel,
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  type RowHandlers,
} from '@/components/analysis/shared'
import { useParticipantDetailPanel } from '@/hooks'
import { useExcludedParticipants } from '@/hooks/analysis'
import { ParticipantDetailContent } from './participant-detail-content'
import { useSegment } from '@/contexts/segment-context'
import { formatTime } from '@/lib/utils'
import { createParticipantNumberMap } from '@/lib/utils/participant-utils'
import { calculateParticipantMetrics } from '@/lib/utils/participant-metrics'
import type {
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/study-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { StatusFilter } from './prototype-test-participants-tab-container'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'

interface PrototypeTestParticipantsListProps {
  studyId: string
  participants: Participant[]
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  statusFilter: StatusFilter
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

interface ParticipantRowData {
  participant: Participant
  participantNumber: number
  status: string
  totalTimeMs: number
  questionsAnswered: number
  totalQuestions: number
  tasksCompleted: number
  tasksSkipped: number
  tasksSuccessful: number
  totalTasks: number
  // Behavioral metrics for usability analysis
  totalClicks: number
  totalMisclicks: number
  totalBacktracks: number
  isExcluded: boolean
  attempts: PrototypeTestTaskAttempt[]
  flowResponses: StudyFlowResponseRow[]
  demographics: ParticipantDemographicData | null
  urlTags: Record<string, string> | null
  identifier: string | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
    case 'abandoned':
      return <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-100">Abandoned</Badge>
    case 'in_progress':
      return <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function PrototypeTestParticipantsList({
  studyId,
  participants,
  tasks,
  taskAttempts,
  flowQuestions = [],
  flowResponses = [],
  statusFilter,
  displaySettings = null,
}: PrototypeTestParticipantsListProps) {
  const { excludedIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(studyId)
  const { filteredParticipantIds } = useSegment()

  const participantNumberMap = useMemo(() => createParticipantNumberMap(participants), [participants])

  const rowData = useMemo<ParticipantRowData[]>(() => {
    const totalTasks = tasks.length

    const responsesByParticipant = new Map<string, StudyFlowResponseRow[]>()
    for (const response of flowResponses) {
      const existing = responsesByParticipant.get(response.participant_id) || []
      existing.push(response)
      responsesByParticipant.set(response.participant_id, existing)
    }

    return participants.map((participant) => {
      const participantNumber = participantNumberMap.get(participant.id) || 0
      const attempts = taskAttempts.filter(a => a.participant_id === participant.id)
      const participantFlowResponses = responsesByParticipant.get(participant.id) || []

      const metrics = calculateParticipantMetrics(attempts, participantFlowResponses, flowQuestions, tasks)

      const demographics = extractDemographicsFromMetadata(participant.metadata)
      const urlTags = parseUrlTags(participant.url_tags)

      return {
        participant,
        participantNumber,
        status: participant.status || 'unknown',
        totalTimeMs: metrics.totalTimeMs,
        questionsAnswered: metrics.questionsAnswered,
        totalQuestions: metrics.totalQuestions,
        tasksCompleted: metrics.tasksCompleted,
        tasksSkipped: metrics.tasksSkipped,
        tasksSuccessful: metrics.tasksSuccessful,
        totalTasks,
        totalClicks: metrics.totalClicks,
        totalMisclicks: metrics.totalMisclicks,
        totalBacktracks: metrics.totalBacktracks,
        isExcluded: excludedIds.has(participant.id),
        attempts,
        flowResponses: participantFlowResponses,
        demographics,
        urlTags,
        identifier: participant.identifier_value || null,
      }
    })
  }, [participants, tasks, taskAttempts, flowQuestions, flowResponses, excludedIds, participantNumberMap])

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'included') return rowData.filter(row => !row.isExcluded)
    if (statusFilter === 'excluded') return rowData.filter(row => row.isExcluded)
    if (statusFilter === 'all') return rowData
    return rowData.filter(row => row.status === statusFilter && !row.isExcluded)
  }, [rowData, statusFilter])

  const filteredRows = useMemo(() => {
    if (!filteredParticipantIds) return filteredByStatus
    return filteredByStatus.filter(row => filteredParticipantIds.has(row.participant.id))
  }, [filteredByStatus, filteredParticipantIds])

  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>Participant</GridHeaderCell>
      <GridHeaderCell align="center">Status</GridHeaderCell>
      <GridHeaderCell align="center">Time</GridHeaderCell>
      <GridHeaderCell align="center">Clicks</GridHeaderCell>
      <GridHeaderCell align="center">Misclicks</GridHeaderCell>
      <GridHeaderCell align="center">Backtracks</GridHeaderCell>
      <GridHeaderCell align="center">Tasks</GridHeaderCell>
    </>
  ), [])

  const renderRow = useCallback((row: ParticipantRowData, _index: number, handlers: RowHandlers) => {
    const successPercent = row.totalTasks > 0
      ? ((row.tasksSuccessful / row.totalTasks) * 100).toFixed(0)
      : '0'

    const display = resolveParticipantDisplay(displaySettings, {
      index: row.participantNumber,
      demographics: row.demographics,
    })

    const isAllSuccessful = row.tasksSuccessful === row.totalTasks && row.totalTasks > 0
    const hasSkipped = row.tasksSkipped > 0
    const hasMisclicks = row.totalMisclicks > 0
    const hasBacktracks = row.totalBacktracks > 0

    return (
      <GridRow
        key={row.participant.id}
        onClick={handlers.onClick}
        isExcluded={row.isExcluded}
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
              {row.isExcluded && <Badge variant="secondary" className="ml-2 text-xs">Excluded</Badge>}
            </span>
            {display.secondary && (
              <span className="text-sm text-muted-foreground">{display.secondary}</span>
            )}
          </div>
        </GridCell>
        <GridCell align="center">
          {getStatusBadge(row.status)}
        </GridCell>
        <GridCell align="center">
          {formatTime(row.totalTimeMs)}
        </GridCell>
        <GridCell align="center">
          {row.totalClicks}
        </GridCell>
        <GridCell align="center">
          <span className={hasMisclicks ? 'text-amber-600' : ''}>
            {row.totalMisclicks}
          </span>
        </GridCell>
        <GridCell align="center">
          <span className={hasBacktracks ? 'text-amber-600' : ''}>
            {row.totalBacktracks}
          </span>
        </GridCell>
        <GridCell align="center">
          <span className={isAllSuccessful ? 'text-green-600 font-medium' : hasSkipped ? 'text-amber-600' : ''}>
            {row.tasksSuccessful}/{row.totalTasks} ({successPercent}%)
          </span>
        </GridCell>
      </GridRow>
    )
  }, [displaySettings])

  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<ParticipantRowData>()

  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    const startedAt = new Date(row.participant.started_at || new Date())
    const completedAt = row.participant.completed_at ? new Date(row.participant.completed_at) : null

    const metrics = calculateParticipantMetrics(row.attempts, row.flowResponses, flowQuestions, tasks)

    const metadata = row.participant.metadata as { browserData?: {
      browser?: string
      operatingSystem?: string
      deviceType?: 'Desktop' | 'Mobile' | 'Tablet'
      language?: string
      timeZone?: string
      screenResolution?: string
    } } | null
    const browserData = metadata?.browserData || null

    const location = {
      country: row.participant.country,
      region: row.participant.region,
      city: row.participant.city,
    }

    const handleClose = () => {
      closePanel()
      handlers.onClose()
    }

    setPanelContent(
      <ParticipantDetailPanel
        participantIndex={row.participantNumber}
        identifier={row.identifier}
        participantId={row.participant.id}
        stats={{
          questionsAnswered: row.questionsAnswered,
          questionsTotal: row.totalQuestions,
          completionPercent: row.totalQuestions > 0 ? Math.round((row.questionsAnswered / row.totalQuestions) * 100) : 0,
          timeTakenMs: row.totalTimeMs,
          status: row.status,
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
        hideDefaultStats={true}
      >
        <ParticipantDetailContent
          tasksSuccessful={row.tasksSuccessful}
          tasksSkipped={row.tasksSkipped}
          totalTasks={row.totalTasks}
          totalTimeMs={row.totalTimeMs}
          avgClicks={metrics.avgClicks}
          totalMisclicks={row.totalMisclicks}
          totalBacktracks={row.totalBacktracks}
          directPathCount={metrics.directPathCount}
          avgTimeToFirstClick={metrics.avgTimeToFirstClick}
          attempts={row.attempts}
          tasks={tasks}
          flowResponses={row.flowResponses}
          flowQuestions={flowQuestions}
          browserData={browserData}
          location={location}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, tasks, flowQuestions, setPanelContent, closePanel])

  const columnWidths = ['4%', '22%', '12%', '10%', '10%', '12%', '12%', '18%']

  return (
    <ParticipantsListBase
      items={filteredRows}
      getParticipantId={(row) => row.participant.id}
      isExcluded={(row) => row.isExcluded}
      onExclusionChange={toggleExclude}
      onBulkExclusionChange={bulkToggleExclude}
      renderColumns={renderColumns}
      renderRow={renderRow}
      renderDetailDialog={renderDetailDialog}
      columnWidths={columnWidths}
      emptyTitle="No participants yet"
      emptyDescription="Participants will appear here once they start your prototype test."
      noMatchMessage="No participants match the current filters."
      paginationLabel="participants"
    />
  )
}
