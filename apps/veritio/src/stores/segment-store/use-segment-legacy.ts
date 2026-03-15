/**
 * Legacy Segment Hook (Compatibility Layer)
 *
 * This hook provides the same interface as the old useSegment() context hook.
 * Use it during migration to avoid breaking existing components.
 *
 * WARNING: This hook has the same performance characteristics as the old Context:
 * - Subscribes to many store values at once
 * - Changes to any value cause re-renders
 *
 * For new code, prefer using individual selectors:
 * - useFilteredParticipantIds()
 * - useIsFiltering()
 * - useSegmentActions()
 * - etc.
 *
 * @deprecated Use individual selectors from segment-store instead
 */

import { useSegmentStore } from './store'

/**
 * @deprecated Use individual selectors instead
 */
export function useSegmentLegacy() {
  // Subscribe to individual state slices to avoid re-render on unrelated changes
  // This is the Zustand v5 recommended pattern for multiple values
  const filters = useSegmentStore((s) => s.filters)
  const filteredParticipantIds = useSegmentStore((s) => s.filteredParticipantIds)
  const totalParticipants = useSegmentStore((s) => s.totalParticipants)
  const conditionsV2 = useSegmentStore((s) => s.conditionsV2)
  const savedSegments = useSegmentStore((s) => s.savedSegments)
  const activeSegmentId = useSegmentStore((s) => s.activeSegmentId)
  const comparisonSegmentId = useSegmentStore((s) => s.comparisonSegmentId)
  const comparisonParticipantIds = useSegmentStore((s) => s.comparisonParticipantIds)

  // Actions (stable references, don't cause re-renders)
  const addFilter = useSegmentStore((s) => s.addFilter)
  const updateFilter = useSegmentStore((s) => s.updateFilter)
  const removeFilter = useSegmentStore((s) => s.removeFilter)
  const clearFilters = useSegmentStore((s) => s.clearFilters)
  const setSavedSegments = useSegmentStore((s) => s.setSavedSegments)
  const applySegment = useSegmentStore((s) => s.applySegment)
  const clearSegment = useSegmentStore((s) => s.clearSegment)
  const setComparisonSegment = useSegmentStore((s) => s.setComparisonSegment)

  return {
    filters,
    filteredParticipantIds,
    totalParticipants,
    filteredCount: filteredParticipantIds?.size ?? totalParticipants,
    isFiltering: conditionsV2.groups.some((g) => g.conditions.length > 0),
    savedSegments,
    activeSegmentId,
    comparisonSegmentId,
    comparisonParticipantIds,
    isComparing: comparisonSegmentId !== null,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    setSavedSegments,
    applySegment,
    clearSegment,
    setComparisonSegment,
  }
}
