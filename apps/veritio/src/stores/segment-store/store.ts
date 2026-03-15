import { create } from 'zustand'
import type {
  Participant,
  StudyFlowResponseRow,
  StudyFlowQuestionRow,
  StudySegment,
  SegmentCondition,
  SegmentConditionType,
  SegmentConditionOperator,
  SegmentConditionsV2,
} from '@veritio/study-types'
import { isSegmentConditionsV2, migrateToConditionsV2 } from '@veritio/study-types'
import {
  matchesConditionsV2,
  type ResponseData,
} from '@/lib/segment-matching'

/**
 * Segment Filter Types
 *
 * Supports filtering participants by:
 * - Status: completed, abandoned, in_progress
 * - URL Tags: Dynamic tags from participant.url_tags JSON
 * - Categories Created: Number range (for card sorts)
 * - Question Responses: Based on study flow question answers
 * - Time Taken: Duration in seconds
 * - Participant ID: Search by identifier
 *
 * V2 adds support for OR logic between condition groups.
 */

// Re-export types from the main types file for backwards compatibility
export type SegmentFilterType = SegmentConditionType
export type SegmentOperator = SegmentConditionOperator
export type SegmentFilter = SegmentCondition

export interface SegmentState {
  // Active filters (V2 format with groups)
  conditionsV2: SegmentConditionsV2

  // Computed filtered participant IDs (null = no filtering)
  filteredParticipantIds: Set<string> | null

  // Total participants for display
  totalParticipants: number

  // Saved segments from database
  savedSegments: StudySegment[]

  // Currently active saved segment (null = using ad-hoc filters)
  activeSegmentId: string | null

  // Comparison mode: second segment for comparison
  comparisonSegmentId: string | null
  comparisonParticipantIds: Set<string> | null

  // Legacy accessor for filters (returns first group's conditions)
  filters: SegmentFilter[]

