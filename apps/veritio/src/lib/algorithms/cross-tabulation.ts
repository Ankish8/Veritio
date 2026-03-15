/**
 * Cross-Tabulation Statistical Functions
 *
 * Statistical tests for analyzing relationships between categorical variables
 * in contingency tables.
 */

import type {
  CrossTabCell,
  CrossTabData,
  ChiSquareResult,
  FisherExactResult,
  TTestResult,
} from '../../components/analysis/survey/cross-tabulation/types'
import { interpretCramersV } from '../../components/analysis/survey/cross-tabulation/types'
import {
  mean,
  variance,
  standardDeviation,
  chiSquarePValue,
  tTestPValue,
} from './stat-math'

// Re-export basic stats for existing consumers
export { mean, variance, standardDeviation }

// Re-export distribution functions for existing consumers
export { regularizedGammaP, chiSquareCDF, chiSquarePValue, tDistributionCDF, tTestPValue } from './stat-math'

// =============================================================================
// Chi-Square Test
// =============================================================================

/**
 * Calculate expected counts for a contingency table
 * Expected[i][j] = (rowTotal[i] * colTotal[j]) / grandTotal
 */
export function calculateExpectedCounts(
  observed: number[][],
  rowTotals: number[],
  colTotals: number[],
  grandTotal: number
): number[][] {
  const rows = observed.length
  const cols = observed[0]?.length || 0
  const expected: number[][] = []

  for (let i = 0; i < rows; i++) {
    expected[i] = []
    for (let j = 0; j < cols; j++) {
      expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal
    }
  }

  return expected
}

/**
 * Perform chi-square test of independence on a contingency table
 */
export function calculateChiSquare(crossTabData: CrossTabData): ChiSquareResult {
  const { cells, grandTotal } = crossTabData
  const rows = cells.length
  const cols = cells[0]?.length || 0

  if (rows < 2 || cols < 2 || grandTotal === 0) {
    return {
      chiSquare: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      isSignificant: false,
      cramersV: 0,
      effectInterpretation: 'negligible',
      hasLowExpectedCounts: false,
    }
  }

  // Calculate chi-square statistic
  let chiSquare = 0
  let lowExpectedCount = 0
  const minExpected = Math.min(...cells.flat().map(c => c.expected))

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const observed = cells[i][j].count
      const expected = cells[i][j].expected

      if (expected < 5) lowExpectedCount++
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected
      }
    }
  }

  // Degrees of freedom
  const df = (rows - 1) * (cols - 1)

  // P-value
  const pValue = chiSquarePValue(chiSquare, df)

  // Cramer's V (effect size)
  const minDim = Math.min(rows - 1, cols - 1)
  const cramersV = minDim > 0 ? Math.sqrt(chiSquare / (grandTotal * minDim)) : 0

  // Effect size interpretation
  const effectInterpretation = interpretCramersV(cramersV, df)

  // Warning for low expected counts
  const hasLowExpectedCounts = minExpected < 5
  const lowExpectedWarning = hasLowExpectedCounts
    ? `${lowExpectedCount} cell(s) have expected count < 5. Results may be unreliable.`
    : undefined

  return {
    chiSquare,
    degreesOfFreedom: df,
    pValue,
    isSignificant: pValue < 0.05,
    cramersV,
    effectInterpretation,
    hasLowExpectedCounts,
    lowExpectedCountWarning: lowExpectedWarning,
  }
}

// =============================================================================
// Fisher's Exact Test (for 2x2 tables)
// =============================================================================

/**
 * Calculate factorial using logarithms for numerical stability
 */
function logFactorial(n: number): number {
  if (n <= 1) return 0
  let result = 0
  for (let i = 2; i <= n; i++) {
    result += Math.log(i)
  }
  return result
}

/**
 * Calculate Fisher's exact test p-value for a 2x2 table
 * Uses the hypergeometric distribution
 */
