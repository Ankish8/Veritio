'use client'

/**
 * First-Click Participants Tab
 *
 * Uses ParticipantsListBase with First-Click specific columns and rendering.
 */

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
import { formatTime } from '@/lib/utils'
import { useFilteredParticipantIds } from '@/stores/segment-store'
import type { FirstClickResultsResponse } from '@/services/results/first-click'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings, ParticipantDemographicData } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'

interface FirstClickParticipantsProps {
  data: FirstClickResultsResponse
  statusFilter: string
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

interface ParticipantRowData {
  participant: Participant
  index: number
  status: string
  totalTimeMs: number
  tasksCompleted: number
  tasksSkipped: number
  tasksCorrect: number
  totalTasks: number
  isExcluded: boolean
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

export function FirstClickParticipants({
  data,
  statusFilter,
  displaySettings = null,
}: FirstClickParticipantsProps) {
  const { excludedIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(data.study.id)

  // Get filtered participant IDs from segment store
  const filteredParticipantIds = useFilteredParticipantIds()

  // Build participant data from responses
  const items = useMemo<ParticipantRowData[]>(() => {
    const participantMap: Record<string, ParticipantRowData> = {}

    // Initialize from participants
    data.participants.forEach((p: any, index: number) => {
      // Extract demographics from participant metadata (handles nested and legacy formats)
      const demographics = extractDemographicsFromMetadata(p.metadata)

      const urlTags = parseUrlTags(p.url_tags)

      participantMap[p.id] = {
        participant: p,
        index,
        status: p.status || 'unknown',
        totalTimeMs: 0,
        tasksCompleted: 0,
        tasksSkipped: 0,
        tasksCorrect: 0,
        totalTasks: data.tasks.length,
        isExcluded: excludedIds.has(p.id),
        demographics,
        urlTags,
        identifier: p.identifier_value || null,
      }
    })

    // Aggregate from responses
    data.responses.forEach((r: any) => {
      const row = participantMap[r.participant_id]
      if (!row) return

      if (r.is_skipped) {
        row.tasksSkipped++
      } else {
        row.tasksCompleted++
        if (r.is_correct) row.tasksCorrect++
        row.totalTimeMs += r.time_to_click_ms || 0
      }
    })

    return Object.values(participantMap)
  }, [data.participants, data.responses, data.tasks.length, excludedIds])

  // Filter by status and segment
  const filteredItems = useMemo(() => {
    let filtered = items

    // Apply status filter
    if (statusFilter === 'included') {
      filtered = filtered.filter(item => !item.isExcluded)
    } else if (statusFilter === 'excluded') {
      filtered = filtered.filter(item => item.isExcluded)
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter && !item.isExcluded)
    }

    // Apply segment filter (from segment store)
    if (filteredParticipantIds !== null) {
      filtered = filtered.filter(item => filteredParticipantIds.has(item.participant.id))
    }

    return filtered
  }, [items, statusFilter, filteredParticipantIds])

  // Render column headers using shared GridHeaderCell
  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>Participant</GridHeaderCell>
      <GridHeaderCell align="center">Status</GridHeaderCell>
      <GridHeaderCell align="center">Time</GridHeaderCell>
      <GridHeaderCell align="center">Completed</GridHeaderCell>
      <GridHeaderCell align="center">Correct</GridHeaderCell>
      <GridHeaderCell align="center">Skipped</GridHeaderCell>
    </>
  ), [])

  // Render a single row using shared grid components
  const renderRow = useCallback((item: ParticipantRowData, _index: number, handlers: RowHandlers) => {
    // Resolve participant display based on settings
    const display = resolveParticipantDisplay(displaySettings, {
      index: item.index + 1,
      demographics: item.demographics,
    })

    return (
      <GridRow
        key={item.participant.id}
        onClick={handlers.onClick}
        isExcluded={item.isExcluded}
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
              {item.isExcluded && <Badge variant="secondary" className="ml-2 text-xs">Excluded</Badge>}
            </span>
            {display.secondary && (
              <span className="text-sm text-muted-foreground">{display.secondary}</span>
            )}
          </div>
        </GridCell>
        <GridCell align="center">{getStatusBadge(item.status)}</GridCell>
        <GridCell align="center">{formatTime(item.totalTimeMs)}</GridCell>
        <GridCell align="center">{item.tasksCompleted}/{item.totalTasks}</GridCell>
        <GridCell align="center">
          <span className={item.tasksCorrect === item.tasksCompleted && item.tasksCompleted > 0 ? 'text-green-600 font-medium' : ''}>
            {item.tasksCorrect}/{item.tasksCompleted || 1}
          </span>
        </GridCell>
        <GridCell align="center">{item.tasksSkipped}</GridCell>
      </GridRow>
    )
  }, [displaySettings])

  // Detail panel hook
  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<ParticipantRowData>()

  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    const startedAt = new Date(row.participant.started_at || new Date())
    const completedAt = row.participant.completed_at ? new Date(row.participant.completed_at) : null

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

    // Get this participant's responses, post-task responses, and flow responses
    const participantResponses = data.responses.filter((r: any) => r.participant_id === row.participant.id)
    const participantPostTaskResponses = (data.postTaskResponses || []).filter((r: any) => r.participant_id === row.participant.id)
    const participantFlowResponses = (data.flowResponses || []).filter((r: any) => r.participant_id === row.participant.id)

    setPanelContent(
      <ParticipantDetailPanel
        participantIndex={row.index + 1}
        identifier={row.identifier}
        participantId={row.participant.id}
        stats={{
          questionsAnswered: 0,
          questionsTotal: 0,
          completionPercent: row.totalTasks > 0 ? Math.round(((row.tasksCompleted + row.tasksSkipped) / row.totalTasks) * 100) : 0,
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
          responses={participantResponses}
          tasks={data.tasks}
          postTaskResponses={participantPostTaskResponses}
          flowQuestions={data.flowQuestions || []}
          flowResponses={participantFlowResponses}
          browserData={browserData}
          location={location}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, data.responses, data.tasks, data.postTaskResponses, data.flowQuestions, data.flowResponses, setPanelContent, closePanel])

  const columnWidths = ['5%', '25%', '14%', '14%', '14%', '14%', '14%']

  return (
    <ParticipantsListBase
      items={filteredItems}
      getParticipantId={(item) => item.participant.id}
      isExcluded={(item) => item.isExcluded}
      onExclusionChange={toggleExclude}
      onBulkExclusionChange={bulkToggleExclude}
      renderColumns={renderColumns}
      renderRow={renderRow}
      renderDetailDialog={renderDetailDialog}
      columnWidths={columnWidths}
    />
  )
}
