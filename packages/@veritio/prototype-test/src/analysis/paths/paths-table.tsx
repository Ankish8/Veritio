'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUp, ArrowDown, Info, ChevronRight, ImageIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import { cn } from '@veritio/ui'
import type { PrototypeTestFrame, Participant } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@veritio/prototype-test/lib/utils/participant-display'
import {
  type AggregatedPathData,
  type IndividualPathData,
  type SortConfig,
  RESULT_TYPE_CONFIG,
  sortAggregatedPaths,
  sortIndividualPaths,
} from './paths-utils'

interface PathsTableProps {
  aggregatedData: AggregatedPathData[]
  individualData: IndividualPathData[]
  showAllParticipants: boolean
  showThumbnails: boolean
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
  onParticipantClick: (participantId: string) => void
  displaySettings?: ParticipantDisplaySettings | null
  participants?: Participant[]
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

// Path breadcrumb component with text or thumbnails
function PathBreadcrumb({
  pathFrameIds,
  frameLabels,
  showThumbnails,
  frameMap,
  goalFrameIds,
}: {
  pathFrameIds: string[]
  frameLabels: string[]
  showThumbnails: boolean
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
}) {
  if (showThumbnails) {
    return (
      <div className="flex items-center flex-wrap gap-1">
        {pathFrameIds.map((frameId, index) => {
          const frame = frameMap.get(frameId)
          const isGoal = goalFrameIds.has(frameId)

          return (
            <div key={`${frameId}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-12 h-9 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0',
                      isGoal && 'ring-2 ring-green-500 ring-offset-1'
                    )}
                  >
                    {frame?.thumbnail_url ? (
                      <img
                        src={frame.thumbnail_url}
                        alt={frame.name || 'Frame'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">{frame?.name || 'Unknown frame'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )
        })}
      </div>
    )
  }

  // Text mode
  return (
    <div className="flex items-center flex-wrap gap-0.5 text-sm">
      {frameLabels.map((label, index) => {
        const frameId = pathFrameIds[index]
        const isGoal = goalFrameIds.has(frameId)

        return (
          <span key={`${frameId}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            )}
            <span
              className={cn(
                'text-muted-foreground',
                isGoal && 'text-green-600 font-medium'
              )}
            >
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}

// Row heights
const TEXT_ROW_HEIGHT = 52
const THUMBNAIL_ROW_HEIGHT = 60

// Column widths as percentages
const COL_WIDTHS = {
  result: '20%',
  participants: '20%',
  path: '60%',
}
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
}: PathsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'participants',
    direction: 'desc',
  })

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const rowHeight = showThumbnails ? THUMBNAIL_ROW_HEIGHT : TEXT_ROW_HEIGHT

  // Sort data based on mode
  const sortedAggregatedData = useMemo(
    () => sortAggregatedPaths(aggregatedData, sortConfig),
    [aggregatedData, sortConfig]
  )

  const sortedIndividualData = useMemo(
    () => sortIndividualPaths(individualData, sortConfig),
    [individualData, sortConfig]
  )

  // Create a map of participantId -> display for individual mode
  const participantDisplayMap = useMemo(() => {
    const map = new Map<string, { primary: string; secondary: string | null }>()
    if (!participants) return map

    participants.forEach((p, index) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings, {
        index: index + 1,
        demographics,
      })
      map.set(p.id, display)
    })
    return map
  }, [participants, displaySettings])

  // Virtualizer for aggregated mode
  const aggregatedVirtualizer = useVirtualizer({
    count: sortedAggregatedData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  // Virtualizer for individual mode
  const individualVirtualizer = useVirtualizer({
    count: sortedIndividualData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  // Handle sort toggle
  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortConfig['field'] }) => {
    if (sortConfig.field !== field) return null
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-600" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
    )
  }

  // Header cell component
  const HeaderCell = ({
    field,
    label,
    tooltipKey,
    width,
  }: {
    field: SortConfig['field']
    label: string
    tooltipKey: keyof typeof columnTooltips
    width: string
  }) => (
    <div
      style={{ width }}
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left cursor-pointer select-none font-medium text-sm text-muted-foreground hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <ColumnInfo tooltipKey={tooltipKey} />
        <SortIndicator field={field} />
      </span>
    </div>
  )

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
          />
          <HeaderCell
            field="participants"
            label="# of Participants"
            tooltipKey="participants"
            width={COL_WIDTHS.participants}
          />
          <HeaderCell
            field="path"
            label="Path"
            tooltipKey="path"
            width={COL_WIDTHS.path}
          />
        </div>

        {/* Scrollable virtualized body */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto"
          style={{ maxHeight: '500px' }}
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
                  className="flex items-center border-b last:border-b-0 hover:bg-slate-50/50"
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
        />
        <HeaderCell
          field="participants"
          label="Participant"
          tooltipKey="participant"
          width={COL_WIDTHS.participants}
        />
        <HeaderCell
          field="path"
          label="Path"
          tooltipKey="path"
          width={COL_WIDTHS.path}
        />
      </div>

      {/* Scrollable virtualized body */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto"
        style={{ maxHeight: '500px' }}
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
                className="flex items-center border-b last:border-b-0 hover:bg-slate-50/50"
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
                  {(() => {
                    const display = participantDisplayMap.get(row.participantId) || {
                      primary: `Participant ${row.participantIndex}`,
                      secondary: null,
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => onParticipantClick(row.participantId)}
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
                  })()}
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