export function fisherExactTest(
  a: number, b: number,
  c: number, d: number
): FisherExactResult {
  const n = a + b + c + d
  const row1 = a + b
  const row2 = c + d
  const col1 = a + c
  const col2 = b + d

  // Hypergeometric probability for this specific table
  function hypergeometricProb(aa: number): number {
    const logP =
      logFactorial(row1) + logFactorial(row2) +
      logFactorial(col1) + logFactorial(col2) -
      logFactorial(n) -
      logFactorial(aa) -
      logFactorial(row1 - aa) -
      logFactorial(col1 - aa) -
      logFactorial(row2 - col1 + aa)

    return Math.exp(logP)
  }

  // Calculate p-value (two-tailed)
  const observedProb = hypergeometricProb(a)
  let pValue = 0

  const minA = Math.max(0, col1 - row2)
  const maxA = Math.min(row1, col1)

  for (let aa = minA; aa <= maxA; aa++) {
    const prob = hypergeometricProb(aa)
    if (prob <= observedProb + 1e-10) {
      pValue += prob
    }
  }

  // Odds ratio
  const oddsRatio = (a * d) / (b * c) || 0

  return {
    pValue: Math.min(1, pValue),
    isSignificant: pValue < 0.05,
    oddsRatio,
  }
}

/**
 * Determine if Fisher's exact test should be used instead of chi-square
 */
export function shouldUseFisherExact(crossTabData: CrossTabData): boolean {
  const { cells, grandTotal } = crossTabData
  const rows = cells.length
  const cols = cells[0]?.length || 0

  // Only for 2x2 tables
  if (rows !== 2 || cols !== 2) return false

  // Use Fisher when sample is small or expected counts are low
  if (grandTotal < 20) return true

  const minExpected = Math.min(...cells.flat().map(c => c.expected))
  return minExpected < 5
}

// =============================================================================
// Independent Samples T-Test (Welch's T-Test)
// =============================================================================

/**
 * Perform Welch's t-test for independent samples
 * Used when comparing a numeric variable across two groups
 */
export function independentTTest(
  groupA: number[],
  groupB: number[]
): TTestResult {
  const nA = groupA.length
  const nB = groupB.length

  // Need at least 2 samples in each group
  if (nA < 2 || nB < 2) {
    return {
      tStatistic: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      isSignificant: false,
      meanA: mean(groupA),
      meanB: mean(groupB),
      meanDifference: mean(groupA) - mean(groupB),
      stdA: standardDeviation(groupA),
      stdB: standardDeviation(groupB),
      confidenceInterval: [0, 0],
    }
  }

  const meanA = mean(groupA)
  const meanB = mean(groupB)
  const varA = variance(groupA)
  const varB = variance(groupB)
  const stdA = Math.sqrt(varA)
  const stdB = Math.sqrt(varB)

  // Welch's t-statistic
  const seA = varA / nA
  const seB = varB / nB
  const pooledSE = Math.sqrt(seA + seB)

  if (pooledSE === 0) {
    return {
      tStatistic: 0,
      degreesOfFreedom: nA + nB - 2,
      pValue: 1,
      isSignificant: false,
      meanA,
      meanB,
      meanDifference: meanA - meanB,
      stdA,
      stdB,
      confidenceInterval: [0, 0],
    }
  }

  const t = (meanA - meanB) / pooledSE

  // Welch-Satterthwaite degrees of freedom
  const df = Math.pow(seA + seB, 2) /
    (Math.pow(seA, 2) / (nA - 1) + Math.pow(seB, 2) / (nB - 1))

  // P-value (two-tailed)
  const pValue = tTestPValue(t, df)

  // 95% Confidence interval for the difference
  // Using t-critical value for 95% CI (approximation)
  const tCritical = 1.96 // Approximation for large df
  const marginOfError = tCritical * pooledSE
  const confidenceInterval: [number, number] = [
    meanA - meanB - marginOfError,
    meanA - meanB + marginOfError,
  ]

  return {
    tStatistic: t,
    degreesOfFreedom: df,
    pValue,
    isSignificant: pValue < 0.05,
    meanA,
    meanB,
    meanDifference: meanA - meanB,
    stdA,
    stdB,
    confidenceInterval,
  }
}

