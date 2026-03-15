'use client'

/**
 * First Impression Participants Tab
 *
 * Uses ParticipantsListBase with First Impression specific columns and rendering.
 * Features:
 * - Customizable column visibility (persisted per-study)
 * - Quality flagging (speeder, slow, no responses)
 * - Fixed Design Shown column (uses exposures)
 * - Tier-based column organization
 * - Clickable participant names with detail panel
 */

import { useMemo, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Monitor, Tablet, Smartphone, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import { cn, formatTime } from '@/lib/utils'
import type { FirstImpressionResultsResponse } from '@/services/results/first-impression'
import {
  type FirstImpressionColumnId,
  COLUMN_DEFINITIONS,
  calculateColumnWidths,
} from './column-definitions'
import { QualityFlagList, InlineFlagIndicator } from './quality-flag-badge'
import { FirstImpressionParticipantDetailContent } from './first-impression-participant-detail-content'
import { useFirstImpressionParticipants, type ExtendedRowData } from './use-first-impression-participants'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay } from '@/lib/utils/participant-display'

interface FirstImpressionParticipantsProps {
  data: FirstImpressionResultsResponse
  statusFilter: string
  /** Visible columns (controlled from parent) */
  visibleColumns: Set<FirstImpressionColumnId>
  /** Display settings for participant identifiers (null = anonymous mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
          Completed
        </Badge>
      )
    case 'abandoned':
      return (
        <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-100">
          Abandoned
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          In Progress
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'desktop':
      return <Monitor className="h-4 w-4 text-muted-foreground" />
    case 'tablet':
      return <Tablet className="h-4 w-4 text-muted-foreground" />
    case 'mobile':
      return <Smartphone className="h-4 w-4 text-muted-foreground" />
    default:
      return <span className="text-muted-foreground text-sm">—</span>
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function FirstImpressionParticipants({
  data,
  statusFilter,
  visibleColumns,
  displaySettings = null,
}: FirstImpressionParticipantsProps) {
  // Use extracted hook for data building, flagging, filtering, and sorting
  const {
    sortedItems,
    handleSort,
    getSortState,
    toggleExclude,
    bulkToggleExclude,
  } = useFirstImpressionParticipants({ data, statusFilter })

  // Get active columns based on visibility
  const activeColumns = useMemo(() => {
    return COLUMN_DEFINITIONS.filter((col) => visibleColumns.has(col.id))
  }, [visibleColumns])

  // Calculate column widths
  const columnWidthMap = useMemo(() => {
    return calculateColumnWidths(visibleColumns)
  }, [visibleColumns])

  // Build column widths array for ParticipantsListBase
  const columnWidths = useMemo(() => {
    return [
      '5%', // checkbox
      ...activeColumns.map((col) => columnWidthMap.get(col.id) || col.width),
    ]
  }, [activeColumns, columnWidthMap])

  // Get sort icon for header
  const getSortIcon = useCallback((field: FirstImpressionColumnId) => {
    const state = getSortState(field)
    if (state === 'none') {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    }
    return state === 'asc' ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )
  }, [getSortState])

  // ═══════════════════════════════════════════════════════════════════════════
  // CELL RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderCell = useCallback(
    (columnId: FirstImpressionColumnId, row: ExtendedRowData): React.ReactNode => {
      switch (columnId) {
        case 'participant': {
          // Resolve participant display based on settings
          const display = resolveParticipantDisplay(displaySettings, {
            index: row.index + 1,
            demographics: row.demographics,
          })
          return (
            <div className="flex flex-col">
              <span className="font-medium flex items-center">
                <span className="border-b border-dashed border-muted-foreground/50 hover:border-solid hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  {display.primary}
                </span>
                {row.isExcluded && (
                  <Badge variant="secondary" className="ml-2 text-xs">Excluded</Badge>
                )}
                <InlineFlagIndicator flags={row.qualityFlags} />
              </span>
              {display.secondary && (
                <span className="text-sm text-muted-foreground">{display.secondary}</span>
              )}
            </div>
          )
        }

        case 'status':
          return getStatusBadge(row.status)

        case 'designShown':
          if (row.designNames.length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          if (row.designNames.length === 1) {
            return <span className="truncate max-w-[200px] block">{row.designNames[0]}</span>
          }
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[200px] block cursor-help">
                    {row.designNames[0]} <span className="text-muted-foreground">+{row.designNames.length - 1}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="text-xs space-y-0.5">
                    {row.designNames.map((name, i) => (
                      <li key={i}>{i + 1}. {name}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )

        case 'exposureTime':
          return row.exposureTimeMs > 0
            ? <span>{(row.exposureTimeMs / 1000).toFixed(1)}s</span>
            : <span className="text-muted-foreground">—</span>

        case 'responseRate':
          if (row.totalQuestions === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          const rateClass = row.responseRate === 100 ? 'text-green-600 font-medium' : ''
          return (
            <span className={rateClass}>
              {row.responsesAnswered}/{row.totalQuestions}{' '}
              <span className="text-muted-foreground text-xs">({row.responseRate}%)</span>
            </span>
          )

        case 'totalTime':
          return formatTime(row.totalTimeMs)

        case 'device':
          return <DeviceIcon type={row.deviceType} />

        case 'qualityFlag':
          return <QualityFlagList flags={row.qualityFlags} maxVisible={2} compact />

        case 'identifier':
          return row.identifier
            ? <span className="truncate max-w-[100px] block">{row.identifier}</span>
            : <span className="text-muted-foreground">—</span>

        case 'source':
          if (!row.urlTags || Object.keys(row.urlTags).length === 0) {
            return <span className="text-muted-foreground">—</span>
          }
          const tagEntries = Object.entries(row.urlTags)
          const primaryTag = tagEntries[0]
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[100px] block cursor-help">
                    {primaryTag[1]}
                    {tagEntries.length > 1 && (
                      <span className="text-muted-foreground"> +{tagEntries.length - 1}</span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <ul className="text-xs space-y-0.5">
                    {tagEntries.map(([key, val]) => (
                      <li key={key}>
                        <span className="text-muted-foreground">{key}:</span> {val}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )

        case 'viewport':
          return row.viewportWidth && row.viewportHeight
            ? <span className="text-xs">{row.viewportWidth}×{row.viewportHeight}</span>
            : <span className="text-muted-foreground">—</span>

        case 'startedAt':
          return row.startedAt
            ? <span className="text-xs">{new Date(row.startedAt).toLocaleString()}</span>
            : <span className="text-muted-foreground">—</span>

        case 'completedAt':
          return row.completedAt
            ? <span className="text-xs">{new Date(row.completedAt).toLocaleString()}</span>
            : <span className="text-muted-foreground">—</span>

        case 'questionTime':
          return row.questionTimeMs > 0
            ? formatTime(row.questionTimeMs)
            : <span className="text-muted-foreground">—</span>

        default:
          return <span className="text-muted-foreground">—</span>
      }
    },
    [displaySettings]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  // Render column headers using shared GridHeaderCell
  const renderColumns = useCallback(() => (
    <>
      {activeColumns.map((col) => (
        <GridHeaderCell key={col.id} align={col.align}>
          <button
            onClick={() => handleSort(col.id)}
            className={cn(
              "inline-flex items-center gap-1.5 hover:text-foreground transition-colors",
              col.align === 'right' && 'ml-auto',
              col.align === 'center' && 'mx-auto'
            )}
          >
            {col.header}
            {getSortIcon(col.id)}
          </button>
        </GridHeaderCell>
      ))}
    </>
  ), [activeColumns, handleSort, getSortIcon])

  // Render a single row using shared grid components
  const renderRow = useCallback(
    (item: ExtendedRowData, _index: number, handlers: RowHandlers) => (
      <GridRow
        key={item.participant.id}
        onClick={handlers.onClick}
        isExcluded={item.isExcluded}
        isSelected={handlers.isSelected}
      >
        <GridCheckboxCell
          checked={handlers.isSelected}
          onCheckedChange={() => handlers.onToggleSelect()}
        />
        {activeColumns.map((col) => (
          <GridCell key={col.id} align={col.align}>
            {renderCell(col.id, item)}
          </GridCell>
        ))}
      </GridRow>
    ),
    [activeColumns, renderCell]
  )

  // Panel management via shared hook
  const { renderDetailDialog, panelState, setPanelContent, closePanel } =
    useParticipantDetailPanel<ExtendedRowData>()

  // Render panel content when selected participant changes
  useEffect(() => {
    if (!panelState) return

    const { row, handlers } = panelState

    // Combined close handler
    const handleClose = () => {
      closePanel()
      handlers.onClose()
    }

    setPanelContent(
      <ParticipantDetailPanel
        participantIndex={row.index + 1}
        identifier={row.identifier}
        participantId={row.participant.id}
        stats={{
          questionsAnswered: row.responsesAnswered,
          questionsTotal: row.totalQuestions,
          completionPercent: row.responseRate,
          timeTakenMs: row.totalTimeMs,
          status: row.status,
          startedAt: new Date(row.startedAt || Date.now()),
          completedAt: row.completedAt ? new Date(row.completedAt) : null,
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
        <FirstImpressionParticipantDetailContent
          designs={data.designs}
          participantExposures={row.exposures}
          participantResponses={row.responses}
          responsesAnswered={row.responsesAnswered}
          totalQuestions={row.totalQuestions}
          flowQuestions={data.flowQuestions}
          flowResponses={row.flowResponses}
        />
      </ParticipantDetailPanel>
    )
  }, [panelState, data.designs, data.flowQuestions, setPanelContent, closePanel])

  return (
    <ParticipantsListBase
      items={sortedItems}
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
