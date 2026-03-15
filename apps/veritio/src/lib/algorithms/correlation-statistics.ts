/**
 * Correlation Statistics
 *
 * Statistical functions for computing correlations between survey questions.
 * Supports different question types with appropriate correlation methods.
 */

import { tDistributionCDF } from './stat-math'

// =============================================================================
// Types
// =============================================================================

export type CorrelationMethod =
  | 'pearson'        // Continuous/ordinal variables
  | 'spearman'       // Ordinal/ordinal (rank-based)
  | 'point_biserial' // Binary vs continuous
  | 'cramers_v'      // Categorical vs categorical

export type CorrelationStrength =
  | 'negligible'     // |r| < 0.1
  | 'weak'           // 0.1 <= |r| < 0.3
  | 'moderate'       // 0.3 <= |r| < 0.5
  | 'strong'         // |r| >= 0.5

export interface CorrelationResult {
  coefficient: number       // -1 to 1 (or 0 to 1 for Cramer's V)
  pValue: number
  n: number                 // Sample size
  method: CorrelationMethod
  isSignificant: boolean    // p < 0.05
  strength: CorrelationStrength
}

export interface CorrelationPair {
  question1Id: string
  question2Id: string
  result: CorrelationResult
}

// =============================================================================
// Core Correlation Functions
// =============================================================================

/**
 * Pearson correlation coefficient
 * For continuous or ordinal variables
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0
  }

  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  )

  if (denominator === 0) {
    return 0
  }

  return numerator / denominator
}

/**
 * Spearman rank correlation coefficient
 * For ordinal variables (rank-based)
 */
export function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0
  }

  // Convert to ranks
  const rankX = toRanks(x)
  const rankY = toRanks(y)

  // Use Pearson on ranks
  return pearsonCorrelation(rankX, rankY)
}

/**
 * Convert values to ranks (average rank for ties)
 */
function toRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ value: v, index: i }))
  indexed.sort((a, b) => a.value - b.value)

  const ranks: number[] = new Array(values.length)
  let i = 0

  while (i < indexed.length) {
    // Find all items with the same value
    let j = i
    while (j < indexed.length && indexed[j].value === indexed[i].value) {
      j++
    }

    // Assign average rank to all ties
    const avgRank = (i + 1 + j) / 2
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank
    }

    i = j
  }

  return ranks
}

/**
 * Point-biserial correlation
 * For correlating a binary variable with a continuous variable
 */
export function pointBiserialCorrelation(
  binary: (0 | 1)[],
  continuous: number[]
): number {
  if (binary.length !== continuous.length || binary.length < 2) {
    return 0
  }

  // Split continuous values by binary group
  const group0: number[] = []
  const group1: number[] = []

  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === 0) {
      group0.push(continuous[i])
    } else {
      group1.push(continuous[i])
    }
  }

  if (group0.length === 0 || group1.length === 0) {
    return 0
  }

  // Calculate means
  const mean0 = group0.reduce((a, b) => a + b, 0) / group0.length
  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length

  // Calculate overall standard deviation
  const n = binary.length
  const allValues = continuous
  const overallMean = allValues.reduce((a, b) => a + b, 0) / n
  const variance =
    allValues.reduce((sum, v) => sum + (v - overallMean) ** 2, 0) / n
  const sd = Math.sqrt(variance)

  if (sd === 0) {
    return 0
  }

  // Calculate point-biserial correlation
  const n0 = group0.length
  const n1 = group1.length
  const rpb = ((mean1 - mean0) / sd) * Math.sqrt((n0 * n1) / (n * n))

  return Math.max(-1, Math.min(1, rpb))
}

/**
 * Cramer's V for categorical associations
 * Already implemented in cross-tabulation.ts
 * Re-exported here for convenience
 */
export function cramersV(
  contingencyTable: number[][],
  rowTotals: number[],
  colTotals: number[],
  grandTotal: number
): number {
  if (grandTotal === 0) return 0

  // Calculate chi-square
  let chiSquare = 0
  for (let i = 0; i < contingencyTable.length; i++) {
    for (let j = 0; j < contingencyTable[i].length; j++) {
      const observed = contingencyTable[i][j]
      const expected = (rowTotals[i] * colTotals[j]) / grandTotal
      if (expected > 0) {
        chiSquare += (observed - expected) ** 2 / expected
      }
    }
  }

  // Calculate Cramer's V
  const rows = contingencyTable.length
  const cols = contingencyTable[0]?.length || 0
  const minDim = Math.min(rows, cols) - 1

  if (minDim <= 0) return 0

  return Math.sqrt(chiSquare / (grandTotal * minDim))
}