// =============================================================================
// Cross-Tabulation Data Building
// =============================================================================

/**
 * Build CrossTabData from raw counts
 */
export function buildCrossTabData(
  counts: number[][],
  rowLabels: string[],
  colLabels: string[],
  rowQuestionId: string,
  colQuestionId: string,
  rowQuestionText: string,
  colQuestionText: string
): CrossTabData {
  const rows = counts.length
  const cols = counts[0]?.length || 0

  // Calculate totals
  const rowTotals = counts.map(row => row.reduce((sum, c) => sum + c, 0))
  const colTotals: number[] = []
  for (let j = 0; j < cols; j++) {
    colTotals[j] = counts.reduce((sum, row) => sum + row[j], 0)
  }
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0)

  // Build cells with percentages and expected values
  const cells: CrossTabCell[][] = []

  for (let i = 0; i < rows; i++) {
    cells[i] = []
    for (let j = 0; j < cols; j++) {
      const count = counts[i][j]
      const expected = grandTotal > 0
        ? (rowTotals[i] * colTotals[j]) / grandTotal
        : 0

      cells[i][j] = {
        count,
        rowPercent: rowTotals[i] > 0 ? (count / rowTotals[i]) * 100 : 0,
        colPercent: colTotals[j] > 0 ? (count / colTotals[j]) * 100 : 0,
        totalPercent: grandTotal > 0 ? (count / grandTotal) * 100 : 0,
        expected,
        residual: expected > 0 ? (count - expected) / Math.sqrt(expected) : 0,
      }
    }
  }

  return {
    rowLabels,
    colLabels,
    cells,
    rowTotals,
    colTotals,
    grandTotal,
    rowQuestionId,
    colQuestionId,
    rowQuestionText,
    colQuestionText,
  }
}

// =============================================================================
// Export Utilities
// =============================================================================

/**
 * Format cross-tab data for CSV export
 */
export function formatCrossTabForExport(
  data: CrossTabData,
  stats: ChiSquareResult | null,
  displayRowPercent: boolean = true
): string[][] {
  const { rowLabels, colLabels, cells, rowTotals, colTotals, grandTotal } = data
  const result: string[][] = []

  // Header row
  const headerRow = ['', ...colLabels, 'Total']
  result.push(headerRow)

  // Data rows
  for (let i = 0; i < rowLabels.length; i++) {
    const dataRow: string[] = [rowLabels[i]]

    for (let j = 0; j < colLabels.length; j++) {
      const cell = cells[i][j]
      if (displayRowPercent) {
        dataRow.push(`${cell.count} (${cell.rowPercent.toFixed(1)}%)`)
      } else {
        dataRow.push(String(cell.count))
      }
    }

    dataRow.push(String(rowTotals[i]))
    result.push(dataRow)
  }

  // Total row
  const totalRow = ['Total', ...colTotals.map(String), String(grandTotal)]
  result.push(totalRow)

  // Empty row
  result.push([])

  // Statistics
  if (stats) {
    result.push(['Statistical Analysis'])
    result.push(['Chi-square', stats.chiSquare.toFixed(3)])
    result.push(['Degrees of Freedom', String(stats.degreesOfFreedom)])
    result.push(['P-value', stats.pValue < 0.001 ? '< 0.001' : stats.pValue.toFixed(4)])
    result.push(['Significant', stats.isSignificant ? 'Yes (p < 0.05)' : 'No'])
    result.push(['Cramer\'s V', stats.cramersV.toFixed(3)])
    result.push(['Effect Size', stats.effectInterpretation])
    if (stats.lowExpectedCountWarning) {
      result.push(['Warning', stats.lowExpectedCountWarning])
    }
  }

  return result
}
