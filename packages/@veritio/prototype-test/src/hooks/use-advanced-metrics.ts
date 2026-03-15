/**
 * Hook for computing advanced prototype test metrics
 *
 * Computes Lostness, Path Efficiency, and Dwell Time analysis
 * from task attempts and navigation events.
 */

import { useMemo } from 'react'
import type { ParsedTaskAttempt } from '../algorithms/prototype-test-analysis'
import type { NavigationEventData } from './use-prototype-test-navigation-events'
import {
  computeAdvancedTaskMetrics,
  computeAverageLostness,
  computeAveragePathEfficiency,
  computeDwellTimeAnalysis,
  type AdvancedTaskMetrics,
  type NavigationEventForMetrics,
  type FrameMetadata,
} from '../algorithms/advanced-metrics'
// Types

export interface UseAdvancedMetricsOptions {
  taskAttempts: ParsedTaskAttempt[]
  navigationEvents: NavigationEventData[]
  optimalPathLength: number
  frames?: Array<{ id: string; name: string; thumbnail_url?: string | null }>
  benchmarkTimeMs?: number
  taskId?: string
}

export interface UseAdvancedMetricsResult {
  metrics: AdvancedTaskMetrics | null
  isComputing: boolean
}
// Hook
export function useAdvancedMetrics({
  taskAttempts,
  navigationEvents,
  optimalPathLength,
  frames = [],
  benchmarkTimeMs,
  taskId,
}: UseAdvancedMetricsOptions): UseAdvancedMetricsResult {
  // Compute advanced metrics with memoization
  const metrics = useMemo(() => {
    // Need at least some data to compute metrics
    if (taskAttempts.length === 0 && navigationEvents.length === 0) {
      return null
    }

    // Ensure we have a valid optimal path length
    const effectiveOptimalPath = Math.max(optimalPathLength, 1)

    // Filter navigation events for this task
    const taskNavEvents = taskId
      ? navigationEvents.filter(e => e.task_id === taskId)
      : navigationEvents

    // Transform navigation events to metrics format
    const navEventsForMetrics: NavigationEventForMetrics[] = taskNavEvents.map(e => ({
      fromFrameId: e.from_frame_id,
      toFrameId: e.to_frame_id,
      timeOnFromFrameMs: e.time_on_from_frame_ms,
      timestamp: e.timestamp || '',
      taskAttemptId: undefined, // Not directly available, could be joined if needed
    }))

    // Build frame metadata map
    const frameMetadata = new Map<string, FrameMetadata>()
    for (const frame of frames) {
      frameMetadata.set(frame.id, {
        id: frame.id,
        name: frame.name,
        thumbnailUrl: frame.thumbnail_url,
      })
    }

    // Compute all metrics
    return computeAdvancedTaskMetrics(
      taskAttempts,
      effectiveOptimalPath,
      navEventsForMetrics,
      frameMetadata,
      benchmarkTimeMs
    )
  }, [taskAttempts, navigationEvents, optimalPathLength, frames, benchmarkTimeMs, taskId])

  return {
    metrics,
    isComputing: false, // Computation is synchronous/memoized
  }
}
export function estimateOptimalPathLength(
  successFrameIds: string[] | null,
  successPathway: { frames: string[] } | null,
  startFrameId: string | null
): number {
  // If pathway is defined, use its length
  if (successPathway?.frames && successPathway.frames.length > 0) {
    return successPathway.frames.length
  }

  // If destination frames are defined, estimate as start + 1 destination
  // (assumes direct path from start to any success frame)
  if (successFrameIds && successFrameIds.length > 0 && startFrameId) {
    return 2 // Start frame -> Success frame (minimum path)
  }

  // Default to 2 (at minimum: start -> goal)
  return 2
}
export function filterAttemptsForTask(
  attempts: ParsedTaskAttempt[],
  taskId: string
): ParsedTaskAttempt[] {
  return attempts.filter(a => a.task_id === taskId)
}
