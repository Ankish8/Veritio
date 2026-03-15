/**
 * Segment Store - Zustand-based state management for participant segmentation
 *
 * This module provides:
 * - useSegmentStore: Main Zustand store with all state and actions
 * - Granular selectors: useFilteredParticipantIds, useIsFiltering, etc.
 * - useSegmentMetadata: Hook for computing filter options from data
 * - SegmentDataSync: Component that syncs data changes to the store
 *
 * MIGRATION NOTE: This replaces the SegmentContext pattern. Components should use
 * individual selectors instead of the bundled useSegment() hook for better performance.
 *
 * @example
 * // Before (causes unnecessary re-renders):
 * const { filteredParticipantIds, isFiltering, addFilter } = useSegment()
 *
 * // After (granular subscriptions):
 * const filteredParticipantIds = useFilteredParticipantIds()
 * const isFiltering = useIsFiltering()
 * const addFilter = useSegmentActions().addFilter
 */

// =============================================================================
// MAIN STORE & EXISTING SELECTORS
// =============================================================================

export {
  useSegmentStore,
  // Selectors
  selectFilteredCount,
  useFilteredCount,
  selectIsFiltering,
  useIsFiltering,
  useSavedSegments,
  useActiveSegmentId,
  useActiveSegment,
  useConditionsV2,
  useGroupCount,
  useHasOrLogic,
  useComparisonSegmentId,
  useComparisonParticipantIds,
  // Types
  type SegmentFilterType,
  type SegmentOperator,
  type SegmentFilter,
} from './store'

// =============================================================================
// GRANULAR SELECTORS
// =============================================================================

export {
  useFilteredParticipantIds,
  useTotalParticipants,
  useSegmentActions,
  useSegmentFilters,
  useIsComparing,
  useSegmentSummary,
  useComparisonState,
  useSavedSegmentsState,
} from './selectors'

// =============================================================================
// METADATA HOOK
// =============================================================================

export { useSegmentMetadata, type SegmentMetadata } from './use-segment-metadata'

// =============================================================================
// DATA SYNC COMPONENT
// =============================================================================

export { SegmentDataSync, type SegmentDataSyncProps } from './segment-data-sync'

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

export { useSegmentLegacy } from './use-segment-legacy'
