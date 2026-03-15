/**
 * Shared descriptive statistics utilities.
 * Used by: numerical-visualization, slider-visualization,
 * semantic-differential-visualization, constant-sum-visualization
 */

export interface DescriptiveStats {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  count: number
}

/**
 * Calculate mean, median, standard deviation, min, max for a set of numbers.
 * Returns null if values is empty.
 */
export function calculateDescriptiveStats(values: number[]): DescriptiveStats | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const sum = sorted.reduce((acc, v) => acc + v, 0)
  const mean = sum / n

  const mid = Math.floor(n / 2)
  const median = n % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]

  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
  }
}
