'use client'

import { ArrowUp, ArrowDown, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PrototypeTestFrame, Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import {
  type AggregatedPathData,
  type IndividualPathData,
  type SortConfig,
  RESULT_TYPE_CONFIG,
} from './paths-utils'
import { PathBreadcrumb } from './path-breadcrumb'
import { usePathsTableState, COL_WIDTHS } from './use-paths-table-state'

interface PathsTableProps {
  aggregatedData: AggregatedPathData[]
  individualData: IndividualPathData[]
  showAllParticipants: boolean
  showThumbnails: boolean
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
  onParticipantClick: (participantId: string) => void
  /** Participant display settings for showing names/emails instead of Participant N */
  displaySettings?: ParticipantDisplaySettings | null
  /** Participants data for extracting demographics */
  participants?: Participant[]
  /** Max height for scrollable body (default '500px') */
  maxHeight?: string
  /** Called when an aggregated path row is clicked */
  onAggregatedPathClick?: (path: AggregatedPathData, index: number) => void
  /** Called when an individual path row is clicked */
  onIndividualPathClick?: (path: IndividualPathData, index: number) => void
}

// Column header tooltips
const columnTooltips = {
  result: 'The success status of the participant\'s path during a given task.',
  participants: 'The count and percentage of participants who took this path.',
  participant: 'Click to view participant details.',
  path: 'The screens visited when navigating the task.',
}

// Info icon with tooltip for column headers
function ColumnInfo({ tooltipKey }: { tooltipKey: keyof typeof columnTooltips }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help"
          onClick={(e) => e.stopPropagation()}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-sm">{columnTooltips[tooltipKey]}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Result badge component
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

function SortIndicator({ field, sortConfig }: { field: SortConfig['field']; sortConfig: SortConfig }) {
  if (sortConfig.field !== field) return null
  return sortConfig.direction === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 text-slate-600" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
  )
}

function HeaderCell({
  field,
  label,
  tooltipKey,
  width,
  sortConfig,
  onSort,
}: {
  field: SortConfig['field']
  label: string
  tooltipKey: keyof typeof columnTooltips
  width: string
  sortConfig: SortConfig
  onSort: (field: SortConfig['field']) => void
}) {
  return (
    <div
      style={{ width }}
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left cursor-pointer select-none font-medium text-sm text-muted-foreground hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <ColumnInfo tooltipKey={tooltipKey} />
        <SortIndicator field={field} sortConfig={sortConfig} />
      </span>
    </div>
  )
}

function ParticipantCell({
  display,
  participantId,
  onParticipantClick,
}: {
  display: { primary: string; secondary: string | null }
  participantId: string
  onParticipantClick: (participantId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onParticipantClick(participantId)
      }}
      className="text-left"
    >
      <span className="text-sm text-primary hover:underline font-medium block">
        {display.primary}
      </span>
      {display.secondary && (
        <span className="text-xs text-muted-foreground block">
          {display.secondary}
        </span>
      )}
    </button>
  )
}

/**
 * Sortable table for displaying paths data.
 * Two modes: aggregated (unique paths) and individual (all participants).
 * Supports text breadcrumbs or frame thumbnails.
 * Uses div-based layout for proper virtualization support.
 */
