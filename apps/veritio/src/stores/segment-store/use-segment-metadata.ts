/**
 * Segment Metadata Hook
 *
 * Computes filter options from participant data. This replaces the computed
 * values that were previously bundled into SegmentContext.
 *
 * Use this hook in components that need to display available filter options
 * (e.g., segment dropdown, filter config panels).
 *
 * @example
 * const metadata = useSegmentMetadata(participants, flowQuestions, responses)
 * // Access: metadata.availableStatuses, metadata.categoriesRange, etc.
 */

import { useMemo } from 'react'
import type {
  Participant,
  StudyFlowQuestionRow,
} from '@veritio/study-types'

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

export interface SegmentMetadata {
  /** Available participant statuses with counts */
  availableStatuses: StatusOption[]
  /** Available URL tags grouped by key */
  availableUrlTags: UrlTagOption[]
  /** Available questions for filtering */
  availableQuestions: QuestionOption[]
  /** Min/max categories created (for card sort) */
  categoriesRange: { min: number; max: number }
  /** Min/max time taken in seconds */
  timeRange: { min: number; max: number }
}

/**
 * Compute segment filter metadata from participant data
 *
 * @param participants - Array of participants
 * @param flowQuestions - Array of study flow questions
 * @param responses - Optional array of responses with time data
 * @returns Computed metadata for filter options
 */
export function useSegmentMetadata(
  participants: Participant[],
  flowQuestions: StudyFlowQuestionRow[],
  responses?: ResponseData[]
): SegmentMetadata {
  // Compute available statuses with counts
  const availableStatuses = useMemo(() => {
    const statusCounts = new Map<string, number>()
    for (const p of participants) {
      const status = p.status ?? 'unknown'
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
    }
    return Array.from(statusCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
  }, [participants])

  // Compute available URL tags
  const availableUrlTags = useMemo(() => {
    const tagMap = new Map<string, Set<string>>()
    for (const p of participants) {
      const tags = (p.url_tags || {}) as Record<string, string>
      for (const [key, value] of Object.entries(tags)) {
        if (!tagMap.has(key)) {
          tagMap.set(key, new Set())
        }
        tagMap.get(key)!.add(value)
      }
    }
    return Array.from(tagMap.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values).sort(),
    }))
  }, [participants])

  // Compute available questions for filtering
  const availableQuestions = useMemo(() => {
    return flowQuestions.map((q) => {
      const config = q.config as { options?: Array<{ label: string; value: string }> }
      return {
        id: q.id,
        text: q.question_text,
        type: q.question_type,
        section: q.section,
        options: config?.options?.map((o) => o.label || o.value),
      }
    })
  }, [flowQuestions])

  // Compute categories range (for card sort)
  const categoriesRange = useMemo(() => {
    const counts = participants.map((p) => p.categories_created ?? 0)
    if (counts.length === 0) return { min: 0, max: 0 }
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
    }
  }, [participants])

  // Compute time range in seconds
  const timeRange = useMemo(() => {
    if (!responses || responses.length === 0) return { min: 0, max: 0 }

    const times = responses
      .map((r) => r.total_time_ms)
      .filter((t): t is number => t !== null && t !== undefined)
      .map((t) => Math.round(t / 1000)) // Convert to seconds

    if (times.length === 0) return { min: 0, max: 0 }
    return {
      min: Math.min(...times),
      max: Math.max(...times),
    }
  }, [responses])

  return {
    availableStatuses,
    availableUrlTags,
    availableQuestions,
    categoriesRange,
    timeRange,
  }
}
