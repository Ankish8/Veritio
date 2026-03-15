'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  type LiveWebsiteResultType,
  type SortConfig,
  ALL_RESULT_TYPES,
  RESULT_TYPE_CONFIG,
  sortIndividualPaths,
} from '../navigation-paths/paths-utils'
import { UrlBreadcrumb } from '../navigation-paths/url-breadcrumb'
import { ResultFiltersDropdown } from '../navigation-paths/result-filters-dropdown'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { buildParticipantPaths, computeIndividualPaths, filterIndividualByResultTypes } from '../navigation-paths/paths-data'
import { formatTime } from '@/components/analysis/shared/format-time'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type {
  LiveWebsiteResponse,
  LiveWebsiteEvent,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

function SortableHeader({
  field,
  label,
  width,
  sortConfig,
  onSort,
}: {
  field: SortConfig['field']
  label: string
  width: string
  sortConfig: SortConfig
  onSort: (field: SortConfig['field']) => void
}) {
  const isActive = sortConfig.field === field
  return (
    <div
      style={{ width }}
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left cursor-pointer select-none font-medium text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          sortConfig.direction === 'asc'
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
        )}
      </span>
    </div>
  )
}

interface IndividualResponsesTableProps {
  taskId: string
  responses: LiveWebsiteResponse[]
  events: LiveWebsiteEvent[]
  participants: Participant[]
  targetUrl: string | null
  displaySettings?: ParticipantDisplaySettings | null
}

export function IndividualResponsesTable({
  taskId,
  responses,
  events,
  participants,
  targetUrl,
  displaySettings,
}: IndividualResponsesTableProps) {
  const [selectedResultTypes, setSelectedResultTypes] = useState<Set<LiveWebsiteResultType>>(
    new Set(ALL_RESULT_TYPES)
  )
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'participants',
    direction: 'desc',
  })

  const participantNumberMap = useMemo(() => {
    const map = new Map<string, number>()
    participants.forEach((p, idx) => map.set(p.id, idx + 1))
    return map
  }, [participants])

  const participantDisplayMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveParticipantDisplay>>()
    participants.forEach((p, i) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings ?? null, {
        index: i + 1,
        demographics,
      })
      map.set(p.id, display)
    })
    return map
  }, [participants, displaySettings])

  const individualPaths = useMemo(() => {
    const paths = buildParticipantPaths(taskId, events, responses, participantNumberMap, participantDisplayMap)
    return computeIndividualPaths(paths)
  }, [taskId, events, responses, participantNumberMap, participantDisplayMap])

  const filteredPaths = useMemo(() => {
    if (selectedResultTypes.size === ALL_RESULT_TYPES.length) return individualPaths
    return filterIndividualByResultTypes(individualPaths, selectedResultTypes)
  }, [individualPaths, selectedResultTypes])

  const sortedPaths = useMemo(
    () => sortIndividualPaths(filteredPaths, sortConfig),
    [filteredPaths, sortConfig]
  )

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  if (individualPaths.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Individual Responses</h4>
          <Badge variant="secondary" className="text-xs">
            {filteredPaths.length}
          </Badge>
        </div>
        <ResultFiltersDropdown
          selectedTypes={selectedResultTypes}
          onSelectedTypesChange={setSelectedResultTypes}
        />
      </div>
      {sortedPaths.length > 0 ? (
        <div className="rounded-lg border overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex border-b bg-muted/30">
              <SortableHeader field="result" label="Result" width="18%" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader field="participants" label="Participant" width="14%" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader field="time" label="Time" width="12%" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader field="steps" label="Steps" width="10%" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader field="path" label="Path" width="46%" sortConfig={sortConfig} onSort={handleSort} />
            </div>
            {sortedPaths.map((row, idx) => (
              <div
                key={`${row.participantId}-${idx}`}
                className="flex items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="px-4 py-3 flex items-center" style={{ width: '18%' }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: RESULT_TYPE_CONFIG[row.resultType].dotColor }}
                    />
                    <span className="text-sm">{RESULT_TYPE_CONFIG[row.resultType].label}</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center min-w-0" style={{ width: '14%' }}>
                  <div className="truncate">
                    <span className="text-sm font-medium">{row.displayLabel}</span>
                    {row.displaySecondary && (
                      <span className="text-xs text-muted-foreground ml-1.5 truncate">{row.displaySecondary}</span>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center" style={{ width: '12%' }}>
                  <span className="text-sm tabular-nums">{formatTime(row.durationMs)}</span>
                </div>
                <div className="px-4 py-3 flex items-center" style={{ width: '10%' }}>
                  <span className="text-sm tabular-nums">{row.urls.length}</span>
                </div>
                <div className="px-4 py-3 flex items-center min-w-0" style={{ width: '46%' }}>
                  <div className="truncate w-full">
                    <UrlBreadcrumb urls={row.urls} targetUrl={targetUrl} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No responses match the selected filters.
        </div>
      )}
    </div>
  )
}
