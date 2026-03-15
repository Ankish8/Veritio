export interface ConfidenceInterval {
  lowerBound: number
  upperBound: number
  level: number
}

export interface BoxPlotStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers: number[]
}

export interface StatusBreakdown {
  success: { direct: number; indirect: number; total: number }
  fail: { direct: number; indirect: number; total: number }
  skip: { direct: number; indirect: number; total: number }
}
export function wilsonScoreCI(
  successes: number,
  total: number,
  level: number = 0.95
): ConfidenceInterval {
  if (total === 0) {
    return { lowerBound: 0, upperBound: 0, level }
  }

  const p = successes / total
  const n = total

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
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
    0.999: 3.291,
  }

  return zScores[level] ?? 1.96 // Default to 95% CI
}
export function calculateBoxPlotStats(values: number[]): BoxPlotStats {
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

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const q1 = percentile(sorted, 0.25)
  const median = percentile(sorted, 0.5)
  const q3 = percentile(sorted, 0.75)

  const iqr = q3 - q1
  const lowerFence = q1 - 1.5 * iqr
  const upperFence = q3 + 1.5 * iqr

  const outliers = sorted.filter(v => v < lowerFence || v > upperFence)
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
export function calculateTaskScore(
  successRate: number,
  directnessRate: number
): number {
  const weightedScore = (successRate * 3 + directnessRate) / 4

  return Math.round((weightedScore / 100) * 10 * 10) / 10
}

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
      breakdown.fail.total++
      if (r.is_direct === true) {
        breakdown.fail.direct++
      } else {
        breakdown.fail.indirect++
      }
    }
  }

  return breakdown
}

export function buildBreadcrumbPath(
  nodes: Array<{ id: string; label: string; parent_id: string | null }>,
  nodeId: string
): string[] {
  const path: string[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    const node = nodes.find(n => n.id === currentId)
    if (!node) break

    path.unshift(node.label)
    currentId = node.parent_id
  }

  return path
}

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
