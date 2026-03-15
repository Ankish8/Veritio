import { useRef, useCallback } from 'react'
import type { FirstClickAOI } from '@veritio/study-types'
import type { ClickData, ClickResponse } from '../types'

export function useClickTracking() {
  const taskStartTimeRef = useRef<number | null>(null)

  const startTask = useCallback(() => {
    taskStartTimeRef.current = Date.now()
  }, [])

  const recordClick = useCallback((click: ClickData, aois: FirstClickAOI[]): ClickResponse => {
    const timeToClick = taskStartTimeRef.current
      ? Date.now() - taskStartTimeRef.current
      : 0

    const matchedAOI = findMatchingAOI(click.x, click.y, aois)

    return {
      ...click,
      timeToClickMs: timeToClick,
      isCorrect: !!matchedAOI,
      matchedAoiId: matchedAOI?.id ?? null,
    }
  }, [])

  const resetTask = useCallback(() => {
    taskStartTimeRef.current = null
  }, [])

  return { startTask, recordClick, resetTask }
}

function findMatchingAOI(
  x: number,
  y: number,
  aois: FirstClickAOI[]
): FirstClickAOI | null {
  return aois.find(aoi =>
    x >= aoi.x &&
    x <= aoi.x + aoi.width &&
    y >= aoi.y &&
    y <= aoi.y + aoi.height
  ) || null
}
