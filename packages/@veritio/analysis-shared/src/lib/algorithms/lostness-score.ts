// Lostness Score: Smith (1996) formula L = sqrt((N/S - 1)^2 + (R/N - 1)^2)

export type LostnessStatus = 'perfect' | 'good' | 'acceptable' | 'problematic' | 'lost'

export interface LostnessInfo {
  score: number
  status: LostnessStatus
  description: string
}

export interface LostnessColors {
  text: string
  bg: string
  bgLight: string
  stroke: string
}

export interface LostnessCalculationInput {
  pathTaken: string[]
  optimalPathLength: number
}

export function calculateLostness(input: LostnessCalculationInput): number {
  const { pathTaken, optimalPathLength } = input

  if (pathTaken.length === 0 || optimalPathLength <= 0) {
    return 0
  }

  const R = pathTaken.length
  const N = new Set(pathTaken).size
  const S = optimalPathLength

  if (N === 0 || S === 0) {
    return 0
  }

  const termA = (N / S) - 1
  const termB = (R / N) - 1

  const lostness = Math.sqrt(termA * termA + termB * termB)

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

  const optimalPath = getPathToNode(correctNodeId)
  const optimalPathLength = optimalPath.length + 1

  return calculateLostness({ pathTaken, optimalPathLength })
}

export function getLostnessStatus(score: number): LostnessInfo {
  if (typeof score !== 'number' || isNaN(score)) {
    return { score: 0, status: 'perfect', description: 'Insufficient data' }
  }

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
