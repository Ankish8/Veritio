import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'
import {
  type AggregatedPathData,
  type IndividualPathData,
  type SortConfig,
  sortAggregatedPaths,
  sortIndividualPaths,
} from './paths-utils'

const TEXT_ROW_HEIGHT = 52
const THUMBNAIL_ROW_HEIGHT = 60

export const COL_WIDTHS = {
  result: '20%',
  participants: '20%',
  path: '60%',
} as const

/**
 * Hook that manages paths table state: sorting, virtualization, and participant display.
 */
export function usePathsTableState({
  aggregatedData,
  individualData,
  showThumbnails,
  displaySettings,
  participants,
}: {
  aggregatedData: AggregatedPathData[]
  individualData: IndividualPathData[]
  showThumbnails: boolean
  displaySettings?: ParticipantDisplaySettings | null
  participants?: Participant[]
}) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'participants',
    direction: 'desc',
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rowHeight = showThumbnails ? THUMBNAIL_ROW_HEIGHT : TEXT_ROW_HEIGHT

  const sortedAggregatedData = useMemo(
    () => sortAggregatedPaths(aggregatedData, sortConfig),
    [aggregatedData, sortConfig]
  )

  const sortedIndividualData = useMemo(
    () => sortIndividualPaths(individualData, sortConfig),
    [individualData, sortConfig]
  )

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const aggregatedVirtualizer = useVirtualizer({
    count: sortedAggregatedData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  const individualVirtualizer = useVirtualizer({
    count: sortedIndividualData.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  return {
    sortConfig,
    scrollContainerRef,
    sortedAggregatedData,
    sortedIndividualData,
    participantDisplayMap,
    aggregatedVirtualizer,
    individualVirtualizer,
    handleSort,
  }
}
