'use client'

/**
 * Segment Data Sync Component
 *
 * A minimal component that synchronizes participant data with the segment store.
 * This replaces the data-syncing responsibility of SegmentContext.
 *
 * Responsibilities:
 * 1. Re-apply filters when participant data changes
 * 2. Initialize saved segments from props
 *
 * This component does NOT provide any context - components should use
 * Zustand selectors directly for state access.
 *
 * @example
 * <SegmentDataSync
 *   participants={participants}
 *   flowResponses={flowResponses}
 *   flowQuestions={flowQuestions}
 *   responses={responses}
 *   savedSegments={savedSegments}
 * >
 *   <YourContent />
 * </SegmentDataSync>
 */

import { useEffect, type ReactNode } from 'react'
import { useSegmentStore } from './store'
import type {
  Participant,
  StudyFlowResponseRow,
  StudyFlowQuestionRow,
  StudySegment,
} from '@veritio/study-types'

interface ResponseData {
  participant_id: string
  total_time_ms?: number | null
}

export interface SegmentDataSyncProps {
  children: ReactNode
  participants: Participant[]
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
  responses?: ResponseData[]
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

  // Initialize saved segments from props
  useEffect(() => {
    if (savedSegments) {
      setSavedSegments(savedSegments)
    }
  }, [savedSegments, setSavedSegments])

  // Re-apply filters whenever data or conditions change
  useEffect(() => {
    applyFilters(participants, flowResponses, flowQuestions, responses)
  }, [participants, flowResponses, flowQuestions, responses, conditionsV2, applyFilters])

  return <>{children}</>
}
