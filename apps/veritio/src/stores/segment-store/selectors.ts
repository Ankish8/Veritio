/**
 * Granular Selectors for Segment Store
 *
 * These selectors provide fine-grained subscriptions to specific parts of the store,
 * preventing unnecessary re-renders when unrelated state changes.
 */

import { useSegmentStore } from './store'

// =============================================================================
// STATE SELECTORS
// =============================================================================

/**
 * Get filtered participant IDs (null = no filtering active)
 * Use this instead of destructuring from useSegment()
 */
export const useFilteredParticipantIds = () =>
  useSegmentStore((state) => state.filteredParticipantIds)

/**
 * Get total participant count
 */
export const useTotalParticipants = () =>
  useSegmentStore((state) => state.totalParticipants)

/**
 * Get current filters (first group's conditions for backwards compatibility)
 */
export const useSegmentFilters = () =>
  useSegmentStore((state) => state.filters)

/**
 * Check if comparison mode is active
 */
export const useIsComparing = () =>
  useSegmentStore((state) => state.comparisonSegmentId !== null)

// =============================================================================
// ACTION SELECTORS
// =============================================================================

/**
 * Get all segment actions without subscribing to state changes.
 * Actions are stable references that don't change.
 *
 * @example
 * const { addFilter, removeFilter, clearFilters } = useSegmentActions()
 */
export function useSegmentActions() {
  return useSegmentStore((state) => ({
    // Filter actions
    addFilter: state.addFilter,
    updateFilter: state.updateFilter,
    removeFilter: state.removeFilter,
    clearFilters: state.clearFilters,

    // V2 group actions
    addConditionGroup: state.addConditionGroup,
    removeConditionGroup: state.removeConditionGroup,
    addConditionToGroup: state.addConditionToGroup,
    updateConditionInGroup: state.updateConditionInGroup,
    removeConditionFromGroup: state.removeConditionFromGroup,
    setConditionsV2: state.setConditionsV2,

    // Saved segments actions
    setSavedSegments: state.setSavedSegments,
    applySegment: state.applySegment,
    clearSegment: state.clearSegment,

    // Comparison mode actions
    setComparisonSegment: state.setComparisonSegment,
    clearComparison: state.clearComparison,

    // Data sync
    applyFilters: state.applyFilters,

    // Reset
    reset: state.reset,
  }))
}

// =============================================================================
// COMPOUND SELECTORS
// =============================================================================

/**
 * Get segment summary stats (filtered count, total, isFiltering)
 * Useful for summary displays that need multiple related values
 */
export function useSegmentSummary() {
  return useSegmentStore((state) => ({
    filteredCount: state.filteredParticipantIds?.size ?? state.totalParticipants,
    totalParticipants: state.totalParticipants,
    isFiltering: state.conditionsV2.groups.some((g) => g.conditions.length > 0),
  }))
}

/**
 * Get comparison mode state
 */
export function useComparisonState() {
  return useSegmentStore((state) => ({
    comparisonSegmentId: state.comparisonSegmentId,
    comparisonParticipantIds: state.comparisonParticipantIds,
    isComparing: state.comparisonSegmentId !== null,
  }))
}

/**
 * Get saved segments with active segment info
 */
export function useSavedSegmentsState() {
  return useSegmentStore((state) => ({
    savedSegments: state.savedSegments,
    activeSegmentId: state.activeSegmentId,
  }))
}
