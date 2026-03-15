/**
 * Snap Engine
 *
 * Handles snapping behavior for timeline interactions.
 * Supports snapping to playhead, item edges, markers, and timeline bounds.
 */

import type { SnapPoint, SnapPointType } from './types'
import type { TrackItem } from './tracks/track-types'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Default snap threshold in pixels */
const DEFAULT_SNAP_THRESHOLD_PX = 10

/** Minimum snap threshold in milliseconds */
const MIN_SNAP_THRESHOLD_MS = 50

// ─────────────────────────────────────────────────────────────────────────────
// Snap Engine Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SnapEngine handles snapping behavior for timeline interactions.
 *
 * Features:
 * - Snap to playhead
 * - Snap to item edges (start/end)
 * - Snap to markers (comments, tasks)
 * - Snap to timeline bounds (0, duration)
 * - Configurable threshold
 */
export class SnapEngine {
  private enabled: boolean = true
  private thresholdPx: number = DEFAULT_SNAP_THRESHOLD_PX

  // ─── Configuration ───────────────────────────────

  /**
   * Enable or disable snapping
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if snapping is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Set snap threshold in pixels
   */
  setThresholdPx(thresholdPx: number): void {
    this.thresholdPx = Math.max(1, thresholdPx)
  }

  /**
   * Get snap threshold in pixels
   */
  getThresholdPx(): number {
    return this.thresholdPx
  }

  // ─── Snap Point Collection ───────────────────────

  /**
   * Collect all snap points from timeline state
   */
  collectSnapPoints(config: {
    currentTime: number
    duration: number
    tracks: Array<{ id: string; items: TrackItem[] }>
    markers?: Array<{ id: string; timeMs: number; type: 'comment' | 'task' }>
    excludeItemId?: string // Exclude this item (when dragging)
  }): SnapPoint[] {
    const { currentTime, duration, tracks, markers = [], excludeItemId } = config
    const points: SnapPoint[] = []

    // Timeline bounds
    points.push({
      timeMs: 0,
      type: 'timeline-start',
      label: 'Start',
    })
    points.push({
      timeMs: duration,
      type: 'timeline-end',
      label: 'End',
    })

    // Playhead
    points.push({
      timeMs: currentTime,
      type: 'playhead',
      label: 'Playhead',
    })

    // Track item edges
    for (const track of tracks) {
      for (const item of track.items) {
        // Skip excluded item
        if (item.id === excludeItemId) continue

        points.push({
          timeMs: item.startMs,
          type: 'item-start',
          referenceId: item.id,
        })
        points.push({
          timeMs: item.endMs,
          type: 'item-end',
          referenceId: item.id,
        })
      }
    }

    // Markers (comments, tasks)
    for (const marker of markers) {
      points.push({
        timeMs: marker.timeMs,
        type: 'marker',
        referenceId: marker.id,
        label: marker.type,
      })
    }

    // Remove duplicates and sort
    return this.deduplicateAndSort(points)
  }

