import { useMemo } from 'react'
import type { StudyFlowResponseRow } from '@veritio/study-types'
import type { AggregatedStats, VisualizationRowData } from './types'

/**
 * Configuration for response aggregation
 */
export interface AggregationConfig<TRow extends VisualizationRowData = VisualizationRowData> {
  /** Response data to aggregate */
  responses: StudyFlowResponseRow[]
  /** Function to process responses and return aggregated rows */
  aggregator: (responses: StudyFlowResponseRow[]) => TRow[]
  /** Dependencies for memoization (in addition to responses) */
  deps?: unknown[]
}

/**
 * Hook for aggregating response data with memoization.
 * Provides a standard pattern for computing visualization statistics.
 *
 * @example
 * ```tsx
 * const { rows, totalResponses, maxCount } = useResponseAggregation({
 *   responses,
 *   aggregator: (responses) => {
 *     // Process responses and return row data
 *     return options.map(opt => ({
 *       id: opt.id,
 *       label: opt.label,
 *       count: countForOption(opt.id),
 *       percentage: calculatePercentage(count),
 *     }))
 *   },
 *   deps: [options],
 * })
 * ```
 */
export function useResponseAggregation<TRow extends VisualizationRowData = VisualizationRowData>(
  config: AggregationConfig<TRow>
): AggregatedStats<TRow> {
  const { responses, aggregator, deps = [] } = config

  return useMemo(() => {
    const rows = aggregator(responses)
    const totalResponses = responses.length
    const maxCount = Math.max(...rows.map((r) => r.count), 1)

    return {
      rows,
      totalResponses,
      maxCount,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, ...deps])
}

/**
 * Helper function to calculate percentage
 */
export function calculatePercentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

/**
 * Helper function to count occurrences in an array
 */
export function countOccurrences<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length
}

/**
 * Helper to create a frequency map from responses
 */
export function createFrequencyMap<T extends string | number>(
  responses: StudyFlowResponseRow[],
  extractor: (response: StudyFlowResponseRow) => T | T[] | null
): Map<T, number> {
  const map = new Map<T, number>()

  for (const response of responses) {
    const values = extractor(response)
    if (values === null) continue

    const valueArray = Array.isArray(values) ? values : [values]
    for (const value of valueArray) {
      map.set(value, (map.get(value) || 0) + 1)
    }
  }

  return map
}
