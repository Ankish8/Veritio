'use client'

import { useMemo, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  AnalysisTable,
  AnalysisTableRow,
  AnalysisTableCell,
  type AnalysisTableColumn,
} from '@/components/analysis/shared'
import { sortFirstClickData, type ExtendedFirstClickData, type ColumnKey, type SortConfig } from './first-click-types'

interface FirstClickTableProps {
  data: ExtendedFirstClickData[]
}

// Format time helper
function formatTime(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const columns: AnalysisTableColumn<ColumnKey>[] = [
  {
    key: 'path',
    label: 'Path',
    width: '35%',
    sortable: true,
    tooltip: 'The navigation path participants clicked, shown as a breadcrumb from root to the clicked node.',
  },
  {
    key: 'correctFirstClick',
    label: 'Correct first click',
    width: '15%',
    sortable: true,
    tooltip: 'Whether this path leads toward the correct answer. "Yes" means clicking here first was a good choice.',
  },
  {
    key: 'clickedFirst',
    label: 'Clicked first',
    width: '17%',
    sortable: true,
    tooltip: 'Percentage of participants who clicked this path as their very first action in the task.',
  },
  {
    key: 'clickedDuringTask',
    label: 'Clicked during task',
    width: '18%',
    sortable: true,
    tooltip: 'Percentage of participants who clicked this path at any point while completing the task.',
  },
  {
    key: 'avgTime',
    label: 'Avg. time',
    width: '15%',
    sortable: false,
    tooltip: 'Average time participants took before clicking this path for the first time.',
  },
]

const gridColumns = columns.map(c => c.width).join(' ')

/**
 * Sortable table displaying first click analysis data.
 */
export function FirstClickTable({ data }: FirstClickTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'clickedFirst',
    direction: 'desc',
  })

  // Sort data based on current sort configuration
  const sortedData = useMemo(
    () => sortFirstClickData(data, sortConfig),
    [data, sortConfig]
  )

  const handleSort = (key: ColumnKey) => {
    if (key === 'avgTime') return
    setSortConfig(prev => ({
      field: key,
      direction: prev.field === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <div data-pdf-chart="first-click-table">
      <AnalysisTable
        columns={columns}
        data={sortedData}
        sortColumn={sortConfig.field}
        sortDirection={sortConfig.direction}
        onSort={handleSort}
        emptyMessage="No first click data available for this task."
        renderRow={(item) => (
          <AnalysisTableRow key={item.nodeId} gridColumns={gridColumns}>
            {/* Path column with truncation and tooltip */}
            <AnalysisTableCell className="font-medium">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate">
                    {item.breadcrumbPathString}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p>{item.breadcrumbPathString}</p>
                </TooltipContent>
              </Tooltip>
            </AnalysisTableCell>

            {/* Correct first click badge */}
            <AnalysisTableCell>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  item.isOnCorrectPath
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {item.isOnCorrectPath ? 'Yes' : 'No'}
              </span>
            </AnalysisTableCell>

            {/* Clicked first percentage */}
            <AnalysisTableCell>
              <span className="font-medium">{item.percentage.toFixed(0)}%</span>
              <span className="text-muted-foreground ml-1">({item.count})</span>
            </AnalysisTableCell>

            {/* Clicked during task percentage */}
            <AnalysisTableCell>
              <span className="font-medium">
                {item.clickedDuringTaskPercentage.toFixed(0)}%
              </span>
              <span className="text-muted-foreground ml-1">
                ({item.clickedDuringTaskCount})
              </span>
            </AnalysisTableCell>

            {/* Average time to first click */}
            <AnalysisTableCell className="text-muted-foreground">
              {formatTime(item.avgTimeToFirstClickMs)}
            </AnalysisTableCell>
          </AnalysisTableRow>
        )}
      />
    </div>
  )
}
