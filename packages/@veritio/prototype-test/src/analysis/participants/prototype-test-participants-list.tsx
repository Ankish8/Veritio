'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Badge } from '@veritio/ui/components/badge'
import {
  ParticipantsListBase,
  ParticipantDetailPanel,
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  type RowHandlers,
} from '@veritio/analysis-shared'
import { useParticipantDetailPanel, useAuthFetch } from '@veritio/prototype-test/hooks'
import { ParticipantDetailContent } from './participant-detail-content'
import { useSegment } from '../../contexts/segment-context'
import { formatTime } from '@veritio/ui'
import { createParticipantNumberMap } from '@veritio/prototype-test/lib/utils/participant-utils'
import type {
  Participant,
  StudyFlowQuestion,
  StudyFlowResponse,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { PrototypeTestStatusFilter } from '@veritio/analysis-shared'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@veritio/prototype-test/lib/utils/participant-display'

// Re-use the status filter type from analysis-shared
type StatusFilter = PrototypeTestStatusFilter

interface PrototypeTestParticipantsListProps {
  studyId: string
  participants: Participant[]
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions?: StudyFlowQuestion[]
  flowResponses?: StudyFlowResponse[]
  statusFilter: StatusFilter
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
  flowResponses: StudyFlowResponse[]
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
  const authFetch = useAuthFetch()
  const { filteredParticipantIds } = useSegment()
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  // Create participant number mapping for consistent numbering across all tabs
  const participantNumberMap = useMemo(() => {
    return createParticipantNumberMap(participants)
  }, [participants])

  // Compute row data for each participant
  const rowData = useMemo<ParticipantRowData[]>(() => {
    const totalTasks = tasks.length

    // Count flow questions
    const totalFlowQuestions = flowQuestions.length

    // Group flow responses by participant
    const responsesByParticipant = new Map<string, StudyFlowResponse[]>()
    for (const response of flowResponses) {
      const existing = responsesByParticipant.get(response.participant_id) || []
      existing.push(response)
      responsesByParticipant.set(response.participant_id, existing)
    }

    return participants.map((participant) => {
      // Get participant number from the global mapping
      const participantNumber = participantNumberMap.get(participant.id) || 0

      // Get task attempts for this participant
      const attempts = taskAttempts.filter(a => a.participant_id === participant.id)

      // Count task outcomes
      const tasksCompleted = attempts.filter(
        a => a.outcome === 'success' || a.outcome === 'failure'
      ).length
      const tasksSkipped = attempts.filter(a => a.outcome === 'skipped').length
      const tasksSuccessful = attempts.filter(a => a.outcome === 'success').length

      // Calculate total time
      const totalTimeMs = attempts.reduce(
        (sum, a) => sum + (a.total_time_ms || 0),
        0
      )

      // Calculate behavioral metrics (sum across all task attempts)
      const totalClicks = attempts.reduce(
        (sum, a) => sum + (a.click_count || 0),
        0
      )
      const totalMisclicks = attempts.reduce(
        (sum, a) => sum + (a.misclick_count || 0),
        0
      )
      const totalBacktracks = attempts.reduce(
        (sum, a) => sum + (a.backtrack_count || 0),
        0
      )

      // Get flow responses for this participant
      const participantFlowResponses = responsesByParticipant.get(participant.id) || []
      const flowResponseCount = participantFlowResponses.length

      // Count post-task question responses (from task attempts)
      const postTaskResponseCount = attempts.reduce((sum, a) => {
        const responses = a.post_task_responses as unknown[] | null
        return sum + (Array.isArray(responses) ? responses.length : 0)
      }, 0)

      // Total questions = flow questions + post-task questions per task
      const totalPostTaskQuestions = tasks.reduce((sum, t) => {
        const questions = t.post_task_questions as unknown[] | null
        return sum + (Array.isArray(questions) ? questions.length : 0)
      }, 0)
      const totalQuestions = totalFlowQuestions + totalPostTaskQuestions

      // Extract demographics from participant metadata (handles nested and legacy formats)
      const demographics = extractDemographicsFromMetadata(participant.metadata)

      // Extract URL tags
      const rawUrlTags = participant.url_tags
      const urlTags = rawUrlTags && typeof rawUrlTags === 'object' && !Array.isArray(rawUrlTags)
        ? rawUrlTags as Record<string, string>
        : null

      return {
        participant,
        participantNumber,
        status: participant.status || 'unknown',
        totalTimeMs,
        questionsAnswered: flowResponseCount + postTaskResponseCount,
        totalQuestions,
        tasksCompleted,
        tasksSkipped,
        tasksSuccessful,
        totalTasks,
        totalClicks,
        totalMisclicks,
        totalBacktracks,
        isExcluded: excludedIds.has(participant.id),
        attempts,
        flowResponses: participantFlowResponses,
        demographics,
        urlTags,
        identifier: participant.identifier_value || null,
      }
    })
  }, [participants, tasks, taskAttempts, flowQuestions, flowResponses, excludedIds, participantNumberMap])

  // Apply status filter
  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return rowData
    return rowData.filter(row => row.status === statusFilter)
  }, [rowData, statusFilter])

  // Apply segment filter
  const filteredRows = useMemo(() => {
    if (!filteredParticipantIds) return filteredByStatus
    return filteredByStatus.filter(row => filteredParticipantIds.has(row.participant.id))
  }, [filteredByStatus, filteredParticipantIds])

  // Handle exclusion toggle
  const handleExclusionChange = useCallback(async (participantId: string, exclude: boolean) => {
    // Optimistic update
    setExcludedIds(prev => {
      const next = new Set(prev)
      if (exclude) {
        next.add(participantId)
      } else {
        next.delete(participantId)
      }
      return next
    })

    // API call
    try {
      await authFetch(`/api/studies/${studyId}/participants/${participantId}/toggle-exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude }),
      })
    } catch (error) {
      // Revert on error
      setExcludedIds(prev => {
        const next = new Set(prev)
        if (exclude) {
          next.delete(participantId)
        } else {
          next.add(participantId)
        }
        return next
      })
    }
  }, [authFetch, studyId])

  // Render columns using shared GridHeaderCell
  // Column sequence tells a story: Who → Finished? → Performance metrics → Outcome
  // Time: How long did it take?
  // Clicks: Navigation efficiency
  // Misclicks: Confusion/frustration indicators
  // Backtracks: Lost navigation indicators
  // Tasks: Final success outcome
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

  // Render a single row using shared grid components
  const renderRow = useCallback((row: ParticipantRowData, _index: number, handlers: RowHandlers) => {
    const successPercent = row.totalTasks > 0
      ? ((row.tasksSuccessful / row.totalTasks) * 100).toFixed(0)
      : '0'

    // Resolve participant display based on settings
    const display = resolveParticipantDisplay(displaySettings, {
      index: row.participantNumber,
      demographics: row.demographics,
    })

    // Determine task status styling
    const isAllSuccessful = row.tasksSuccessful === row.totalTasks && row.totalTasks > 0
    const hasSkipped = row.tasksSkipped > 0

    // Determine if metrics indicate potential usability issues
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

  // Panel management via shared hook
  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<ParticipantRowData>()

  // Render panel content when selected participant changes
  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    // Calculate stats for the panel
    const startedAt = new Date(row.participant.started_at || new Date())
    const completedAt = row.participant.completed_at ? new Date(row.participant.completed_at) : null

    // Calculate average clicks
    const avgClicks = row.attempts.length > 0
      ? row.attempts.reduce((sum, a) => sum + (a.click_count || 0), 0) / row.attempts.length
      : 0

    // Calculate direct path count
    const directPathCount = row.attempts.filter(a => a.is_direct === true).length

    // Calculate average time to first click (only for attempts with the metric)
    const attemptsWithFirstClick = row.attempts.filter(a => a.time_to_first_click_ms != null)
    const avgTimeToFirstClick = attemptsWithFirstClick.length > 0
      ? attemptsWithFirstClick.reduce((sum, a) => sum + (a.time_to_first_click_ms || 0), 0) / attemptsWithFirstClick.length
      : null

    // Extract browser data from participant metadata
    const metadata = row.participant.metadata as { browserData?: {
      browser?: string
      operatingSystem?: string
      deviceType?: 'Desktop' | 'Mobile' | 'Tablet'
      language?: string
      timeZone?: string
      screenResolution?: string
    } } | null
    const browserData = metadata?.browserData || null

    // Extract location from participant
    const location = {
      country: row.participant.country,
      region: row.participant.region,
      city: row.participant.city,
    }

    // Combined close handler - closes panel and notifies ParticipantsListBase
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
          studyId={studyId}
          tasksSuccessful={row.tasksSuccessful}
          tasksSkipped={row.tasksSkipped}
          totalTasks={row.totalTasks}
          totalTimeMs={row.totalTimeMs}
          avgClicks={avgClicks}
          totalMisclicks={row.totalMisclicks}
          totalBacktracks={row.totalBacktracks}
          directPathCount={directPathCount}
          avgTimeToFirstClick={avgTimeToFirstClick}
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

  // Column widths for proper alignment between header and virtualized body
  // Order: checkbox, participant, status, time, clicks, misclicks, backtracks, tasks
  const columnWidths = ['4%', '22%', '12%', '10%', '10%', '12%', '12%', '18%']

  return (
    <ParticipantsListBase
      items={filteredRows}
      getParticipantId={(row) => row.participant.id}
      isExcluded={(row) => row.isExcluded}
      onExclusionChange={handleExclusionChange}
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