// =============================================================================
// Significance Testing
// =============================================================================

/**
 * Calculate p-value for correlation coefficient using t-distribution
 */
export function correlationPValue(r: number, n: number): number {
  if (n < 3) return 1

  const df = n - 2
  const rSquared = r * r

  if (rSquared >= 1) {
    return 0
  }

  const t = r * Math.sqrt(df) / Math.sqrt(1 - rSquared)

  return 2 * (1 - tDistributionCDF(Math.abs(t), df))
}

// =============================================================================
// Strength Classification
// =============================================================================

/**
 * Classify correlation strength based on absolute value
 */
export function getCorrelationStrength(r: number): CorrelationStrength {
  const absR = Math.abs(r)

  if (absR < 0.1) return 'negligible'
  if (absR < 0.3) return 'weak'
  if (absR < 0.5) return 'moderate'
  return 'strong'
}

/**
 * Get color class for correlation strength
 */
export function getCorrelationColorClass(
  r: number,
  isSignificant: boolean
): string {
  if (!isSignificant) {
    return 'text-muted-foreground'
  }

  const strength = getCorrelationStrength(r)

  switch (strength) {
    case 'strong':
      return r > 0 ? 'text-emerald-600' : 'text-red-600'
    case 'moderate':
      return r > 0 ? 'text-emerald-500' : 'text-red-500'
    case 'weak':
      return r > 0 ? 'text-emerald-400' : 'text-red-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get background color for correlation heatmap
 */
export function getCorrelationHeatmapColor(
  r: number,
  isSignificant: boolean
): string {
  if (!isSignificant) {
    return 'bg-muted/50'
  }

  const intensity = Math.abs(r)

  if (r > 0) {
    // Positive: green gradient
    if (intensity >= 0.5) return 'bg-emerald-500/80 text-white'
    if (intensity >= 0.3) return 'bg-emerald-400/60'
    if (intensity >= 0.1) return 'bg-emerald-300/40'
    return 'bg-emerald-200/20'
  } else {
    // Negative: red gradient
    if (intensity >= 0.5) return 'bg-red-500/80 text-white'
    if (intensity >= 0.3) return 'bg-red-400/60'
    if (intensity >= 0.1) return 'bg-red-300/40'
    return 'bg-red-200/20'
  }
}

// =============================================================================
// Full Correlation Calculation
// =============================================================================

/**
 * Calculate correlation between two variables with full result
 */
export function calculateCorrelation(
  x: number[],
  y: number[],
  method: CorrelationMethod = 'pearson'
): CorrelationResult {
  const n = Math.min(x.length, y.length)

  if (n < 2) {
    return {
      coefficient: 0,
      pValue: 1,
      n: 0,
      method,
      isSignificant: false,
      strength: 'negligible',
    }
  }

  let coefficient: number

  switch (method) {
    case 'pearson':
      coefficient = pearsonCorrelation(x, y)
      break
    case 'spearman':
      coefficient = spearmanCorrelation(x, y)
      break
    case 'point_biserial':
      // Assume x is binary for point-biserial
      coefficient = pointBiserialCorrelation(
        x as (0 | 1)[],
        y
      )
      break
    case 'cramers_v':
      // Cramer's V requires contingency table - handled separately
      coefficient = 0
      break
    default:
      coefficient = pearsonCorrelation(x, y)
  }

  const pValue = correlationPValue(coefficient, n)
  const isSignificant = pValue < 0.05
  const strength = getCorrelationStrength(coefficient)

  return {
    coefficient,
    pValue,
    n,
    method,
    isSignificant,
    strength,
  }
}

// =============================================================================
// Method Selection
// =============================================================================

export type DataType = 'continuous' | 'ordinal' | 'binary' | 'categorical'

/**
 * Determine the best correlation method based on data types
 */
export function selectCorrelationMethod(
  type1: DataType,
  type2: DataType
): CorrelationMethod {
  const isNumeric = (t: DataType) => t === 'continuous' || t === 'ordinal'

  if (isNumeric(type1) && isNumeric(type2)) {
    return (type1 === 'ordinal' || type2 === 'ordinal') ? 'spearman' : 'pearson'
  }

  // Binary vs continuous/ordinal (either order)
  const [a, b] = [type1, type2]
  if ((a === 'binary' && isNumeric(b)) || (b === 'binary' && isNumeric(a))) {
    return 'point_biserial'
  }

  return 'cramers_v'
}
