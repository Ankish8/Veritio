/**
 * Spatial Statistics for First-Click Analysis
 *
 * Pure math functions operating on normalized 0-1 coordinates.
 * No UI or external dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export interface WeightedPoint {
  x: number
  y: number
  weight?: number
}

export interface MeanCenter {
  x: number
  y: number
}

export interface SDDResult {
  center: MeanCenter
  radius: number
}

export interface DeviationalEllipse {
  center: MeanCenter
  semiMajor: number
  semiMinor: number
  rotation: number // radians
}

export interface NNIResult {
  observedMean: number
  expectedMean: number
  ratio: number
  zScore: number
  pValue: number
  pattern: 'clustered' | 'random' | 'dispersed'
}

export interface ClickAccuracyResult {
  meanDistance: number
  meanScore: number
  effectiveTargetWidth: number
  scores: number[]
}

export interface TimePercentiles {
  p50: number
  p75: number
  p90: number
  p95: number
}

// ============================================================================
// Mean Center
// ============================================================================

/**
 * Weighted centroid of a set of points.
 * If no weights are provided, all points are weighted equally.
 */
export function calculateMeanCenter(points: WeightedPoint[]): MeanCenter {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  let totalWeight = 0
  let sumX = 0
  let sumY = 0

  for (const p of points) {
    const w = p.weight ?? 1
    sumX += p.x * w
    sumY += p.y * w
    totalWeight += w
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0 }
  }

  return { x: sumX / totalWeight, y: sumY / totalWeight }
}

// ============================================================================
// Standard Distance Deviation
// ============================================================================

/**
 * Standard Distance Deviation — the standard deviation of distances
 * from the weighted mean center.
 */
export function calculateSDD(points: WeightedPoint[]): SDDResult {
  const center = calculateMeanCenter(points)

  if (points.length <= 1) {
    return { center, radius: 0 }
  }

  let totalWeight = 0
  let sumSqDist = 0

  for (const p of points) {
    const w = p.weight ?? 1
    const dx = p.x - center.x
    const dy = p.y - center.y
    sumSqDist += w * (dx * dx + dy * dy)
    totalWeight += w
  }

  if (totalWeight === 0) {
    return { center, radius: 0 }
  }

  const radius = Math.sqrt(sumSqDist / totalWeight)
  return { center, radius }
}

// ============================================================================
// Deviational Ellipse
// ============================================================================

/**
 * Deviational ellipse from the covariance matrix of point positions.
 * Semi-axes come from eigenvalues, rotation from eigenvectors.
 */
export function calculateDeviationalEllipse(points: WeightedPoint[]): DeviationalEllipse {
  const center = calculateMeanCenter(points)

  if (points.length <= 1) {
    return { center, semiMajor: 0, semiMinor: 0, rotation: 0 }
  }

  let totalWeight = 0
  let covXX = 0
  let covYY = 0
  let covXY = 0

  for (const p of points) {
    const w = p.weight ?? 1
    const dx = p.x - center.x
    const dy = p.y - center.y
    covXX += w * dx * dx
    covYY += w * dy * dy
    covXY += w * dx * dy
    totalWeight += w
  }

  if (totalWeight === 0) {
    return { center, semiMajor: 0, semiMinor: 0, rotation: 0 }
  }

  covXX /= totalWeight
  covYY /= totalWeight
  covXY /= totalWeight

  // Eigenvalues of 2x2 symmetric matrix [[covXX, covXY], [covXY, covYY]]
  // λ = ((covXX + covYY) ± sqrt((covXX - covYY)² + 4·covXY²)) / 2
  const trace = covXX + covYY
  const discriminant = Math.sqrt((covXX - covYY) ** 2 + 4 * covXY ** 2)

  const lambda1 = (trace + discriminant) / 2
  const lambda2 = (trace - discriminant) / 2

  const semiMajor = Math.sqrt(Math.max(0, lambda1))
  const semiMinor = Math.sqrt(Math.max(0, lambda2))

  // Rotation: angle of the eigenvector corresponding to the larger eigenvalue
  const rotation = covXY === 0 && covXX === covYY ? 0 : Math.atan2(2 * covXY, covXX - covYY) / 2

  return { center, semiMajor, semiMinor, rotation }
}

// ============================================================================
// Nearest Neighbor Index
// ============================================================================

