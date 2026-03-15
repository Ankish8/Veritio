'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUp, ArrowDown, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  type AggregatedPathData,
  type IndividualPathData,
  type SortConfig,
  RESULT_TYPE_CONFIG,
  sortAggregatedPaths,
  sortIndividualPaths,
  formatTime,
} from './paths-utils'
import { UrlBreadcrumb } from './url-breadcrumb'

const COL_WIDTHS = {
  result: '18%',
  participants: '14%',
  time: '12%',
  steps: '10%',
  path: '46%',
} as const

const ROW_HEIGHT = 52

const EMPTY_STATE = (
  <div className="text-center py-8 text-muted-foreground text-sm">
    No paths match the selected filters.
  </div>
)

// ─── Sub-components ─────────────────────────────────────────────────────────

function ResultBadge({ resultType }: { resultType: string }) {
  const config = RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]
  if (!config) return null

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      <span className="text-sm">{config.label}</span>
    </div>
  )
}

function HeaderCell({
  field,
  label,
  tooltip,
  width,
  sortConfig,
  onSort,
}: {
  field: SortConfig['field']
  label: string
  tooltip: string
  width: string
  sortConfig: SortConfig
  onSort: (field: SortConfig['field']) => void
}) {
  const isActive = sortConfig.field === field
  const SortIcon = sortConfig.direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <div
      style={{ width }}
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left cursor-pointer select-none font-medium text-sm text-muted-foreground hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <Info
              className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help"
              onClick={(e) => e.stopPropagation()}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        {isActive && <SortIcon className="h-3.5 w-3.5 text-slate-600" />}
      </span>
    </div>
  )
}

/** Shared cell wrapper with consistent padding and width. */
function Cell({ width, className, children }: { width: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-4 py-3 flex items-center', className)} style={{ width }}>
      {children}
    </div>
  )
}

// ─── Column Configs ─────────────────────────────────────────────────────────

interface ColumnDef {
  field: SortConfig['field']
  label: string
  tooltip: string
}

const AGGREGATED_COLUMNS: ColumnDef[] = [
  { field: 'result', label: 'Result', tooltip: 'How the participant completed (or didn\'t complete) the task.' },
  { field: 'participants', label: 'Participants', tooltip: 'Number and percentage of participants who took this path.' },
  { field: 'time', label: 'Avg Time', tooltip: 'Average time taken to complete this path.' },
  { field: 'steps', label: 'Steps', tooltip: 'Number of unique pages visited.' },
  { field: 'path', label: 'Path', tooltip: 'The sequence of URLs visited.' },
]

const INDIVIDUAL_COLUMNS: ColumnDef[] = [
  { field: 'result', label: 'Result', tooltip: 'How the participant completed (or didn\'t complete) the task.' },
  { field: 'participants', label: 'Participant', tooltip: 'Participant index. Click a row for details.' },
  { field: 'time', label: 'Time', tooltip: 'Time taken by this participant.' },
  { field: 'steps', label: 'Steps', tooltip: 'Number of unique pages visited.' },
  { field: 'path', label: 'Path', tooltip: 'The sequence of URLs visited.' },
]

// ─── Props ──────────────────────────────────────────────────────────────────

interface PathsTableProps {
  aggregatedData: AggregatedPathData[]
  individualData: IndividualPathData[]
  showAllParticipants: boolean
  targetUrl?: string | null
  maxHeight?: string
  onAggregatedPathClick?: (path: AggregatedPathData, index: number) => void
  onIndividualPathClick?: (path: IndividualPathData, index: number) => void
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PathsTable({
  aggregatedData,
  individualData,
  showAllParticipants,
  targetUrl,
  maxHeight = '500px',
  onAggregatedPathClick,
  onIndividualPathClick,
}: PathsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'participants',
    direction: 'desc',
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const sortedAggregated = useMemo(
    () => sortAggregatedPaths(aggregatedData, sortConfig),
    [aggregatedData, sortConfig]
  )

  const sortedIndividual = useMemo(
    () => sortIndividualPaths(individualData, sortConfig),
    [individualData, sortConfig]
  )

  const data = showAllParticipants ? sortedIndividual : sortedAggregated
  const columns = showAllParticipants ? INDIVIDUAL_COLUMNS : AGGREGATED_COLUMNS

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  if (data.length === 0) return EMPTY_STATE

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="rounded-lg border">
      <div className="flex border-b bg-slate-50/50">
        {columns.map((col) => (
          <HeaderCell
            key={col.field}
            field={col.field}
            label={col.label}
            tooltip={col.tooltip}
            width={COL_WIDTHS[col.field]}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ))}
      </div>

      <div ref={scrollContainerRef} className="overflow-auto" style={{ maxHeight }}>
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            if (showAllParticipants) {
              const row = sortedIndividual[virtualItem.index]
              return (
                <div
                  key={`${row.participantId}-${virtualItem.index}`}
                  className={cn(
                    'flex items-center border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                    onIndividualPathClick && 'cursor-pointer'
                  )}
                  onClick={() => onIndividualPathClick?.(row, virtualItem.index)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <Cell width={COL_WIDTHS.result}>
                    <ResultBadge resultType={row.resultType} />
                  </Cell>
                  <Cell width={COL_WIDTHS.participants} className="min-w-0">
                    <div className="truncate">
                      <span className="text-sm font-medium">{row.displayLabel}</span>
                      {row.displaySecondary && (
                        <span className="text-xs text-muted-foreground ml-1.5 truncate">{row.displaySecondary}</span>
                      )}
                    </div>
                  </Cell>
                  <Cell width={COL_WIDTHS.time}>
                    <span className="text-sm tabular-nums">{formatTime(row.durationMs)}</span>
                  </Cell>
                  <Cell width={COL_WIDTHS.steps}>
                    <span className="text-sm tabular-nums">{row.urls.length}</span>
                  </Cell>
                  <Cell width={COL_WIDTHS.path} className="min-w-0">
                    <div className="truncate w-full">
                      <UrlBreadcrumb urls={row.urls} targetUrl={targetUrl} />
                    </div>
                  </Cell>
                </div>
              )
            }

            const row = sortedAggregated[virtualItem.index]
            return (
              <div
                key={row.pathKey}
                className={cn(
                  'flex items-center border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                  onAggregatedPathClick && 'cursor-pointer'
                )}
                onClick={() => onAggregatedPathClick?.(row, virtualItem.index)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <Cell width={COL_WIDTHS.result}>
                  <ResultBadge resultType={row.resultType} />
                </Cell>
                <Cell width={COL_WIDTHS.participants}>
                  <span className="font-medium tabular-nums">{row.participantCount}</span>
                  <span className="text-muted-foreground ml-1">({row.percentage}%)</span>
                </Cell>
                <Cell width={COL_WIDTHS.time}>
                  <span className="text-sm tabular-nums">{formatTime(row.avgDurationMs)}</span>
                </Cell>
                <Cell width={COL_WIDTHS.steps}>
                  <span className="text-sm tabular-nums">{row.urlSequence.length}</span>
                </Cell>
                <Cell width={COL_WIDTHS.path} className="min-w-0">
                  <div className="truncate w-full">
                    <UrlBreadcrumb urls={row.urlSequence} targetUrl={targetUrl} />
                  </div>
                </Cell>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
