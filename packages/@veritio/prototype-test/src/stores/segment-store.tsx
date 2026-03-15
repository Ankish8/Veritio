'use client'

/**
 * Segment Store - Simplified stub implementation
 *
 * MIGRATION NOTE: This is a stub that provides the same interface as the
 * full segment store in the main app. It needs to be properly implemented
 * with full filtering, saved segments, and comparison features.
 */

import { create } from 'zustand'
import { useRef, useMemo, type ReactNode } from 'react'
import type {
  Participant,
  StudyFlowResponse,
  StudyFlowQuestion,
  StudySegment,
  SegmentCondition,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Types
export type SegmentFilterType = 'status' | 'url_tag' | 'question' | 'time_taken'
export type SegmentOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between'

export interface SegmentFilter extends SegmentCondition {
  id: string
}

// Store State
interface SegmentState {
  // Filters
  conditionsV2: SegmentFilter[]
  filteredParticipantIds: Set<string> | null
  totalParticipants: number

  // Saved segments
  savedSegments: StudySegment[]
  activeSegmentId: string | null

  // Comparison
  comparisonSegmentId: string | null
  comparisonParticipantIds: Set<string> | null

  // Actions
  addFilter: (filter: Omit<SegmentFilter, 'id'>) => void
  updateFilter: (id: string, updates: Partial<SegmentFilter>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  setSavedSegments: (segments: StudySegment[]) => void
  applySegment: (segmentId: string) => void
  clearSegment: () => void
  setComparisonSegment: (segmentId: string | null) => void
  applyFilters: (
    participants: Participant[],
    flowResponses: StudyFlowResponse[],
    flowQuestions: StudyFlowQuestion[],
    responses?: { participant_id: string; total_time_ms?: number | null }[]
  ) => void
}

export const useSegmentStore = create<SegmentState>((set) => ({
  // Initial state
  conditionsV2: [],
  filteredParticipantIds: null,
  totalParticipants: 0,
  savedSegments: [],
  activeSegmentId: null,
  comparisonSegmentId: null,
  comparisonParticipantIds: null,

  // Actions (stub implementations)
  addFilter: () => {
    // addFilter not yet implemented
  },
  updateFilter: () => {
    // updateFilter not yet implemented
  },
  removeFilter: () => {
    // removeFilter not yet implemented
  },
  clearFilters: () => {
    set({ conditionsV2: [], filteredParticipantIds: null, activeSegmentId: null })
  },
  setSavedSegments: (segments) => {
    set({ savedSegments: segments })
  },
  applySegment: () => {
    // applySegment not yet implemented
  },
  clearSegment: () => {
    set({ activeSegmentId: null })
  },
  setComparisonSegment: (segmentId) => {
    set({ comparisonSegmentId: segmentId })
  },
  applyFilters: (participants) => {
    set({ totalParticipants: participants.length })
  },
}))

// Selectors
export const selectFilteredCount = (state: SegmentState) =>
  state.filteredParticipantIds?.size ?? state.totalParticipants

export const useFilteredCount = () => useSegmentStore(selectFilteredCount)

export const selectIsFiltering = (state: SegmentState) => state.filteredParticipantIds !== null

export const useIsFiltering = () => useSegmentStore(selectIsFiltering)

export const useSavedSegments = () => useSegmentStore((state) => state.savedSegments)

export const useActiveSegmentId = () => useSegmentStore((state) => state.activeSegmentId)

export const useActiveSegment = () => {
  const savedSegments = useSavedSegments()
  const activeSegmentId = useActiveSegmentId()
  return savedSegments.find((s) => s.id === activeSegmentId) ?? null
}

export const useConditionsV2 = () => useSegmentStore((state) => state.conditionsV2)

export const useGroupCount = () => 1

export const useHasOrLogic = () => false

export const useComparisonSegmentId = () => useSegmentStore((state) => state.comparisonSegmentId)

export const useComparisonParticipantIds = () => useSegmentStore((state) => state.comparisonParticipantIds)

export const useFilteredParticipantIds = () => useSegmentStore((state) => state.filteredParticipantIds)

export const useTotalParticipants = () => useSegmentStore((state) => state.totalParticipants)

export const useSegmentActions = () => {
  const store = useSegmentStore()
  return {
    addFilter: store.addFilter,
    updateFilter: store.updateFilter,
    removeFilter: store.removeFilter,
    clearFilters: store.clearFilters,
    applySegment: store.applySegment,
    clearSegment: store.clearSegment,
    setComparisonSegment: store.setComparisonSegment,
  }
}

export const useSegmentFilters = () => useSegmentStore((state) => state.conditionsV2)

export const useIsComparing = () => useSegmentStore((state) => state.comparisonSegmentId !== null)

export const useSegmentSummary = () => {
  const filteredParticipantIds = useFilteredParticipantIds()
  const totalParticipants = useTotalParticipants()
  const isFiltering = useIsFiltering()

  return {
    totalParticipants,
    filteredCount: filteredParticipantIds?.size ?? totalParticipants,
    isFiltering,
  }
}

export const useComparisonState = () => {
  const comparisonSegmentId = useComparisonSegmentId()
  const comparisonParticipantIds = useComparisonParticipantIds()
  const isComparing = useIsComparing()

  return {
    comparisonSegmentId,
    comparisonParticipantIds,
    isComparing,
  }
}

export const useSavedSegmentsState = () => {
  const savedSegments = useSavedSegments()
  const activeSegmentId = useActiveSegmentId()
  const activeSegment = useActiveSegment()

  return {
    savedSegments,
    activeSegmentId,
    activeSegment,
  }
}

// Metadata hook (stub)
interface StatusOption {
  value: string
  count: number
}

interface UrlTagOption {
  key: string
  values: string[]
}

interface QuestionOption {
  id: string
  text: string
  type: string
  section: string
  options?: string[]
}

export interface SegmentMetadata {
  availableStatuses: StatusOption[]
  availableUrlTags: UrlTagOption[]
  availableQuestions: QuestionOption[]
  categoriesRange: { min: number; max: number }
  timeRange: { min: number; max: number }
}

export function useSegmentMetadata(
  _participants: Participant[],
  _flowQuestions: StudyFlowQuestion[],
  _responses?: { participant_id: string; total_time_ms?: number | null }[]
): SegmentMetadata {
  return useMemo(() => ({
    availableStatuses: [],
    availableUrlTags: [],
    availableQuestions: [],
    categoriesRange: { min: 0, max: 100 },
    timeRange: { min: 0, max: 60000 },
  }), [])
}

// Legacy compatibility hook
export function useSegmentLegacy() {
  const store = useSegmentStore()

  return {
    filters: store.conditionsV2,
    filteredParticipantIds: store.filteredParticipantIds,
    totalParticipants: store.totalParticipants,
    filteredCount: store.filteredParticipantIds?.size ?? store.totalParticipants,
    isFiltering: store.filteredParticipantIds !== null,
    savedSegments: store.savedSegments,
    activeSegmentId: store.activeSegmentId,
    comparisonSegmentId: store.comparisonSegmentId,
    comparisonParticipantIds: store.comparisonParticipantIds,
    isComparing: store.comparisonSegmentId !== null,
    addFilter: store.addFilter,
    updateFilter: store.updateFilter,
    removeFilter: store.removeFilter,
    clearFilters: store.clearFilters,
    setSavedSegments: store.setSavedSegments,
    applySegment: store.applySegment,
    clearSegment: store.clearSegment,
    setComparisonSegment: store.setComparisonSegment,
  }
}

// Data sync component
export interface SegmentDataSyncProps {
  children: ReactNode
  participants: Participant[]
  flowResponses: StudyFlowResponse[]
  flowQuestions: StudyFlowQuestion[]
  responses?: { participant_id: string; total_time_ms?: number | null }[]
  savedSegments?: StudySegment[]
}

export function SegmentDataSync({
  children,
  participants,
  flowResponses,
  flowQuestions,
  responses,
  savedSegments,
}: SegmentDataSyncProps) {
  const applyFilters = useSegmentStore((state) => state.applyFilters)
  const setSavedSegments = useSegmentStore((state) => state.setSavedSegments)
  const conditionsV2 = useSegmentStore((state) => state.conditionsV2)

  // Use refs to track if we've initialized
  const initializedRef = useRef(false)

  // Initialize saved segments from props (once)
  if (!initializedRef.current && savedSegments) {
    setSavedSegments(savedSegments)
    initializedRef.current = true
  }

  // Apply filters when data or conditions change
  useMemo(() => {
    applyFilters(participants, flowResponses, flowQuestions, responses)
  }, [participants, flowResponses, flowQuestions, responses, conditionsV2, applyFilters])

  return <>{children}</>
}