export function PathsTable({
  aggregatedData,
  individualData,
  showAllParticipants,
  showThumbnails,
  frameMap,
  goalFrameIds,
  onParticipantClick,
  displaySettings,
  participants,
  maxHeight = '500px',
  onAggregatedPathClick,
  onIndividualPathClick,
}: PathsTableProps) {
  const {
    sortConfig,
    scrollContainerRef,
    sortedAggregatedData,
    sortedIndividualData,
    participantDisplayMap,
    aggregatedVirtualizer,
    individualVirtualizer,
    handleSort,
  } = usePathsTableState({
    aggregatedData,
    individualData,
    showThumbnails,
    displaySettings,
    participants,
  })

  // Aggregated mode - unique paths with participant counts
  if (!showAllParticipants) {
    if (sortedAggregatedData.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500">
          No paths match the selected filters.
        </div>
      )
    }

    const virtualItems = aggregatedVirtualizer.getVirtualItems()

    return (
      <div className="rounded-lg border">
        {/* Fixed header */}
        <div className="flex border-b bg-slate-50/50">
          <HeaderCell
            field="result"
            label="Result"
            tooltipKey="result"
            width={COL_WIDTHS.result}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <HeaderCell
            field="participants"
            label="# of Participants"
            tooltipKey="participants"
            width={COL_WIDTHS.participants}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <HeaderCell
            field="path"
            label="Path"
            tooltipKey="path"
            width={COL_WIDTHS.path}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>

        {/* Scrollable virtualized body */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <div
            style={{
              height: aggregatedVirtualizer.getTotalSize(),
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const row = sortedAggregatedData[virtualItem.index]
              return (
                <div
                  key={row.pathKey}
                  className={cn(
                    'flex items-center border-b last:border-b-0 hover:bg-slate-50/50',
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
                  {/* Result cell */}
                  <div
                    className="px-4 py-3 flex items-center"
                    style={{ width: COL_WIDTHS.result }}
                  >
                    <ResultBadge resultType={row.resultType} />
                  </div>

                  {/* Participants cell */}
                  <div
                    className="px-4 py-3 flex items-center"
                    style={{ width: COL_WIDTHS.participants }}
                  >
                    <span className="font-medium">{row.participantCount}</span>
                    <span className="text-slate-500 ml-1">({row.percentage}%)</span>
                  </div>

                  {/* Path cell */}
                  <div
                    className="px-4 py-3 flex items-center min-w-0"
                    style={{ width: COL_WIDTHS.path }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="truncate w-full">
                          <PathBreadcrumb
                            pathFrameIds={row.pathTaken}
                            frameLabels={row.frameLabels}
                            showThumbnails={showThumbnails}
                            frameMap={frameMap}
                            goalFrameIds={goalFrameIds}
                            richSteps={row.richSteps}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p>{row.breadcrumbString}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Individual mode - all participants with clickable names
  if (sortedIndividualData.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No paths match the selected filters.
      </div>
    )
  }

  const individualVirtualItems = individualVirtualizer.getVirtualItems()

  return (
    <div className="rounded-lg border">
      {/* Fixed header */}
      <div className="flex border-b bg-slate-50/50">
        <HeaderCell
          field="result"
          label="Result"
          tooltipKey="result"
          width={COL_WIDTHS.result}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
        <HeaderCell
          field="participants"
          label="Participant"
          tooltipKey="participant"
          width={COL_WIDTHS.participants}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
        <HeaderCell
          field="path"
          label="Path"
          tooltipKey="path"
          width={COL_WIDTHS.path}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>

      {/* Scrollable virtualized body */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: individualVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {individualVirtualItems.map((virtualItem) => {
            const row = sortedIndividualData[virtualItem.index]
            return (
              <div
                key={row.attemptId}
                className={cn(
                  'flex items-center border-b last:border-b-0 hover:bg-slate-50/50',
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
                {/* Result cell */}
                <div
                  className="px-4 py-3 flex items-center"
                  style={{ width: COL_WIDTHS.result }}
                >
                  <ResultBadge resultType={row.resultType} />
                </div>

                {/* Participant cell */}
                <div
                  className="px-4 py-3 flex items-center"
                  style={{ width: COL_WIDTHS.participants }}
                >
                  <ParticipantCell
                    display={participantDisplayMap.get(row.participantId) || {
                      primary: `Participant ${row.participantIndex}`,
                      secondary: null,
                    }}
                    participantId={row.participantId}
                    onParticipantClick={onParticipantClick}
                  />
                </div>

                {/* Path cell */}
                <div
                  className="px-4 py-3 flex items-center min-w-0"
                  style={{ width: COL_WIDTHS.path }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate w-full">
                        <PathBreadcrumb
                          pathFrameIds={row.pathTaken}
                          frameLabels={row.frameLabels}
                          showThumbnails={showThumbnails}
                          frameMap={frameMap}
                          goalFrameIds={goalFrameIds}
                          richSteps={row.richSteps}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-md">
                      <p>{row.breadcrumbString}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
