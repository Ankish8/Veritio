/**
 * Statistical Significance Calculations
 *
 * Implements chi-square test for comparing proportions between two groups.
 * Used for comparing response rates between designs.
 */

import { chiSquarePValue as computeChiSquarePValue } from './stat-math'

export interface SignificanceResult {
  isSignificant: boolean
  confidenceLevel: number // 0-100%
  pValue: number
  chiSquare: number
}

/**
 * Calculate chi-square test for comparing two proportions
 *
 * This is used to determine if the difference between two response rates
 * is statistically significant or just due to random chance.
 *
 * @param successesA - Number of successes (responses) in group A
 * @param totalA - Total sample size in group A
 * @param successesB - Number of successes (responses) in group B
 * @param totalB - Total sample size in group B
 * @returns SignificanceResult with p-value and confidence level
 */
export function calculateChiSquareSignificance(
  successesA: number,
  totalA: number,
  successesB: number,
  totalB: number
): SignificanceResult {
  if (totalA === 0 || totalB === 0) {
    return {
      isSignificant: false,
      confidenceLevel: 0,
      pValue: 1,
      chiSquare: 0,
    }
  }

  const failuresA = totalA - successesA
  const failuresB = totalB - successesB

  const totalSuccesses = successesA + successesB
  const totalFailures = failuresA + failuresB
  const grandTotal = totalA + totalB

  const expectedSuccessA = (totalA * totalSuccesses) / grandTotal
  const expectedFailureA = (totalA * totalFailures) / grandTotal
  const expectedSuccessB = (totalB * totalSuccesses) / grandTotal
  const expectedFailureB = (totalB * totalFailures) / grandTotal

  let chiSquare = 0

  if (expectedSuccessA > 0) {
    chiSquare += (successesA - expectedSuccessA) ** 2 / expectedSuccessA
  }
  if (expectedFailureA > 0) {
    chiSquare += (failuresA - expectedFailureA) ** 2 / expectedFailureA
  }
  if (expectedSuccessB > 0) {
    chiSquare += (successesB - expectedSuccessB) ** 2 / expectedSuccessB
  }
  if (expectedFailureB > 0) {
    chiSquare += (failuresB - expectedFailureB) ** 2 / expectedFailureB
  }

  const pValue = computeChiSquarePValue(chiSquare, 1)
  const confidenceLevel = (1 - pValue) * 100

  return {
    isSignificant: pValue < 0.05,
    confidenceLevel,
    pValue,
    chiSquare,
  }
}

/**
 * Interpret significance level for user-friendly display
 */
export function interpretSignificance(pValue: number): {
  level: 'high' | 'moderate' | 'low' | 'none'
  description: string
} {
  if (pValue < 0.01) {
    return {
      level: 'high',
      description: '99% confident the difference is real',
    }
  } else if (pValue < 0.05) {
    return {
      level: 'moderate',
      description: '95% confident the difference is real',
    }
  } else if (pValue < 0.1) {
    return {
      level: 'low',
      description: '90% confident - results are suggestive but not conclusive',
    }
  } else {
    return {
      level: 'none',
      description: 'No significant difference detected',
    }
  }
}
