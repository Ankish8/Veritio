'use client'

import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { AggregatedPathData, IndividualPathData, SortConfig } from './paths-types'
import { sortAggregatedPaths, sortIndividualPaths } from './paths-utils'
import {
  ColumnHeader,
  ResultBadge,
  PathCell,
  virtualRowStyle,
  gridHeaderStyle,
  columnTooltips,
  ROW_HEIGHT,
} from './paths-table-cells'

interface PathsTableProps {
  aggregatedData: AggregatedPathData[]
  individualData: IndividualPathData[]
  showAllParticipants: boolean
  onParticipantClick: (participantId: string) => void
}

/**
 * Sortable table for displaying paths data.
 * Two modes: aggregated (unique paths) and individual (all participants).
 */
export function PathsTable({
  aggregatedData,
  individualData,
  showAllParticipants,
  onParticipantClick,
}: PathsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'participants',
    direction: 'desc',
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const sortedAggregatedData = useMemo(
    () => sortAggregatedPaths(aggregatedData, sortConfig),
    [aggregatedData, sortConfig]
  )

  const sortedIndividualData = useMemo(
    () => sortIndividualPaths(individualData, sortConfig),
    [individualData, sortConfig]
  )

  const activeData = showAllParticipants ? sortedIndividualData : sortedAggregatedData

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: activeData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  if (activeData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No paths match the selected filters.
      </div>
    )
  }

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[500px]">
        {/* Fixed header */}
        <div className="shrink-0 overflow-y-hidden" style={{ scrollbarGutter: 'stable' }}>
          <div className="border-b min-w-[500px]" style={gridHeaderStyle}>
            <ColumnHeader
              label="Result"
              tooltip={columnTooltips.result}
              sortField="result"
              currentSort={sortConfig}
              onSort={handleSort}
            />
            <ColumnHeader
              label={showAllParticipants ? 'Participant' : 'Participants'}
              tooltip={showAllParticipants ? columnTooltips.participant : columnTooltips.participants}
              sortField="participants"
              currentSort={sortConfig}
              onSort={handleSort}
            />
            <ColumnHeader
              label="Path"
              tooltip={columnTooltips.path}
              sortField="path"
              currentSort={sortConfig}
              onSort={handleSort}
            />
          </div>
        </div>

        {/* Scrollable virtualized body */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
          <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
            {virtualItems.map((virtualItem) => {
              if (showAllParticipants) {
                const row = sortedIndividualData[virtualItem.index]
                return (
                  <div key={row.responseId} className="border-b hover:bg-muted/50 transition-colors min-w-[500px]" style={virtualRowStyle(virtualItem)}>
                    <div className="px-4 py-3"><ResultBadge resultType={row.resultType} /></div>
                    <div className="px-4 py-3">
                      <button type="button" onClick={() => onParticipantClick(row.participantId)} className="text-sm text-primary hover:underline font-medium">
                        Participant {row.participantIndex}
                      </button>
                    </div>
                    <PathCell breadcrumbPath={row.breadcrumbPath} breadcrumbString={row.breadcrumbString} />
                  </div>
                )
              }
              const row = sortedAggregatedData[virtualItem.index]
              return (
                <div key={row.pathKey} className="border-b hover:bg-muted/50 transition-colors min-w-[500px]" style={virtualRowStyle(virtualItem)}>
                  <div className="px-4 py-3"><ResultBadge resultType={row.resultType} /></div>
                  <div className="px-4 py-3 text-sm text-foreground">
                    <span className="font-medium">{row.participantCount}</span>
                    <span className="text-muted-foreground ml-1">({row.percentage}%)</span>
                  </div>
                  <PathCell breadcrumbPath={row.breadcrumbPath} breadcrumbString={row.breadcrumbString} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
