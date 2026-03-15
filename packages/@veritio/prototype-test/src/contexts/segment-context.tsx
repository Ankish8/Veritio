'use client'

/**
 * Segment Context (Backward Compatibility Layer)
 *
 * MIGRATION NOTICE:
 * This file now wraps the new Zustand-based segment store for backward compatibility.
 * New code should import directly from '../stores':
 *
 *   // Granular selectors (preferred)
 *   import { useFilteredParticipantIds, useIsFiltering, useSegmentActions } from '../stores'
 *
 *   // Metadata hook
 *   import { useSegmentMetadata } from '../stores'
 *
 *   // Data sync component
 *   import { SegmentDataSync } from '../stores'
 *
 * The old useSegment() hook still works but causes more re-renders than necessary.
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import {
  SegmentDataSync,
  useSegmentMetadata,
  useSegmentLegacy,
} from '../stores'
import type {
  Participant,
  StudyFlowResponse,
  StudyFlowQuestion,
  StudySegment,
  SegmentCondition,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

// Re-export types for backward compatibility
export type SegmentFilter = SegmentCondition

// Response data for time_taken filtering
interface ResponseData {
  participant_id: string
  total_time_ms?: number | null
}

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

/**
 * Combined context value that includes both store state and computed metadata.
 * This matches the old SegmentContext interface for backward compatibility.
 */
interface SegmentContextValue {
  // Current filters
  filters: SegmentFilter[]

  // Filtered participant IDs (null = no filtering, show all)
  filteredParticipantIds: Set<string> | null

  // Stats
  totalParticipants: number
  filteredCount: number
  isFiltering: boolean

  // Saved segments
  savedSegments: StudySegment[]
  activeSegmentId: string | null

  // Comparison mode
  comparisonSegmentId: string | null
  comparisonParticipantIds: Set<string> | null
  isComparing: boolean

  // Computed metadata (from useSegmentMetadata)
  availableStatuses: StatusOption[]
  availableUrlTags: UrlTagOption[]
  availableQuestions: QuestionOption[]
  categoriesRange: { min: number; max: number }
  timeRange: { min: number; max: number }

  // Actions
  addFilter: (filter: Omit<SegmentFilter, 'id'>) => void
  updateFilter: (id: string, updates: Partial<SegmentFilter>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  setSavedSegments: (segments: StudySegment[]) => void
  applySegment: (segmentId: string) => void
  clearSegment: () => void
  setComparisonSegment: (segmentId: string | null) => void
}

const SegmentContext = createContext<SegmentContextValue | null>(null)

interface SegmentProviderProps {
  children: ReactNode
  participants: Participant[]
  flowResponses: StudyFlowResponse[]
  flowQuestions: StudyFlowQuestion[]
  responses?: ResponseData[]
  savedSegments?: StudySegment[]
}

/**
 * SegmentProvider - Backward compatible wrapper
 *
 * This provider now uses SegmentDataSync internally and combines
 * Zustand store state with computed metadata for the context value.
 *
 * For better performance, consider using SegmentDataSync directly
 * and accessing store state via individual selectors.
 */
export function SegmentProvider({
  children,
  participants,
  flowResponses,
  flowQuestions,
  responses,
  savedSegments,
}: SegmentProviderProps) {
  return (
    <SegmentDataSync
      participants={participants}
      flowResponses={flowResponses}
      flowQuestions={flowQuestions}
      responses={responses}
      savedSegments={savedSegments}
    >
      <SegmentContextProvider
        participants={participants}
        flowQuestions={flowQuestions}
        responses={responses}
      >
        {children}
      </SegmentContextProvider>
    </SegmentDataSync>
  )
}
function SegmentContextProvider({
  children,
  participants,
  flowQuestions,
  responses,
}: {
  children: ReactNode
  participants: Participant[]
  flowQuestions: StudyFlowQuestion[]
  responses?: ResponseData[]
}) {
  // Get store state (this causes re-renders on any state change)
  const storeState = useSegmentLegacy()

  // Compute metadata from data
  const metadata = useSegmentMetadata(participants, flowQuestions, responses)

  // Combine into context value
  const value: SegmentContextValue = {
    ...storeState,
    ...metadata,
  }

  return (
    <SegmentContext.Provider value={value}>
      {children}
    </SegmentContext.Provider>
  )
}

/**
 * @deprecated Use individual selectors from '../stores' instead
 *
 * For better performance:
 * - useFilteredParticipantIds() for filtered IDs
 * - useIsFiltering() for filter status
 * - useSegmentActions() for actions
 * - useSegmentMetadata() for computed filter options
 */
export function useSegment() {
  const context = useContext(SegmentContext)
  if (!context) {
    throw new Error('useSegment must be used within a SegmentProvider')
  }
  return context
}
export function useIsParticipantVisible(participantId: string): boolean {
  const { filteredParticipantIds } = useSegment()
  if (filteredParticipantIds === null) return true
  return filteredParticipantIds.has(participantId)
}
export function useFilteredItems<T extends { participant_id: string }>(
  items: T[]
): T[] {
  const { filteredParticipantIds } = useSegment()
  if (filteredParticipantIds === null) return items
  return items.filter((item) => filteredParticipantIds.has(item.participant_id))
}