  // Actions
  addFilter: (filter: Omit<SegmentFilter, 'id'>) => void
  updateFilter: (id: string, updates: Partial<SegmentFilter>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void

  // V2 group actions
  addConditionGroup: () => void
  removeConditionGroup: (groupId: string) => void
  addConditionToGroup: (groupId: string, condition: Omit<SegmentCondition, 'id'>) => void
  updateConditionInGroup: (groupId: string, conditionId: string, updates: Partial<SegmentCondition>) => void
  removeConditionFromGroup: (groupId: string, conditionId: string) => void
  setConditionsV2: (conditions: SegmentConditionsV2) => void

  // Saved segments actions
  setSavedSegments: (segments: StudySegment[]) => void
  applySegment: (segmentId: string) => void
  clearSegment: () => void

  // Comparison mode actions
  setComparisonSegment: (segmentId: string | null) => void
  clearComparison: () => void

  // Apply filters to participant data
  applyFilters: (
    participants: Participant[],
    flowResponses: StudyFlowResponseRow[],
    flowQuestions: StudyFlowQuestionRow[],
    responses?: ResponseData[]
  ) => void

  // Reset store
  reset: () => void
}

/**
 * Helper to get all conditions from V2 structure as flat array
 */
function getConditionsAsArray(conditions: SegmentConditionsV2): SegmentCondition[] {
  if (conditions.groups.length === 0) return []
  // Return first group's conditions for backwards compatibility
  return conditions.groups[0]?.conditions || []
}

/**
 * Create empty V2 conditions structure
 */
function createEmptyConditionsV2(): SegmentConditionsV2 {
  return { version: 2, groups: [] }
}

/**
 * Build the common state update when conditions change (resets active segment)
 */
function conditionsUpdate(conditionsV2: SegmentConditionsV2) {
  return {
    conditionsV2,
    filters: getConditionsAsArray(conditionsV2),
    activeSegmentId: null as string | null,
  }
}

/**
 * Parse raw conditions from database JSONB, handling both V1 and V2 formats
 */
function parseConditions(raw: unknown): SegmentConditionsV2 {
  if (Array.isArray(raw)) {
    return migrateToConditionsV2(raw as SegmentCondition[])
  }
  if (isSegmentConditionsV2(raw as SegmentConditionsV2)) {
    return raw as SegmentConditionsV2
  }
  return createEmptyConditionsV2()
}

export const useSegmentStore = create<SegmentState>((set, get) => ({
  conditionsV2: createEmptyConditionsV2(),
  filteredParticipantIds: null,
  totalParticipants: 0,
  savedSegments: [],
  activeSegmentId: null,
  comparisonSegmentId: null,
  comparisonParticipantIds: null,

  // Legacy accessor - computed when conditionsV2 changes (NOT a getter - getters break useSyncExternalStore)
  filters: [],

  // Legacy: add filter to first group (creates group if needed)
  addFilter: (filter) => {
    set((state) => {
      const newCondition = { ...filter, id: crypto.randomUUID() }
      const groups = state.conditionsV2.groups

      const newGroups = groups.length === 0
        ? [{ id: crypto.randomUUID(), conditions: [newCondition] }]
        : [{ ...groups[0], conditions: [...groups[0].conditions, newCondition] }, ...groups.slice(1)]

      return conditionsUpdate({ ...state.conditionsV2, groups: newGroups })
    })
  },

  // Legacy: update filter in any group
  updateFilter: (id, updates) => {
    set((state) => {
      const newGroups = state.conditionsV2.groups.map((group) => ({
        ...group,
        conditions: group.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }))
      return conditionsUpdate({ ...state.conditionsV2, groups: newGroups })
    })
  },

  // Legacy: remove filter from any group
  removeFilter: (id) => {
    set((state) => {
      const newGroups = state.conditionsV2.groups
        .map((group) => ({ ...group, conditions: group.conditions.filter((c) => c.id !== id) }))
        .filter((group, idx) => group.conditions.length > 0 || idx === 0)

      // If last group is empty and it was the only one, clear entirely
      if (newGroups.length === 1 && newGroups[0].conditions.length === 0) {
        return { ...conditionsUpdate(createEmptyConditionsV2()), filters: [], filteredParticipantIds: null }
      }

      return conditionsUpdate({ ...state.conditionsV2, groups: newGroups })
    })
  },

  clearFilters: () => {
    set({ ...conditionsUpdate(createEmptyConditionsV2()), filters: [], filteredParticipantIds: null })
  },

  // V2 group actions
  addConditionGroup: () => {
    set((state) => conditionsUpdate({
      ...state.conditionsV2,
      groups: [...state.conditionsV2.groups, { id: crypto.randomUUID(), conditions: [] }],
    }))
  },

  removeConditionGroup: (groupId) => {
    set((state) => {
      const newGroups = state.conditionsV2.groups.filter((g) => g.id !== groupId)
      if (newGroups.length === 0) {
        return { ...conditionsUpdate(createEmptyConditionsV2()), filters: [], filteredParticipantIds: null }
      }
      return conditionsUpdate({ ...state.conditionsV2, groups: newGroups })
    })
  },

  addConditionToGroup: (groupId, condition) => {
    set((state) => conditionsUpdate({
      ...state.conditionsV2,
      groups: state.conditionsV2.groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, { ...condition, id: crypto.randomUUID() }] }
          : g
      ),
    }))
  },

