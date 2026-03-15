/**
 * Statistical Utility Functions
 *
 * Provides confidence intervals, box plot calculations, and scoring
 * algorithms for tree test analysis.
 */
// Types
export interface ConfidenceInterval {
  lowerBound: number  // 0-100 percentage
  upperBound: number  // 0-100 percentage
  level: number       // Confidence level (e.g., 0.95 for 95%)
}
export interface BoxPlotStats {
  min: number         // Lowest non-outlier value
  q1: number          // First quartile (25th percentile)
  median: number      // Second quartile (50th percentile)
  q3: number          // Third quartile (75th percentile)
  max: number         // Highest non-outlier value
  outliers: number[]  // Values outside 1.5 * IQR
}
export interface StatusBreakdown {
  success: { direct: number; indirect: number; total: number }
  fail: { direct: number; indirect: number; total: number }
  skip: { direct: number; indirect: number; total: number }
}
// Confidence Intervals
export function wilsonScoreCI(
  successes: number,
  total: number,
  level: number = 0.95
): ConfidenceInterval {
  // Handle edge cases
  if (total === 0) {
    return { lowerBound: 0, upperBound: 0, level }
  }

  const p = successes / total
  const n = total

  // Z-score for common confidence levels
  // Using approximations for common values, exact for others would need a lookup table
  const z = getZScore(level)

  const zSquared = z * z
  const denominator = 1 + zSquared / n
  const center = (p + zSquared / (2 * n)) / denominator
  const spread = (z / denominator) * Math.sqrt((p * (1 - p) + zSquared / (4 * n)) / n)

  return {
    lowerBound: Math.max(0, (center - spread) * 100),
    upperBound: Math.min(100, (center + spread) * 100),
    level,
  }
}
function getZScore(level: number): number {
  // Common z-scores from the standard normal distribution
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
    0.999: 3.291,
  }

  return zScores[level] ?? 1.96 // Default to 95% CI
}
// Box Plot Statistics

/**
 * Calculate box plot statistics (5-number summary with outliers).
 *
 * Uses the Tukey method:
 * - IQR = Q3 - Q1
 * - Lower fence = Q1 - 1.5 * IQR
 * - Upper fence = Q3 + 1.5 * IQR
 * - Outliers are values outside the fences
 *
 * @param values - Array of numeric values
 * @returns Box plot statistics
 */
export function calculateBoxPlotStats(values: number[]): BoxPlotStats {
  // Handle edge cases
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] }
  }

  if (values.length === 1) {
    return {
      min: values[0],
      q1: values[0],
      median: values[0],
      q3: values[0],
      max: values[0],
      outliers: [],
    }
  }

  // Sort values ascending
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  // Calculate quartiles using linear interpolation
  const q1 = percentile(sorted, 0.25)
  const median = percentile(sorted, 0.5)
  const q3 = percentile(sorted, 0.75)

  // Calculate IQR and fences
  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr

  // Find outliers
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence)

  // Find min/max within fences (whisker endpoints)
  const nonOutliers = sorted.filter(v => v >= lowerFence && v <= upperFence)
  const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0]
  const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[n - 1]

  return { min, q1, median, q3, max, outliers }
}
function percentile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  if (n === 1) return sorted[0]

  const index = (n - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const fraction = index - lower

  if (lower === upper) {
    return sorted[lower]
  }

  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction
}
// Task Score Calculation

/**
 * Calculate task score on a 0-10 scale.
 *
 * Formula: weighted average where success is 3x more important than directness
 *   score = ((successRate * 3 + directnessRate) / 4) * 10 / 100
 *
 * Interpretation:
 * - 10: Perfect (100% success, 100% direct)
 * - 7.5: Excellent (90% success, 90% direct)
 * - 5: Average (60% success, 60% direct)
 * - 2.5: Poor (30% success, 30% direct)
 * - 0: Failure (0% success)
 *
 * @param successRate - Success rate as percentage (0-100)
 * @param directnessRate - Directness rate as percentage (0-100)
 * @returns Score from 0 to 10, rounded to 1 decimal place
 */
export function calculateTaskScore(
  successRate: number,
  directnessRate: number
): number {
  // Weighted formula: success is 3x more important
  const weightedScore = (successRate * 3 + directnessRate) / 4

  // Scale to 0-10 and round to 1 decimal place
  return Math.round((weightedScore / 100) * 10 * 10) / 10
}
// Status Breakdown Utilities
export function computeStatusBreakdown(
  responses: Array<{
    is_correct: boolean | null
    is_direct: boolean | null
    is_skipped: boolean | null
  }>
): StatusBreakdown {
  const breakdown: StatusBreakdown = {
    success: { direct: 0, indirect: 0, total: 0 },
    fail: { direct: 0, indirect: 0, total: 0 },
    skip: { direct: 0, indirect: 0, total: 0 },
  }

  for (const r of responses) {
    if (r.is_skipped === true) {
      breakdown.skip.total++
      // Track direct/indirect for skips based on navigation path
      if (r.is_direct === true) {
        breakdown.skip.direct++
      } else {
        breakdown.skip.indirect++
      }
    } else if (r.is_correct === true) {
      breakdown.success.total++
      if (r.is_direct === true) {
        breakdown.success.direct++
      } else {
        breakdown.success.indirect++
      }
    } else {
      // is_correct is false or null (treated as fail)
      breakdown.fail.total++
      // For failures, direct means they went directly to the wrong answer
      // (short path but wrong destination)
      if (r.is_direct === true) {
        breakdown.fail.direct++
      } else {
        breakdown.fail.indirect++
      }
    }
  }

  return breakdown
}
// Breadcrumb Utilities
export function buildBreadcrumbPath(
  nodes: Array<{ id: string; label: string; parent_id: string | null }>,
  nodeId: string
): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  // Walk up the tree from target to root
  while (currentId) {
    const node = nodes.find(n => n.id === currentId)
    if (!node) break

    path.unshift(node.label)
    currentId = node.parent_id
  }

  return path
}
// Time Formatting
export function formatTimeMs(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = ms / 1000

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${remainingSeconds}s`
}
