import { useMemo } from 'react'
import type { StudyFlowResponseRow } from '@veritio/core'
import type { AggregatedStats, VisualizationRowData } from './types'

export interface AggregationConfig<TRow extends VisualizationRowData = VisualizationRowData> {
  responses: StudyFlowResponseRow[]
  aggregator: (responses: StudyFlowResponseRow[]) => TRow[]
  deps?: unknown[]
}
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
  }, [responses, ...deps])
}

export function calculatePercentage(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

export function countOccurrences<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return items.filter(predicate).length
}

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
