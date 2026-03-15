/**
 * Click Clustering and Misclick Categorization for First-Click Analysis
 *
 * Pure math functions operating on normalized 0-1 coordinates.
 * No UI or external dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface ClusterResult {
  clusters: Array<{
    id: number
    points: Array<{ x: number; y: number; index: number }>
    centroid: { x: number; y: number }
    size: number
  }>
  noise: Array<{ x: number; y: number; index: number }>
  clusterCount: number
}

export interface MisclickCategory {
  nearMiss: number
  wrongElement: number
  lost: number
  total: number
}

export interface AoiBounds {
  id: string
  x: number
  y: number
  width: number
  height: number
  isCorrect: boolean
}

// ============================================================================
// DBSCAN Clustering
// ============================================================================

/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise).
 *
 * @param points - Array of click positions (0-1 normalized)
 * @param epsilon - Neighborhood radius (same coordinate space as points)
 * @param minPoints - Minimum points to form a cluster core
 */
export function dbscan(
  points: Array<{ x: number; y: number }>,
  epsilon: number,
  minPoints: number,
): ClusterResult {
  if (points.length === 0) {
    return { clusters: [], noise: [], clusterCount: 0 }
  }

  const n = points.length
  const labels = new Int32Array(n).fill(-1) // -1 = unvisited
  const NOISE = -2
  let clusterId = 0

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue // already processed

    const neighbors = regionQuery(points, i, epsilon)

    if (neighbors.length < minPoints) {
      labels[i] = NOISE
      continue
    }

    // Start a new cluster
    const currentCluster = clusterId
    clusterId++
    labels[i] = currentCluster

    // Expand cluster using a queue
    const queue = [...neighbors]
    let qIdx = 0

    while (qIdx < queue.length) {
      const j = queue[qIdx++]

      if (labels[j] === NOISE) {
        // Border point — add to cluster
        labels[j] = currentCluster
        continue
      }

      if (labels[j] !== -1) {
        // Already assigned to a cluster
        continue
      }

      labels[j] = currentCluster

      const jNeighbors = regionQuery(points, j, epsilon)
      if (jNeighbors.length >= minPoints) {
        // Core point — expand
        for (const k of jNeighbors) {
          if (labels[k] === -1 || labels[k] === NOISE) {
            queue.push(k)
          }
        }
      }
    }
  }

  // Build result
  const clusterMap = new Map<number, Array<{ x: number; y: number; index: number }>>()
  const noise: Array<{ x: number; y: number; index: number }> = []

  for (let i = 0; i < n; i++) {
    const label = labels[i]
    if (label === NOISE) {
      noise.push({ x: points[i].x, y: points[i].y, index: i })
    } else {
      if (!clusterMap.has(label)) {
        clusterMap.set(label, [])
      }
      clusterMap.get(label)!.push({ x: points[i].x, y: points[i].y, index: i })
    }
  }

  const clusters = Array.from(clusterMap.entries()).map(([id, pts]) => {
    const sumX = pts.reduce((s, p) => s + p.x, 0)
    const sumY = pts.reduce((s, p) => s + p.y, 0)
    return {
      id,
      points: pts,
      centroid: { x: sumX / pts.length, y: sumY / pts.length },
      size: pts.length,
    }
  })

  return { clusters, noise, clusterCount: clusters.length }
}

// ============================================================================
// Misclick Categorization
// ============================================================================

/**
 * Categorize incorrect clicks into near-miss, wrong-element, and lost.
 *
 * @param clicks - Click data with correctness info
 * @param aois - Areas of interest with bounds and correctness flag
 * @param nearMissThreshold - Distance threshold for near-miss detection (default 0.05)
 */
export function categorizeMisclicks(
  clicks: Array<{ x: number; y: number; wasCorrect: boolean; matchedAoiId: string | null }>,
  aois: AoiBounds[],
  nearMissThreshold: number = 0.05,
): MisclickCategory {
  const incorrectClicks = clicks.filter((c) => !c.wasCorrect)
  const correctAois = aois.filter((a) => a.isCorrect)

  let nearMiss = 0
  let wrongElement = 0
  let lost = 0

  for (const click of incorrectClicks) {
    // Check if it's a near-miss (close to a correct AOI boundary)
    const isNearMiss = correctAois.some((aoi) => {
      return distanceToAoiBoundary(click, aoi) <= nearMissThreshold
    })

    if (isNearMiss) {
      nearMiss++
    } else if (click.matchedAoiId !== null) {
      // Hit a non-correct AOI
      wrongElement++
    } else {
      lost++
    }
  }

  return {
    nearMiss,
    wrongElement,
    lost,
    total: incorrectClicks.length,
  }
}

// ============================================================================
// Helpers (not exported)
// ============================================================================

/**
 * Find all point indices within epsilon distance of point at index i.
 * Excludes the point itself.
 */
function regionQuery(
  points: Array<{ x: number; y: number }>,
  i: number,
  epsilon: number,
): number[] {
  const neighbors: number[] = []
  const px = points[i].x
  const py = points[i].y
  const epsSq = epsilon * epsilon

  for (let j = 0; j < points.length; j++) {
    if (i === j) continue
    const dx = points[j].x - px
    const dy = points[j].y - py
    if (dx * dx + dy * dy <= epsSq) {
      neighbors.push(j)
    }
  }

  return neighbors
}

/**
 * Minimum distance from a point to the boundary of an axis-aligned rectangle (AOI).
 *
 * If the point is inside the AOI, returns the distance to the nearest edge.
 * If outside, returns the Euclidean distance to the nearest edge point.
 */
function distanceToAoiBoundary(
  point: { x: number; y: number },
  aoi: AoiBounds,
): number {
  const left = aoi.x
  const right = aoi.x + aoi.width
  const top = aoi.y
  const bottom = aoi.y + aoi.height

  // Clamp point to the nearest edge
  const clampedX = Math.max(left, Math.min(right, point.x))
  const clampedY = Math.max(top, Math.min(bottom, point.y))

  const isInside = point.x >= left && point.x <= right && point.y >= top && point.y <= bottom

  if (isInside) {
    // Distance to nearest edge
    const dLeft = point.x - left
    const dRight = right - point.x
    const dTop = point.y - top
    const dBottom = bottom - point.y
    return Math.min(dLeft, dRight, dTop, dBottom)
  }

  // Euclidean distance to nearest edge point
  const dx = point.x - clampedX
  const dy = point.y - clampedY
  return Math.sqrt(dx * dx + dy * dy)
}
