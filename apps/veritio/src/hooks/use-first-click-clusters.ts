'use client'

import { useMemo } from 'react'
import type { FirstClickEventData } from '@/types/analytics'
import { dbscan } from '@/lib/algorithms/click-clustering'
import type { ClusterResult } from '@/lib/algorithms/click-clustering'
import { filterValidClicks } from '@/lib/analytics/click-filters'

export interface ClusterStats {
  result: ClusterResult
  confusionZones: Array<{
    id: number
    centroid: { x: number; y: number }
    size: number
    points: Array<{ x: number; y: number; index: number }>
  }>
  noiseCount: number
  totalClusters: number
}

export function useFirstClickClusters(
  clicks: FirstClickEventData[],
  options: {
    epsilon?: number
    minPoints?: number
    incorrectOnly?: boolean
  } = {},
): ClusterStats | null {
  const epsilon = options.epsilon ?? 0.05
  const minPoints = options.minPoints ?? 3
  const incorrectOnly = options.incorrectOnly ?? false

  return useMemo(() => {
    let validClicks = filterValidClicks(clicks)

    if (incorrectOnly) {
      validClicks = validClicks.filter(c => !c.wasCorrect)
    }

    if (validClicks.length < minPoints) {
      return null
    }

    const points = validClicks.map(c => ({ x: c.x, y: c.y }))
    const result = dbscan(points, epsilon, minPoints)

    return {
      result,
      confusionZones: result.clusters,
      noiseCount: result.noise.length,
      totalClusters: result.clusterCount,
    }
  }, [clicks, epsilon, minPoints, incorrectOnly])
}