  /**
   * Remove duplicate snap points (same time) and sort by time
   */
  private deduplicateAndSort(points: SnapPoint[]): SnapPoint[] {
    const uniqueMap = new Map<number, SnapPoint>()

    for (const point of points) {
      // If duplicate time, prefer more important types
      const existing = uniqueMap.get(point.timeMs)
      if (!existing || this.getTypePriority(point.type) > this.getTypePriority(existing.type)) {
        uniqueMap.set(point.timeMs, point)
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.timeMs - b.timeMs)
  }

  /**
   * Get priority for snap point type (higher = more important)
   */
  private getTypePriority(type: SnapPointType): number {
    const priorities: Record<SnapPointType, number> = {
      playhead: 5,
      'timeline-start': 4,
      'timeline-end': 4,
      marker: 3,
      'item-start': 2,
      'item-end': 2,
    }
    return priorities[type] ?? 0
  }

  // ─── Snap Detection ──────────────────────────────

  /**
   * Find the closest snap point to a given time
   *
   * @param timeMs - Target time in milliseconds
   * @param snapPoints - Available snap points
   * @param pixelsPerMs - Current zoom level (pixels per millisecond)
   * @returns Snapped time, or null if no snap point is close enough
   */
  findSnapPoint(timeMs: number, snapPoints: SnapPoint[], pixelsPerMs: number): number | null {
    if (!this.enabled || snapPoints.length === 0) {
      return null
    }

    // Calculate threshold in milliseconds based on pixels
    const thresholdMs = Math.max(this.thresholdPx / pixelsPerMs, MIN_SNAP_THRESHOLD_MS)

    let closestPoint: SnapPoint | null = null
    let closestDistance = Infinity

    for (const point of snapPoints) {
      const distance = Math.abs(point.timeMs - timeMs)

      if (distance < thresholdMs && distance < closestDistance) {
        closestDistance = distance
        closestPoint = point
      }
    }

    return closestPoint?.timeMs ?? null
  }

  /**
   * Find snap point with detailed result
   */
  findSnapPointDetailed(
    timeMs: number,
    snapPoints: SnapPoint[],
    pixelsPerMs: number
  ): SnapResult | null {
    if (!this.enabled || snapPoints.length === 0) {
      return null
    }

    const thresholdMs = Math.max(this.thresholdPx / pixelsPerMs, MIN_SNAP_THRESHOLD_MS)

    let closestPoint: SnapPoint | null = null
    let closestDistance = Infinity

    for (const point of snapPoints) {
      const distance = Math.abs(point.timeMs - timeMs)

      if (distance < thresholdMs && distance < closestDistance) {
        closestDistance = distance
        closestPoint = point
      }
    }

    if (!closestPoint) {
      return null
    }

    return {
      snappedTime: closestPoint.timeMs,
      snapPoint: closestPoint,
      distance: closestDistance,
      didSnap: true,
    }
  }

  /**
   * Snap a time value, returning the snapped time or original if no snap
   */
  snap(timeMs: number, snapPoints: SnapPoint[], pixelsPerMs: number): number {
    const snapped = this.findSnapPoint(timeMs, snapPoints, pixelsPerMs)
    return snapped ?? timeMs
  }

  // ─── Magnetic Guides ─────────────────────────────

  /**
   * Get visible snap guides for rendering
   * Returns snap points within the visible time range
   */
  getVisibleSnapGuides(
    snapPoints: SnapPoint[],
    visibleRange: { startMs: number; endMs: number },
    filter?: SnapPointType[]
  ): SnapPoint[] {
    return snapPoints.filter((point) => {
      // Filter by visibility
      if (point.timeMs < visibleRange.startMs || point.timeMs > visibleRange.endMs) {
        return false
      }

      // Filter by type if specified
      if (filter && !filter.includes(point.type)) {
        return false
      }

      return true
    })
  }

  /**
   * Check if a time is near any snap point (for visual feedback)
   */
  isNearSnapPoint(
    timeMs: number,
    snapPoints: SnapPoint[],
    pixelsPerMs: number
  ): { isNear: boolean; snapPoint: SnapPoint | null } {
    const thresholdMs = Math.max(this.thresholdPx / pixelsPerMs, MIN_SNAP_THRESHOLD_MS)

    for (const point of snapPoints) {
      if (Math.abs(point.timeMs - timeMs) < thresholdMs) {
        return { isNear: true, snapPoint: point }
      }
    }

    return { isNear: false, snapPoint: null }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Result of snap detection */
export interface SnapResult {
  /** The snapped time */
  snappedTime: number
  /** The snap point that was matched */
  snapPoint: SnapPoint
  /** Distance from original to snapped time */
  distance: number
  /** Whether snapping occurred */
  didSnap: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

/** Global snap engine instance */
export const snapEngine = new SnapEngine()
