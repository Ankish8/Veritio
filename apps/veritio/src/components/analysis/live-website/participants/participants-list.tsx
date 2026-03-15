'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Monitor, Smartphone, Tablet, Video } from 'lucide-react'
import {
  ParticipantsListBase,
  ParticipantDetailPanel,
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  type RowHandlers,
} from '@/components/analysis/shared'
import { SortableColumnHeader } from '@/components/ui/sortable-column-header'
import { useParticipantDetailPanel } from '@/hooks'
import { useExcludedParticipants } from '@/hooks/analysis'
import { useSorting } from '@/hooks/use-sorting'
import { LiveWebsiteParticipantDetailContent } from './participant-detail-content'
import { useSegment } from '@/contexts/segment-context'
import { formatTime } from '@/lib/utils'
import { createParticipantNumberMap } from '@/lib/utils/participant-utils'
import { resolveParticipantDisplay, extractDemographicsFromMetadata, parseUrlTags } from '@/lib/utils/participant-display'
import type {
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDemographicData, ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsitePostTaskResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { StatusFilter } from './participants-tab-container'

interface LiveWebsiteParticipantsListProps {
  studyId: string
  participants: Participant[]
  allParticipants?: Participant[]
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  postTaskResponses?: LiveWebsitePostTaskResponse[]
  events?: LiveWebsiteEvent[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  statusFilter: StatusFilter
  displaySettings?: ParticipantDisplaySettings | null
  abVariants?: Array<{ id: string; name: string }>
  participantVariants?: Array<{ participant_id: string; variant_id: string }>
  selectedVariantId?: string | null
  readOnly?: boolean
}

interface ParticipantRowData {
  participant: Participant
  participantNumber: number
  status: string
  totalTimeMs: number
  tasksCompleted: number
  totalTasks: number
  pagesVisited: number
  clicks: number
  rageClicks: number
  questionsAnswered: number
  totalQuestions: number
  isExcluded: boolean
  responses: LiveWebsiteResponse[]
  postTaskResponses: LiveWebsitePostTaskResponse[]
  flowResponses: StudyFlowResponseRow[]
  demographics: ParticipantDemographicData | null
  urlTags: Record<string, string> | null
  identifier: string | null
  deviceType: string | null
  startedAt: string | null
  taskSuccessCount: number
  avgScrollDepth: number | null
  hasRecording: boolean
}

function groupBy<T>(items: T[], keyFn: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    if (key == null) continue
    const group = map.get(key)
    if (group) group.push(item)
    else map.set(key, [item])
  }
  return map
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

export function LiveWebsiteParticipantsList({
  studyId,
  participants,
  allParticipants,
  tasks,
  responses,
  postTaskResponses = [],
  events = [],
  flowQuestions = [],
  flowResponses = [],
  statusFilter,
  displaySettings = null,
  abVariants = [],
  participantVariants = [],
  readOnly,
}: LiveWebsiteParticipantsListProps) {
  // Skip auth-dependent hook in readOnly/public mode (null key disables SWR fetch)
  const excludedParticipants = useExcludedParticipants(readOnly ? null : studyId)
  const excludedIds = useMemo(() => readOnly ? new Set<string>() : excludedParticipants.excludedIds, [readOnly, excludedParticipants.excludedIds])
  const toggleExclude = readOnly ? async () => {} : excludedParticipants.toggleExclude
  const bulkToggleExclude = readOnly ? async () => {} : excludedParticipants.bulkToggleExclude
  const { filteredParticipantIds } = useSegment()

  // Use allParticipants (unfiltered) for numbering so numbers stay consistent across variant filters
  const participantNumberMap = useMemo(() => createParticipantNumberMap(allParticipants ?? participants), [allParticipants, participants])

  const participantVariantMap = useMemo(() => {
    if (abVariants.length === 0) return null
    const variantNameById = new Map(abVariants.map(v => [v.id, v.name]))
    const map = new Map<string, string>()
    for (const pv of participantVariants) {
      const name = variantNameById.get(pv.variant_id)
      if (name) map.set(pv.participant_id, name)
    }
    return map
  }, [abVariants, participantVariants])

  const rowData = useMemo<ParticipantRowData[]>(() => {
    const totalTasks = tasks.length
    const responsesByParticipant = groupBy(responses, r => r.participant_id)
    const ptqByParticipant = groupBy(postTaskResponses, r => r.participant_id)
    const flowResponsesByParticipant = groupBy(flowResponses, r => r.participant_id)
    const eventsByParticipant = groupBy(events, e => e.participant_id)

    return participants.map((participant) => {
      const participantNumber = participantNumberMap.get(participant.id) || 0
      const pResponses = responsesByParticipant.get(participant.id) || []
      const pPostTaskResponses = ptqByParticipant.get(participant.id) || []
      const pFlowResponses = flowResponsesByParticipant.get(participant.id) || []
      const pEvents = eventsByParticipant.get(participant.id) || []

      const totalTimeMs = pResponses.reduce((sum, r) => sum + (r.duration_ms || 0), 0)
      const tasksCompleted = pResponses.filter(r => r.status === 'completed').length

      // Behavioral metrics from events
      const navigationPages = new Set<string>()
      let clicks = 0
      let rageClicks = 0
      const scrollMaxByPage = new Map<string, number>()
      for (const e of pEvents) {
        if ((e.event_type === 'page_view' || e.event_type === 'navigation') && e.page_url) {
          navigationPages.add(e.page_url)
        } else if (e.event_type === 'click') {
          clicks++
        } else if (e.event_type === 'rage_click') {
          rageClicks++
        } else if (e.event_type === 'scroll' && e.page_url && e.metadata) {
          const pct = typeof e.metadata.scrollPercentage === 'number' ? e.metadata.scrollPercentage : 0
          const current = scrollMaxByPage.get(e.page_url) || 0
          if (pct > current) scrollMaxByPage.set(e.page_url, pct)
        }
      }

      // Scroll depth: average of max scroll per page
      const avgScrollDepth = scrollMaxByPage.size > 0
        ? Math.round([...scrollMaxByPage.values()].reduce((a, b) => a + b, 0) / scrollMaxByPage.size)
        : null

      // Task success: auto URL/path match or self-reported success
      const taskSuccessCount = pResponses.filter(r =>
        (r.completion_method && (r.completion_method.startsWith('auto_url') || r.completion_method.startsWith('auto_path'))) ||
        r.self_reported_success === true
      ).length

      // Device type from metadata
      const meta = participant.metadata as { browserData?: { deviceType?: string } } | null
      const deviceType = meta?.browserData?.deviceType || null

      // Recording indicator
      const hasRecording = pResponses.some(r => r.recording_id != null)

      const questionsAnswered = pFlowResponses.length + pPostTaskResponses.length
      const totalQuestions = flowQuestions.length + tasks.reduce((sum, t) => {
        const questions = t.post_task_questions as unknown[] | null
        return sum + (Array.isArray(questions) ? questions.length : 0)
      }, 0)

      const demographics = extractDemographicsFromMetadata(participant.metadata)
      const urlTags = parseUrlTags(participant.url_tags)

      return {
        participant,
        participantNumber,
        status: participant.status || 'unknown',
        totalTimeMs,
        tasksCompleted,
        totalTasks,
        pagesVisited: navigationPages.size,
        clicks,
        rageClicks,
        questionsAnswered,
        totalQuestions,
        isExcluded: excludedIds.has(participant.id),
        responses: pResponses,
        postTaskResponses: pPostTaskResponses,
        flowResponses: pFlowResponses,
        demographics,
        urlTags,
        identifier: participant.identifier_value || null,
        deviceType,
        startedAt: participant.started_at || null,
        taskSuccessCount,
        avgScrollDepth,
        hasRecording,
      }
    })
  }, [participants, tasks, responses, postTaskResponses, events, flowQuestions, flowResponses, excludedIds, participantNumberMap])

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

  type SortKey = 'participant' | 'status' | 'date' | 'time' | 'tasks' | 'success' | 'pagesVisited' | 'clicks' | 'scrollDepth'

  const sortComparators = useMemo(() => ({
    participant: (a: ParticipantRowData, b: ParticipantRowData) => a.participantNumber - b.participantNumber,
    status: (a: ParticipantRowData, b: ParticipantRowData) => a.status.localeCompare(b.status),
    date: (a: ParticipantRowData, b: ParticipantRowData) => {
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0
      return aTime - bTime
    },
    time: (a: ParticipantRowData, b: ParticipantRowData) => a.totalTimeMs - b.totalTimeMs,
    tasks: (a: ParticipantRowData, b: ParticipantRowData) => a.tasksCompleted - b.tasksCompleted,
    success: (a: ParticipantRowData, b: ParticipantRowData) => a.taskSuccessCount - b.taskSuccessCount,
    pagesVisited: (a: ParticipantRowData, b: ParticipantRowData) => a.pagesVisited - b.pagesVisited,
    clicks: (a: ParticipantRowData, b: ParticipantRowData) => a.clicks - b.clicks,
    scrollDepth: (a: ParticipantRowData, b: ParticipantRowData) => (a.avgScrollDepth ?? -1) - (b.avgScrollDepth ?? -1),
  }), [])

  const { sortedData, toggleSort, getSortDirection } = useSorting<ParticipantRowData, SortKey>(filteredRows, {
    initialSort: { key: 'date', direction: 'desc' },
    comparators: sortComparators,
  })

  const renderColumns = useCallback(() => (
    <>
      <GridHeaderCell>
        <SortableColumnHeader direction={getSortDirection('participant')} onClick={() => toggleSort('participant')}>
          Participant
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('status')} onClick={() => toggleSort('status')} align="center">
          Status
        </SortableColumnHeader>
      </GridHeaderCell>
      {participantVariantMap && <GridHeaderCell align="center">Variant</GridHeaderCell>}
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('date')} onClick={() => toggleSort('date')} align="center">
          Date
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">Device</GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('time')} onClick={() => toggleSort('time')} align="center">
          Time
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('tasks')} onClick={() => toggleSort('tasks')} align="center">
          Tasks
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('success')} onClick={() => toggleSort('success')} align="center">
          Success
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('pagesVisited')} onClick={() => toggleSort('pagesVisited')} align="center">
          Pages Visited
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('clicks')} onClick={() => toggleSort('clicks')} align="center">
          Clicks
        </SortableColumnHeader>
      </GridHeaderCell>
      <GridHeaderCell align="center">
        <SortableColumnHeader direction={getSortDirection('scrollDepth')} onClick={() => toggleSort('scrollDepth')} align="center">
          Scroll Depth
        </SortableColumnHeader>
      </GridHeaderCell>
    </>
  ), [participantVariantMap, getSortDirection, toggleSort])

  const renderRow = useCallback((row: ParticipantRowData, _index: number, handlers: RowHandlers) => {
    const display = resolveParticipantDisplay(displaySettings, {
      index: row.participantNumber,
      demographics: row.demographics,
    })
    const variantName = participantVariantMap?.get(row.participant.id)

    const allTasksDone = row.totalTasks > 0
    const isAllCompleted = allTasksDone && row.tasksCompleted === row.totalTasks
    const isAllSuccess = allTasksDone && row.taskSuccessCount === row.totalTasks

    const dateStr = row.startedAt
      ? new Date(row.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—'

    const deviceIcons = { Mobile: Smartphone, Tablet } as const
    const DeviceIcon = (row.deviceType && deviceIcons[row.deviceType as keyof typeof deviceIcons]) || Monitor

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
            <span className="font-medium flex items-center gap-1.5">
              <span className="border-b border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-colors cursor-pointer">
                {display.primary}
              </span>
              {row.hasRecording && <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              {row.isExcluded && <Badge variant="secondary" className="ml-1 text-xs">Excluded</Badge>}
            </span>
            {display.secondary && (
              <span className="text-sm text-muted-foreground">{display.secondary}</span>
            )}
          </div>
        </GridCell>
        <GridCell align="center">
          {getStatusBadge(row.status)}
        </GridCell>
        {participantVariantMap && (
          <GridCell align="center">
            {variantName
              ? <Badge variant="outline" className="text-xs font-medium">{variantName}</Badge>
              : <span className="text-sm text-muted-foreground">—</span>
            }
          </GridCell>
        )}
        <GridCell align="center">
          <span className="text-sm text-muted-foreground">{dateStr}</span>
        </GridCell>
        <GridCell align="center">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <DeviceIcon className="h-3.5 w-3.5" />
            {row.deviceType || 'Desktop'}
          </span>
        </GridCell>
        <GridCell align="center">
          {formatTime(row.totalTimeMs)}
        </GridCell>
        <GridCell align="center">
          <span className={isAllCompleted ? 'text-green-600 font-medium' : ''}>
            {row.tasksCompleted}/{row.totalTasks}
          </span>
        </GridCell>
        <GridCell align="center">
          <span className={isAllSuccess ? 'text-green-600 font-medium' : ''}>
            {row.taskSuccessCount}/{row.totalTasks}
          </span>
        </GridCell>
        <GridCell align="center">
          {row.pagesVisited}
        </GridCell>
        <GridCell align="center">
          {row.clicks}
        </GridCell>
        <GridCell align="center">
          {row.avgScrollDepth != null ? `${row.avgScrollDepth}%` : '—'}
        </GridCell>
      </GridRow>
    )
  }, [displaySettings, participantVariantMap])

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
        <LiveWebsiteParticipantDetailContent
          tasksCompleted={row.tasksCompleted}
          totalTasks={row.totalTasks}
          totalTimeMs={row.totalTimeMs}
          pagesVisited={row.pagesVisited}
          clicks={row.clicks}
          rageClicks={row.rageClicks}
          responses={row.responses}
          postTaskResponses={row.postTaskResponses}
          tasks={tasks}
          flowResponses={row.flowResponses}
          flowQuestions={flowQuestions}
          browserData={browserData}
          location={location}
          variantName={participantVariantMap?.get(row.participant.id) ?? null}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, tasks, flowQuestions, setPanelContent, closePanel, participantVariantMap])

  // Column widths: checkbox + Participant | Status | [Variant] | Date | Device | Time | Tasks | Success | Pages Visited | Clicks | Scroll Depth
  const columnWidths = participantVariantMap
    ? ['3%', '14%', '9%', '8%', '8%', '8%', '8%', '10%', '10%', '9%', '8%', '7%']
    : ['3%', '16%', '9%', '10%', '8%', '8%', '11%', '10%', '9%', '8%', '8%']

  return (
    <ParticipantsListBase
      items={sortedData}
      getParticipantId={(row) => row.participant.id}
      isExcluded={(row) => row.isExcluded}
      onExclusionChange={toggleExclude}
      onBulkExclusionChange={bulkToggleExclude}
      renderColumns={renderColumns}
      renderRow={renderRow}
      renderDetailDialog={renderDetailDialog}
      columnWidths={columnWidths}
      emptyTitle="No participants yet"
      emptyDescription="Participants will appear here once they start your live website test."
      noMatchMessage="No participants match the current filters."
      paginationLabel="participants"
    />
  )
}