/**
 * Nearest Neighbor Index (Clark-Evans).
 *
 * Compares observed mean nearest-neighbor distance to expected under
 * complete spatial randomness (CSR).
 *
 * @param points - Array of points (0-1 normalized)
 * @param studyArea - Total area of the study region (e.g. 1.0 for unit square)
 */
export function calculateNNI(points: WeightedPoint[], studyArea: number): NNIResult {
  const n = points.length

  if (n <= 1) {
    return {
      observedMean: 0,
      expectedMean: 0,
      ratio: 1,
      zScore: 0,
      pValue: 1,
      pattern: 'random',
    }
  }

  // Calculate observed mean nearest-neighbor distance
  let totalMinDist = 0
  for (let i = 0; i < n; i++) {
    let minDist = Infinity
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
      }
    }
    totalMinDist += minDist
  }
  const observedMean = totalMinDist / n

  // Expected mean distance under CSR: 0.5 * sqrt(A/n)
  const density = n / studyArea
  const expectedMean = 0.5 * Math.sqrt(studyArea / n)

  // Standard error: 0.26136 / sqrt(n * density)
  const se = 0.26136 / Math.sqrt(n * density)

  const ratio = se > 0 ? observedMean / expectedMean : 1
  const zScore = se > 0 ? (observedMean - expectedMean) / se : 0

  // Two-tailed p-value from z-score using approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  let pattern: 'clustered' | 'random' | 'dispersed'
  if (zScore < -1.96) {
    pattern = 'clustered'
  } else if (zScore > 1.96) {
    pattern = 'dispersed'
  } else {
    pattern = 'random'
  }

  return { observedMean, expectedMean, ratio, zScore, pValue, pattern }
}

// ============================================================================
// Click Accuracy
// ============================================================================

/**
 * Gaussian decay scoring for click accuracy.
 *
 * Each click's score = 100 * exp(-dist² / (2σ²))
 *
 * @param clicks - Array of click positions (0-1)
 * @param targetCentroid - Center of the target (0-1)
 * @param sigma - Decay parameter (default 0.1 = 10% of image dimension)
 */
export function calculateClickAccuracy(
  clicks: Array<{ x: number; y: number }>,
  targetCentroid: { x: number; y: number },
  sigma: number = 0.1,
): ClickAccuracyResult {
  if (clicks.length === 0) {
    return { meanDistance: 0, meanScore: 0, effectiveTargetWidth: 0, scores: [] }
  }

  const distances: number[] = []
  const scores: number[] = []

  for (const click of clicks) {
    const dx = click.x - targetCentroid.x
    const dy = click.y - targetCentroid.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    distances.push(dist)
    scores.push(100 * Math.exp(-(dist * dist) / (2 * sigma * sigma)))
  }

  const meanDistance = distances.reduce((a, b) => a + b, 0) / distances.length
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length

  // Effective target width = standard deviation of distances (1 sigma contains ~68%)
  const varianceSum = distances.reduce((sum, d) => sum + (d - meanDistance) ** 2, 0)
  const effectiveTargetWidth = Math.sqrt(varianceSum / distances.length)

  return { meanDistance, meanScore, effectiveTargetWidth, scores }
}

// ============================================================================
// Time Percentiles
// ============================================================================

/**
 * Calculate P50, P75, P90, P95 using linear interpolation.
 */
export function calculateTimePercentiles(times: number[]): TimePercentiles {
  if (times.length === 0) {
    return { p50: 0, p75: 0, p90: 0, p95: 0 }
  }

  const sorted = [...times].sort((a, b) => a - b)

  return {
    p50: interpolatedPercentile(sorted, 0.5),
    p75: interpolatedPercentile(sorted, 0.75),
    p90: interpolatedPercentile(sorted, 0.9),
    p95: interpolatedPercentile(sorted, 0.95),
  }
}

// ============================================================================
// Helpers (not exported)
// ============================================================================

/**
 * Linear interpolation percentile on a pre-sorted array.
 */
function interpolatedPercentile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  if (n === 1) return sorted[0]

  const index = (n - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const fraction = index - lower

  if (lower === upper) return sorted[lower]
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction
}

/**
 * Approximate standard normal CDF using Abramowitz & Stegun formula 7.1.26.
 * Accurate to ~1.5 × 10⁻⁷.
 */
function normalCDF(x: number): number {
  if (x < -8) return 0
  if (x > 8) return 1

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1.0 / (1.0 + p * absX)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2)

  return 0.5 * (1.0 + sign * y)
}
