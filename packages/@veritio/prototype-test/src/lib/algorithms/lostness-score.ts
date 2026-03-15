

export type LostnessStatus = 'perfect' | 'good' | 'acceptable' | 'problematic' | 'lost'

export interface LostnessInfo {
  score: number
  status: LostnessStatus
  description: string
}

export interface LostnessColors {
  text: string      // Tailwind text color class
  bg: string        // Tailwind background color class
  bgLight: string   // Lighter background for badges
  stroke: string    // SVG stroke color (hex)
}

export interface LostnessCalculationInput {
  pathTaken: string[]
  optimalPathLength: number
}

export function calculateLostness(input: LostnessCalculationInput): number {
  const { pathTaken, optimalPathLength } = input

  // Handle edge cases
  if (pathTaken.length === 0 || optimalPathLength <= 0) {
    return 0
  }

  // R = total nodes visited (including revisits)
  const R = pathTaken.length

  // N = number of unique nodes visited
  const N = new Set(pathTaken).size

  // S = optimal path length
  const S = optimalPathLength

  // Avoid division by zero
  if (N === 0 || S === 0) {
    return 0
  }

  // Smith (1996) Lostness formula: L = sqrt((N/S - 1)² + (R/N - 1)²)
  const termA = (N / S) - 1  // How many extra unique nodes beyond optimal
  const termB = (R / N) - 1  // Ratio of revisits to unique nodes

  const lostness = Math.sqrt(termA * termA + termB * termB)

  // Round to 2 decimal places
  return Math.round(lostness * 100) / 100
}
export function calculateLostnessFromPath(
  pathTaken: string[],
  correctNodeId: string,
  getPathToNode: (nodeId: string) => string[]
): number {
  if (pathTaken.length === 0 || !correctNodeId) {
    return 0
  }

  // Calculate optimal path (root to correct node, inclusive)
  const optimalPath = getPathToNode(correctNodeId)
  // Add 1 for the target node itself (getPathToNode returns ancestors only)
  const optimalPathLength = optimalPath.length + 1

  return calculateLostness({ pathTaken, optimalPathLength })
}
export function getLostnessStatus(score: number): LostnessInfo {
  // Handle invalid scores
  if (typeof score !== 'number' || isNaN(score)) {
    return { score: 0, status: 'perfect', description: 'Insufficient data' }
  }

  // Clamp negative scores to 0
  const clampedScore = Math.max(0, score)

  if (clampedScore < 0.1) {
    return {
      score: clampedScore,
      status: 'perfect',
      description: 'Optimal navigation',
    }
  }
  if (clampedScore < 0.3) {
    return {
      score: clampedScore,
      status: 'good',
      description: 'Minor deviations',
    }
  }
  if (clampedScore < 0.5) {
    return {
      score: clampedScore,
      status: 'acceptable',
      description: 'Some confusion',
    }
  }
  if (clampedScore < 0.7) {
    return {
      score: clampedScore,
      status: 'problematic',
      description: 'Navigation difficulties',
    }
  }
  return {
    score: clampedScore,
    status: 'lost',
    description: 'Severely lost',
  }
}
const STATUS_COLORS: Record<LostnessStatus, LostnessColors> = {
  perfect: {
    text: 'text-green-600',
    bg: 'bg-green-500',
    bgLight: 'bg-green-100',
    stroke: '#22c55e', // green-500
  },
  good: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    stroke: '#10b981', // emerald-500
  },
  acceptable: {
    text: 'text-amber-600',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-100',
    stroke: '#f59e0b', // amber-500
  },
  problematic: {
    text: 'text-orange-600',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-100',
    stroke: '#f97316', // orange-500
  },
  lost: {
    text: 'text-red-600',
    bg: 'bg-red-500',
    bgLight: 'bg-red-100',
    stroke: '#ef4444', // red-500
  },
}

export function getLostnessStatusColor(status: LostnessStatus): LostnessColors {
  return STATUS_COLORS[status] || STATUS_COLORS.lost
}

export function getLostnessScoreColor(score: number): LostnessColors {
  const { status } = getLostnessStatus(score)
  return getLostnessStatusColor(status)
}

export interface LostnessStats {
  average: number
  median: number
  min: number
  max: number
  averageStatus: LostnessStatus
  averageDescription: string
  distribution: Record<LostnessStatus, number>
}

export function calculateLostnessStats(scores: number[]): LostnessStats {
  if (scores.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      averageStatus: 'perfect',
      averageDescription: 'No data',
      distribution: { perfect: 0, good: 0, acceptable: 0, problematic: 0, lost: 0 },
    }
  }

  const sorted = [...scores].sort((a, b) => a - b)
  const sum = scores.reduce((acc, s) => acc + s, 0)
  const average = Math.round((sum / scores.length) * 100) / 100

  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid]

  const { status: averageStatus, description: averageDescription } = getLostnessStatus(average)

  // Count distribution
  const distribution: Record<LostnessStatus, number> = {
    perfect: 0,
    good: 0,
    acceptable: 0,
    problematic: 0,
    lost: 0,
  }

  for (const score of scores) {
    const { status } = getLostnessStatus(score)
    distribution[status]++
  }

  return {
    average,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    averageStatus,
    averageDescription,
    distribution,
  }
}
