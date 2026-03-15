'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'
import { useFilteredItems } from '@/contexts/segment-context'
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
import { useParticipantDetailPanel } from '@/hooks'
import { SurveyParticipantDetailContent } from './survey-participant-detail-content'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { StatusFilter } from './survey-participants-tab-container'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'

interface SurveyParticipantsListProps {
  studyId: string
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  statusFilter: StatusFilter
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

interface SurveyParticipantRow {
  participant_id: string  // Required by useFilteredItems
  id: string
  participantIndex: number
  status: string
  startedAt: Date
  completedAt: Date | null
  identifier: string | null
  questionsAnswered: number
  questionsTotal: number
  questionsPercent: number
  timeMs: number | null
  country: string | null
  isExcluded: boolean
  urlTags: Record<string, string> | null
  flowResponses: StudyFlowResponseRow[]
  demographics: ParticipantDemographicData | null
}

/**
 * Survey participants list with segment filtering and pagination.
 * Uses shared ParticipantsListBase for common infrastructure.
 */
export function SurveyParticipantsList({
  studyId,
  participants,
  flowQuestions,
  flowResponses,
  statusFilter,
  displaySettings = null,
}: SurveyParticipantsListProps) {
  const { excludedIds: excludedParticipantIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(studyId)

  // Build survey participant rows
  const surveyRows: SurveyParticipantRow[] = useMemo(() => {
    const responsesByParticipant = new Map<string, StudyFlowResponseRow[]>()
    for (const response of flowResponses) {
      const existing = responsesByParticipant.get(response.participant_id) || []
      existing.push(response)
      responsesByParticipant.set(response.participant_id, existing)
    }

    const surveyQuestions = flowQuestions.filter(q => q.section === 'survey')

    return participants.map((participant, index) => {
      const participantFlowResponses = responsesByParticipant.get(participant.id) || []

      const surveyResponses = participantFlowResponses.filter(r => {
        const question = surveyQuestions.find(q => q.id === r.question_id)
        return question && r.response_value !== null && r.response_value !== undefined && r.response_value !== ''
      })

      const questionsTotal = surveyQuestions.length
      const questionsAnswered = surveyResponses.length
      const questionsPercent = questionsTotal > 0 ? Math.round((questionsAnswered / questionsTotal) * 100) : 0

      const startedAt = new Date(participant.started_at || new Date())
      const completedAt = participant.completed_at ? new Date(participant.completed_at) : null
      const timeMs = completedAt ? completedAt.getTime() - startedAt.getTime() : null

      return {
        participant_id: participant.id,
        id: participant.id,
        participantIndex: index + 1,
        status: participant.status || 'unknown',
        startedAt,
        completedAt,
        identifier: participant.identifier_value || null,
        questionsAnswered,
        questionsTotal,
        questionsPercent,
        timeMs,
        country: participant.country || null,
        isExcluded: excludedParticipantIds.has(participant.id),
        urlTags: parseUrlTags(participant.url_tags),
        flowResponses: participantFlowResponses,
        demographics: extractDemographicsFromMetadata(participant.metadata),
      }
    })
  }, [participants, flowQuestions, flowResponses, excludedParticipantIds])

  // Apply segment filtering
  const filteredRows = useFilteredItems(surveyRows)

  // Apply status filter
  const statusFilteredRows = useMemo(() => {
    if (statusFilter === 'included') return filteredRows.filter(r => !r.isExcluded)
    if (statusFilter === 'excluded') return filteredRows.filter(r => r.isExcluded)
    if (statusFilter === 'all') return filteredRows
    return filteredRows.filter(r => r.status === statusFilter && !r.isExcluded)
  }, [filteredRows, statusFilter])

  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>Participant</GridHeaderCell>
      <GridHeaderCell align="center">Status</GridHeaderCell>
      <GridHeaderCell align="center">Time taken</GridHeaderCell>
      <GridHeaderCell align="center">Question responses</GridHeaderCell>
    </>
  ), [])

  const renderRow = useCallback((row: SurveyParticipantRow, _index: number, handlers: RowHandlers) => {
    const display = resolveParticipantDisplay(displaySettings, {
      index: row.participantIndex,
      demographics: row.demographics,
    })

    return (
      <GridRow
        key={row.id}
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
          <ParticipantStatusBadge status={row.status} />
        </GridCell>
        <GridCell align="center">
          {row.timeMs ? formatTime(row.timeMs) : <span className="text-muted-foreground">-</span>}
        </GridCell>
        <GridCell align="center">
          <span className={row.questionsPercent === 100 ? 'text-green-600 font-medium' : ''}>
            {row.questionsAnswered}/{row.questionsTotal}
          </span>
          <span className="text-xs text-muted-foreground ml-1">({row.questionsPercent}%)</span>
        </GridCell>
      </GridRow>
    )
  }, [displaySettings])

  // Panel management via shared hook
  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<SurveyParticipantRow>()

  // Render panel content when selected participant changes
  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    const handleClose = () => {
      closePanel()
      handlers.onClose()
    }

    setPanelContent(
      <ParticipantDetailPanel
        participantIndex={row.participantIndex}
        identifier={row.identifier}
        participantId={row.id}
        stats={{
          questionsAnswered: row.questionsAnswered,
          questionsTotal: row.questionsTotal,
          completionPercent: row.questionsPercent,
          timeTakenMs: row.timeMs,
          status: row.status,
          startedAt: row.startedAt,
          completedAt: row.completedAt,
        }}
        demographics={row.demographics}
        urlTags={row.urlTags}
        isExcluded={row.isExcluded}
        onClose={handleClose}
        onNavigate={handlers.onNavigate}
        canNavigatePrev={handlers.canNavigatePrev}
        canNavigateNext={handlers.canNavigateNext}
        onToggleExclude={(exclude) => handlers.onToggleExclude?.(row.id, exclude)}
      >
        <SurveyParticipantDetailContent
          studyId={studyId}
          questionsAnswered={row.questionsAnswered}
          questionsTotal={row.questionsTotal}
          flowResponses={row.flowResponses}
          flowQuestions={flowQuestions}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, flowQuestions, setPanelContent, closePanel, studyId])

  // Column widths: checkbox, participant, status, time, question responses
  const columnWidths = ['5%', '32%', '18%', '18%', '27%']

  return (
    <ParticipantsListBase
      items={statusFilteredRows}
      getParticipantId={(row) => row.id}
      isExcluded={(row) => row.isExcluded}
      onExclusionChange={toggleExclude}
      onBulkExclusionChange={bulkToggleExclude}
      renderColumns={renderColumns}
      renderRow={renderRow}
      renderDetailDialog={renderDetailDialog}
      columnWidths={columnWidths}
      emptyTitle="No participants yet"
      emptyDescription="Once participants complete your survey, they will appear here."
      noMatchMessage="No participants match the current filters"
      showSelection={true}
      showBulkActions={true}
      paginationLabel="participants"
    />
  )
}
