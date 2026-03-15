/**
 * Lostness Score Algorithm
 *
 * Quantifies how "lost" users were during tree test navigation.
 * Based on the Smith (1996) formula used in UX research.
 *
 * Formula: L = sqrt((N/S - 1)² + (R/N - 1)²)
 *
 * Where:
 * - N = number of unique nodes visited
 * - S = optimal path length (minimum nodes to complete task)
 * - R = total nodes visited (including revisits)
 *
 * Score Interpretation:
 * - 0.0 - 0.1: Perfect navigation (followed optimal or near-optimal path)
 * - 0.1 - 0.3: Good navigation (minor deviations)
 * - 0.3 - 0.5: Acceptable (some confusion but found the way)
 * - 0.5 - 0.7: Problematic (significant confusion)
 * - 0.7+: Very lost (major navigation difficulties)
 *
 * Reference: Smith, P. A. (1996). "Towards a practical measure of hypertext usability"
 */

// ============================================================================
// Types
// ============================================================================

export type LostnessStatus = 'perfect' | 'good' | 'acceptable' | 'problematic' | 'lost'

export interface LostnessInfo {
  /** Raw lostness score (0 = perfect, higher = more lost) */
  score: number
  /** Status classification */
  status: LostnessStatus
  /** Human-readable description */
  description: string
}

export interface LostnessColors {
  text: string      // Tailwind text color class
  bg: string        // Tailwind background color class
  bgLight: string   // Lighter background for badges
  stroke: string    // SVG stroke color (hex)
}

export interface LostnessCalculationInput {
  /** Full path taken by user (array of node IDs, may include revisits) */
  pathTaken: string[]
  /** Optimal path length (number of nodes in shortest path to correct answer) */
  optimalPathLength: number
}

// ============================================================================
// Lostness Calculation
// ============================================================================

/**
 * Calculate the Lostness score for a single navigation attempt.
 *
 * @param input - Path taken and optimal path length
 * @returns Lostness score (0 = perfect, higher = more lost)
 *
 * @example
 * // User took optimal path
 * calculateLostness({ pathTaken: ['a', 'b', 'c'], optimalPathLength: 3 })
 * // Returns: 0
 *
 * @example
 * // User backtracked and visited extra nodes
 * calculateLostness({ pathTaken: ['a', 'b', 'a', 'b', 'c', 'd', 'c'], optimalPathLength: 3 })
 * // Returns: ~0.8 (lost)
 */
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

// ============================================================================
// Status Classification
// ============================================================================

/**
 * Get lostness status and description from a lostness score.
 *
 * Thresholds based on UX research literature:
 * - < 0.1: Perfect (minimal or no deviation from optimal)
 * - 0.1-0.3: Good (minor exploration, still efficient)
 * - 0.3-0.5: Acceptable (noticeable confusion but manageable)
 * - 0.5-0.7: Problematic (significant difficulty navigating)
 * - > 0.7: Lost (severe navigation problems)
 *
 * @param score - Raw lostness score
 * @returns Status classification and description
 */
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

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Color mapping for each lostness status.
 * Uses an inverted color scale (green = good/low lostness, red = bad/high lostness)
 */
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

/** Human-readable display labels for each lostness status */
export const LOSTNESS_STATUS_LABELS: Record<LostnessStatus, string> = {
  perfect: 'Perfect',
  good: 'Good',
  acceptable: 'OK',
  problematic: 'Poor',
  lost: 'Lost',
}

/**
 * Get color classes for a lostness status.
 */
export function getLostnessStatusColor(status: LostnessStatus): LostnessColors {
  return STATUS_COLORS[status] || STATUS_COLORS.lost
}

// ============================================================================
// Aggregate Statistics
// ============================================================================

export interface LostnessStats {
  /** Average lostness across all responses */
  average: number
  /** Median lostness */
  median: number
  /** Minimum lostness */
  min: number
  /** Maximum lostness */
  max: number
  /** Status based on average */
  averageStatus: LostnessStatus
  /** Description based on average */
  averageDescription: string
  /** Count of responses in each status category */
  distribution: Record<LostnessStatus, number>
}

/**
 * Calculate aggregate lostness statistics for multiple responses.
 */
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
