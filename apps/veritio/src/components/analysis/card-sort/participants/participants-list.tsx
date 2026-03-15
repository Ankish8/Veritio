'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatTime } from '@/lib/utils'
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
import { CardSortParticipantDetailContent } from './card-sort-participant-detail-content'
import { useParticipantRowsData, type ParticipantRow } from '@/hooks/analysis'
import { useFilteredItems } from '@/contexts/segment-context'
import type { Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { StatusFilter, ResponseData } from './types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'

interface ParticipantsListProps {
  studyId: string
  participants: Participant[]
  responses: ResponseData[]
  cards: Array<{ id: string; label: string }>
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  studyMode?: 'open' | 'closed' | 'hybrid'
  statusFilter: StatusFilter
  displaySettings?: ParticipantDisplaySettings | null
}

export interface EnhancedParticipantRow extends ParticipantRow {
  participantIndex: number
  identifier: string | null
  questionsAnswered: number
  questionsTotal: number
  questionsPercent: number
  cardsPercent: number
  categoriesNamed: number
  categoriesTotal: number
  categoriesNamedPercent: number
  customCategories: string[]
  cardPlacements: Record<string, string>
  flowResponses: StudyFlowResponseRow[]
  urlTags: Record<string, string> | null
  demographics: ParticipantDemographicData | null
}

export function ParticipantsList({
  studyId,
  participants,
  responses,
  cards,
  flowQuestions = [],
  flowResponses = [],
  studyMode: _studyMode = 'open',
  statusFilter,
  displaySettings = null,
}: ParticipantsListProps) {
  const { excludedIds: excludedParticipantIds, toggleExclude, bulkToggleExclude } = useExcludedParticipants(studyId)

  const { participantRows } = useParticipantRowsData({
    participants: participants.map(p => ({
      id: p.id,
      status: p.status || 'unknown',
      started_at: p.started_at || new Date().toISOString(),
      completed_at: p.completed_at,
    })),
    responses: responses as Array<{
      id?: string
      participant_id: string
      card_placements: Record<string, string> | unknown
      total_time_ms?: number | null
    }>,
    cards,
    excludedParticipantIds,
  })

  const enhancedRows: EnhancedParticipantRow[] = useMemo(() => {
    const responsesByParticipant = new Map<string, StudyFlowResponseRow[]>()
    for (const response of flowResponses) {
      const existing = responsesByParticipant.get(response.participant_id) || []
      existing.push(response)
      responsesByParticipant.set(response.participant_id, existing)
    }

    const responseDataByParticipant = new Map<string, ResponseData>()
    for (const response of responses) {
      responseDataByParticipant.set(response.participant_id, response)
    }

    return participantRows.map((row, index) => {
      const participant = participants.find(p => p.id === row.participant.id)
      const participantFlowResponses = responsesByParticipant.get(row.participant.id) || []
      const responseData = responseDataByParticipant.get(row.participant.id)

      const questionsTotal = flowQuestions.length
      const questionsAnswered = participantFlowResponses.filter(r =>
        r.response_value !== null && r.response_value !== undefined && r.response_value !== ''
      ).length
      const questionsPercent = questionsTotal > 0 ? Math.round((questionsAnswered / questionsTotal) * 100) : 0

      const cardsPercent = cards.length > 0 ? Math.round((row.cardsPlaced / cards.length) * 100) : 0

      const rawCategories = responseData?.custom_categories
      const customCategories = Array.isArray(rawCategories)
        ? rawCategories.map(c => typeof c === 'string' ? c : (c as { name?: string })?.name || '').filter(Boolean)
        : []
      const categoriesTotal = row.categoriesCreated
      const categoriesNamed = customCategories.filter(name => typeof name === 'string' && name.trim() !== '').length
      const categoriesNamedPercent = categoriesTotal > 0 ? Math.round((categoriesNamed / categoriesTotal) * 100) : 0

      const cardPlacements = (responseData?.card_placements || {}) as Record<string, string>

      const urlTags = parseUrlTags(participant?.url_tags)

      const demographics = extractDemographicsFromMetadata(participant?.metadata)

      return {
        ...row,
        participantIndex: index + 1,
        identifier: participant?.identifier_value || null,
        questionsAnswered,
        questionsTotal,
        questionsPercent,
        cardsPercent,
        categoriesNamed,
        categoriesTotal,
        categoriesNamedPercent,
        customCategories,
        cardPlacements,
        flowResponses: participantFlowResponses,
        urlTags,
        demographics,
      }
    })
  }, [participantRows, participants, flowQuestions, flowResponses, responses, cards.length])

  const filteredRows = useMemo(() => {
    return enhancedRows.filter((row) => {
      switch (statusFilter) {
        case 'included': return !row.isExcluded
        case 'excluded': return row.isExcluded
        case 'all': return true
        case 'completed': return row.participant.status === 'completed' && !row.isExcluded
        case 'abandoned': return row.participant.status === 'abandoned' && !row.isExcluded
        case 'in_progress': return row.participant.status === 'in_progress' && !row.isExcluded
        default: return true
      }
    })
  }, [enhancedRows, statusFilter])

  const segmentFilteredRows = useFilteredItems(
    filteredRows.map(row => ({ ...row, participant_id: row.participant.id }))
  ).map(row => {
    const { participant_id: _participant_id, ...rest } = row as EnhancedParticipantRow & { participant_id: string }
    return rest as EnhancedParticipantRow
  })

  const sortedRows = useMemo(() => {
    return [...segmentFilteredRows].sort((a, b) => {
      const aTime = a.participant.completed_at || a.participant.started_at
      const bTime = b.participant.completed_at || b.participant.started_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [segmentFilteredRows])

  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>Participant</GridHeaderCell>
      <GridHeaderCell align="center">Status</GridHeaderCell>
      <GridHeaderCell align="center">Time taken</GridHeaderCell>
      <GridHeaderCell align="center">Questions</GridHeaderCell>
      <GridHeaderCell align="center">Cards sorted</GridHeaderCell>
      <GridHeaderCell align="center">Categories</GridHeaderCell>
    </>
  ), [])

  const renderRow = useCallback((row: EnhancedParticipantRow, _index: number, handlers: RowHandlers) => {
    const display = resolveParticipantDisplay(displaySettings, {
      index: row.participantIndex,
      demographics: row.demographics,
    })

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
        <ParticipantStatusBadge status={row.participant.status} />
      </GridCell>
      <GridCell align="center">{formatTime(row.response?.total_time_ms || null)}</GridCell>
      <GridCell align="center">
        {row.questionsTotal > 0 ? (
          <span className={row.questionsPercent === 100 ? 'text-green-600 font-medium' : ''}>{row.questionsPercent}%</span>
        ) : <span className="text-muted-foreground">-</span>}
      </GridCell>
      <GridCell align="center">
        <span className={row.cardsPercent === 100 ? 'text-green-600 font-medium' : ''}>{row.cardsPercent}%</span>
      </GridCell>
      <GridCell align="center">{row.categoriesCreated || '-'}</GridCell>
    </GridRow>
    )
  }, [displaySettings])

  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<EnhancedParticipantRow>()

  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    const startedAt = new Date(row.participant.started_at || new Date())
    const completedAt = row.participant.completed_at ? new Date(row.participant.completed_at) : null

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
          questionsAnswered: row.questionsAnswered,
          questionsTotal: row.questionsTotal,
          completionPercent: row.questionsPercent,
          timeTakenMs: row.response?.total_time_ms || null,
          status: row.participant.status,
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
        <CardSortParticipantDetailContent
          studyId={studyId}
          responseId={row.response?.id}
          cardsPlaced={row.cardsPlaced}
          totalCards={cards.length}
          categoriesCreated={row.categoriesCreated}
          totalTimeMs={row.response?.total_time_ms || null}
          flags={row.flags}
          flowResponses={row.flowResponses}
          flowQuestions={flowQuestions}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, cards.length, flowQuestions, setPanelContent, closePanel, studyId])

  const columnWidths = ['5%', '27%', '14%', '14%', '13%', '13%', '14%']

  return (
    <ParticipantsListBase<EnhancedParticipantRow>
      items={sortedRows}
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
