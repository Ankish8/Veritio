'use client'

import { useState, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AnalysisTable,
  AnalysisTableRow,
  AnalysisTableCell,
  type AnalysisTableColumn,
} from '@/components/analysis/shared'
import {
  type DestinationData,
  type DestinationSortConfig,
  sortDestinations,
  getTotalParticipantCount,
} from './destinations-utils'

interface DestinationsTableProps {
  correctDestinations: DestinationData[]
  incorrectDestinations: DestinationData[]
  totalResponses: number
}

type SortKey = 'destination' | 'participants'

const columns: AnalysisTableColumn<SortKey>[] = [
  {
    key: 'destination',
    label: 'Destination',
    width: '70%',
    sortable: true,
    tooltip: 'The path to the destination node selected by participants.',
  },
  {
    key: 'participants',
    label: '# of participants',
    width: '30%',
    sortable: true,
    align: 'right',
    tooltip: 'The count and percentage of participants who selected this destination.',
  },
]

const gridColumns = columns.map(c => c.width).join(' ')

interface DestinationSectionProps {
  title: string
  destinations: DestinationData[]
  totalResponses: number
  isCorrect: boolean
  sortConfig: DestinationSortConfig
  onSort: (field: DestinationSortConfig['field']) => void
}

// Breadcrumb component with colored final node
function DestinationBreadcrumb({ path, isCorrectDest }: { path: string[]; isCorrectDest: boolean }) {
  return (
    <div className="flex items-center flex-wrap gap-0.5 text-sm">
      {path.map((label, index) => (
        <span key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
          )}
          <span
            className={
              index === path.length - 1
                ? isCorrectDest
                  ? 'text-green-600 font-medium'
                  : 'text-red-600 font-medium'
                : 'text-muted-foreground'
            }
          >
            {label}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * Single destination section (correct or incorrect).
 */
function DestinationSection({
  title,
  destinations,
  totalResponses,
  isCorrect,
  sortConfig,
  onSort,
}: DestinationSectionProps) {
  // Sort destinations
  const sortedDestinations = useMemo(
    () => sortDestinations(destinations, sortConfig),
    [destinations, sortConfig]
  )

  // Calculate section participant count
  const sectionParticipantCount = getTotalParticipantCount(destinations)

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <span className="text-sm text-muted-foreground">
          {sectionParticipantCount} of {totalResponses} participants
        </span>
      </div>

      {/* Table */}
      <AnalysisTable
        columns={columns}
        data={sortedDestinations}
        sortColumn={sortConfig.field}
        sortDirection={sortConfig.direction}
        onSort={(field) => onSort(field as DestinationSortConfig['field'])}
        emptyMessage={`No ${isCorrect ? 'correct' : 'incorrect'} destinations`}
        renderRow={(destination) => (
          <AnalysisTableRow key={destination.nodeId} gridColumns={gridColumns}>
            <AnalysisTableCell>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="truncate">
                    <DestinationBreadcrumb
                      path={destination.breadcrumbPath}
                      isCorrectDest={isCorrect}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p>{destination.breadcrumbString}</p>
                </TooltipContent>
              </Tooltip>
            </AnalysisTableCell>
            <AnalysisTableCell align="right">
              <span className="font-medium">{destination.participantCount}</span>
              <span className="text-muted-foreground ml-1">
                ({destination.percentage}%)
              </span>
            </AnalysisTableCell>
          </AnalysisTableRow>
        )}
      />
    </div>
  )
}

/**
 * Destinations table with two sections: correct and incorrect destinations.
 * Shows where participants ended up for each task.
 */
export function DestinationsTable({
  correctDestinations,
  incorrectDestinations,
  totalResponses,
}: DestinationsTableProps) {
  const defaultSort: DestinationSortConfig = { field: 'participants', direction: 'desc' }
  const [correctSortConfig, setCorrectSortConfig] = useState<DestinationSortConfig>(defaultSort)
  const [incorrectSortConfig, setIncorrectSortConfig] = useState<DestinationSortConfig>(defaultSort)

  const toggleSort = (
    setter: React.Dispatch<React.SetStateAction<DestinationSortConfig>>
  ) => (field: DestinationSortConfig['field']) => {
    setter(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <div className="space-y-6">
      <DestinationSection
        title="Correct destinations"
        destinations={correctDestinations}
        totalResponses={totalResponses}
        isCorrect={true}
        sortConfig={correctSortConfig}
        onSort={toggleSort(setCorrectSortConfig)}
      />

      <DestinationSection
        title="Incorrect destinations"
        destinations={incorrectDestinations}
        totalResponses={totalResponses}
        isCorrect={false}
        sortConfig={incorrectSortConfig}
        onSort={toggleSort(setIncorrectSortConfig)}
      />
    </div>
  )
}
