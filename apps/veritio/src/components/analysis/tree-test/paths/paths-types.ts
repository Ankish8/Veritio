/**
 * Types and constants for tree test path analysis.
 *
 * Result type classification combines correctness (success/fail/skip) with
 * directness (direct/indirect), yielding 6 categories total.
 */

// ============================================================================
// Result Type Classification
// ============================================================================

export type ResultType =
  | 'direct_success'
  | 'indirect_success'
  | 'direct_failure'
  | 'indirect_failure'
  | 'direct_skip'
  | 'indirect_skip'

export const RESULT_TYPE_CONFIG: Record<
  ResultType,
  { label: string; color: string; dotColor: string }
> = {
  direct_success: {
    label: 'Direct success',
    color: 'text-green-700',
    dotColor: '#16a34a', // green-600
  },
  indirect_success: {
    label: 'Indirect success',
    color: 'text-green-500',
    dotColor: '#4ade80', // green-400
  },
  direct_failure: {
    label: 'Direct failure',
    color: 'text-red-700',
    dotColor: '#dc2626', // red-600
  },
  indirect_failure: {
    label: 'Indirect failure',
    color: 'text-red-500',
    dotColor: '#f87171', // red-400
  },
  direct_skip: {
    label: 'Direct skip',
    color: 'text-gray-600',
    dotColor: '#6b7280', // gray-500
  },
  indirect_skip: {
    label: 'Indirect skip',
    color: 'text-gray-400',
    dotColor: '#9ca3af', // gray-400
  },
}

export const ALL_RESULT_TYPES: ResultType[] = [
  'direct_success',
  'indirect_success',
  'direct_failure',
  'indirect_failure',
  'direct_skip',
  'indirect_skip',
]

/** Sort order for result types (direct success first, indirect skip last). */
export const RESULT_TYPE_ORDER: Record<ResultType, number> = {
  direct_success: 1,
  indirect_success: 2,
  direct_failure: 3,
  indirect_failure: 4,
  direct_skip: 5,
  indirect_skip: 6,
}

// ============================================================================
// Path Data Types
// ============================================================================

/** Aggregated path data for the table (one row per unique path). */
export interface AggregatedPathData {
  pathKey: string
  pathTaken: string[]
  breadcrumbPath: string[]
  breadcrumbString: string
  resultType: ResultType
  participantCount: number
  percentage: number
  participantIds: string[]
}

/** Individual path row data (one row per participant response). */
export interface IndividualPathData {
  responseId: string
  participantId: string
  participantIndex: number
  pathTaken: string[]
  breadcrumbPath: string[]
  breadcrumbString: string
  resultType: ResultType
}

/** Sort configuration for path tables. */
export interface SortConfig {
  field: 'result' | 'participants' | 'path'
  direction: 'asc' | 'desc'
}