  updateConditionInGroup: (groupId, conditionId, updates) => {
    set((state) => conditionsUpdate({
      ...state.conditionsV2,
      groups: state.conditionsV2.groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.map((c) => (c.id === conditionId ? { ...c, ...updates } : c)) }
          : g
      ),
    }))
  },

  removeConditionFromGroup: (groupId, conditionId) => {
    set((state) => conditionsUpdate({
      ...state.conditionsV2,
      groups: state.conditionsV2.groups.map((g) =>
        g.id === groupId ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) } : g
      ),
    }))
  },

  setConditionsV2: (conditions) => {
    set(conditionsUpdate(conditions))
  },

  setSavedSegments: (segments) => {
    set({ savedSegments: segments })
  },

  applySegment: (segmentId) => {
    const { savedSegments } = get()
    const segment = savedSegments.find(s => s.id === segmentId)
    if (!segment) return

    const conditionsV2 = parseConditions(segment.conditions)
    set({ ...conditionsUpdate(conditionsV2), activeSegmentId: segmentId })
  },

  clearSegment: () => {
    set({ ...conditionsUpdate(createEmptyConditionsV2()), filters: [], filteredParticipantIds: null })
  },

  // Comparison mode
  setComparisonSegment: (segmentId) => {
    set({ comparisonSegmentId: segmentId })
  },

  clearComparison: () => {
    set({
      comparisonSegmentId: null,
      comparisonParticipantIds: null,
    })
  },

  applyFilters: (participants, flowResponses, flowQuestions, responses) => {
    const { conditionsV2, comparisonSegmentId, savedSegments } = get()

    set({ totalParticipants: participants.length })

    // Create a map for quick response lookup by participant_id
    const responseByParticipant = new Map<string, ResponseData>()
    responses?.forEach(r => responseByParticipant.set(r.participant_id, r))

    // No conditions = show all
    const hasConditions = conditionsV2.groups.some(g => g.conditions.length > 0)
    if (!hasConditions) {
      set({ filteredParticipantIds: null })
    } else {
      // Apply V2 conditions with OR logic between groups
      const matchingIds = new Set<string>()

      for (const participant of participants) {
        const responseData = responseByParticipant.get(participant.id)
        if (matchesConditionsV2(participant, conditionsV2, flowResponses, flowQuestions, responseData)) {
          matchingIds.add(participant.id)
        }
      }

      set({ filteredParticipantIds: matchingIds })
    }

    // Handle comparison segment if set
    if (comparisonSegmentId) {
      const comparisonSegment = savedSegments.find(s => s.id === comparisonSegmentId)
      if (comparisonSegment) {
        const compConditionsV2 = parseConditions(comparisonSegment.conditions)
        const compMatchingIds = new Set<string>()
        for (const participant of participants) {
          const responseData = responseByParticipant.get(participant.id)
          if (matchesConditionsV2(participant, compConditionsV2, flowResponses, flowQuestions, responseData)) {
            compMatchingIds.add(participant.id)
          }
        }
        set({ comparisonParticipantIds: compMatchingIds })
      }
    } else {
      set({ comparisonParticipantIds: null })
    }
  },

  reset: () => {
    set({
      conditionsV2: createEmptyConditionsV2(),
      filters: [],
      filteredParticipantIds: null,
      totalParticipants: 0,
      savedSegments: [],
      activeSegmentId: null,
      comparisonSegmentId: null,
      comparisonParticipantIds: null,
    })
  },
}))

// Selector for filtered count
export const selectFilteredCount = (state: SegmentState): number => {
  if (state.filteredParticipantIds === null) {
    return state.totalParticipants
  }
  return state.filteredParticipantIds.size
}

// Hook for easy access to filtered count
export const useFilteredCount = () => useSegmentStore(selectFilteredCount)

// Selector to check if filtering is active
export const selectIsFiltering = (state: SegmentState): boolean => {
  return state.conditionsV2.groups.some(g => g.conditions.length > 0)
}

export const useIsFiltering = () => useSegmentStore(selectIsFiltering)

export const useSavedSegments = () => useSegmentStore((state) => state.savedSegments)

export const useActiveSegmentId = () => useSegmentStore((state) => state.activeSegmentId)

// Selector for active segment object
export const selectActiveSegment = (state: SegmentState): StudySegment | null => {
  if (!state.activeSegmentId) return null
  return state.savedSegments.find(s => s.id === state.activeSegmentId) || null
}

export const useActiveSegment = () => useSegmentStore(selectActiveSegment)

export const useConditionsV2 = () => useSegmentStore((state) => state.conditionsV2)

export const useGroupCount = () => useSegmentStore((state) => state.conditionsV2.groups.length)

export const useHasOrLogic = () => useSegmentStore((state) =>
  state.conditionsV2.groups.filter(g => g.conditions.length > 0).length > 1
)

export const useComparisonSegmentId = () => useSegmentStore((state) => state.comparisonSegmentId)

export const useComparisonParticipantIds = () => useSegmentStore((state) => state.comparisonParticipantIds)
