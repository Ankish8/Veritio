'use client'

import { useMemo } from 'react'
import type { FirstClickEventData } from '@/types/analytics'
import {
  calculateMeanCenter,
  calculateSDD,
  calculateNNI,
  calculateDeviationalEllipse,
} from '@/lib/algorithms/spatial-statistics'
import type { MeanCenter, SDDResult, NNIResult, DeviationalEllipse } from '@/lib/algorithms/spatial-statistics'
import { filterValidClicks } from '@/lib/analytics/click-filters'

export interface SpatialStatsResult {
  meanCenter: MeanCenter
  sdd: SDDResult
  nni: NNIResult
  ellipse: DeviationalEllipse | null
  pointCount: number
}

export function useFirstClickSpatialStats(
  clicks: FirstClickEventData[],
  options: { minPoints?: number } = {},
): SpatialStatsResult | null {
  const minPoints = options.minPoints ?? 3

  return useMemo(() => {
    const validClicks = filterValidClicks(clicks)

    if (validClicks.length < minPoints) {
      return null
    }

    const points = validClicks.map(c => ({ x: c.x, y: c.y }))

    const meanCenter = calculateMeanCenter(points)
    const sdd = calculateSDD(points)
    const nni = calculateNNI(points, 1.0)
    const ellipse = points.length >= 5 ? calculateDeviationalEllipse(points) : null

    return {
      meanCenter,
      sdd,
      nni,
      ellipse,
      pointCount: points.length,
    }
  }, [clicks, minPoints])
}
