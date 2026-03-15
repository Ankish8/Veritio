import * as ss from 'simple-statistics'
import type { ResponseValue, QuestionType, ABTestStatistics } from '../supabase/study-flow-types'
import { chiSquarePValue as computeChiSquarePValue } from './stat-math'

export function selectStatisticalTest(
  questionType: QuestionType
): 'chi_square' | 't_test' | 'mann_whitney_u' {
  switch (questionType) {
    case 'multiple_choice':
    case 'yes_no':
      return 'chi_square'
    case 'nps':
    case 'opinion_scale':
      return 't_test'
    case 'ranking':
      return 'mann_whitney_u'
    default:
      return 'chi_square'
  }
}

export function chiSquareTest(
  variantA: ResponseValue[],
  variantB: ResponseValue[]
): { pValue: number; chiSquare: number } {
  const frequencyA = new Map<string, number>()
  const frequencyB = new Map<string, number>()

  for (const value of variantA) {
    const key = JSON.stringify(value)
    frequencyA.set(key, (frequencyA.get(key) || 0) + 1)
  }

  for (const value of variantB) {
    const key = JSON.stringify(value)
    frequencyB.set(key, (frequencyB.get(key) || 0) + 1)
  }

  const allCategories = new Set([...frequencyA.keys(), ...frequencyB.keys()])

  if (allCategories.size < 2 || variantA.length === 0 || variantB.length === 0) {
    return { pValue: 1.0, chiSquare: 0 }
  }

  let chiSquare = 0
  const nA = variantA.length
  const nB = variantB.length
  const nTotal = nA + nB

  for (const category of allCategories) {
    const observedA = frequencyA.get(category) || 0
    const observedB = frequencyB.get(category) || 0
    const total = observedA + observedB

    const expectedA = (nA * total) / nTotal
    const expectedB = (nB * total) / nTotal

    if (expectedA > 0) {
      chiSquare += (observedA - expectedA) ** 2 / expectedA
    }
    if (expectedB > 0) {
      chiSquare += (observedB - expectedB) ** 2 / expectedB
    }
  }

  const df = allCategories.size - 1
  const pValue = computeChiSquarePValue(chiSquare, df)

  return { pValue, chiSquare }
}

export function tTest(
  variantA: number[],
  variantB: number[]
): { pValue: number; tStatistic: number; confidenceInterval: [number, number] } {
  if (variantA.length < 2 || variantB.length < 2) {
    return { pValue: 1.0, tStatistic: 0, confidenceInterval: [0, 0] }
  }

  const meanA = ss.mean(variantA)
  const meanB = ss.mean(variantB)
  const varA = ss.variance(variantA)
  const varB = ss.variance(variantB)
  const nA = variantA.length
  const nB = variantB.length

  const se = Math.sqrt(varA / nA + varB / nB)

  if (se === 0) {
    return { pValue: 1.0, tStatistic: 0, confidenceInterval: [0, 0] }
  }

  const tStatistic = (meanA - meanB) / se

  // Two-tailed p-value using normal approximation (consistent with original)
  const pValue = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(tStatistic)))

  const criticalValue = 1.96
  const marginOfError = criticalValue * se
  const difference = meanA - meanB

  return {
    pValue: Math.max(0, Math.min(1, pValue)),
    tStatistic,
    confidenceInterval: [difference - marginOfError, difference + marginOfError],
  }
}

export function mannWhitneyUTest(
  variantA: number[],
  variantB: number[]
): { pValue: number; uStatistic: number } {
  if (variantA.length === 0 || variantB.length === 0) {
    return { pValue: 1.0, uStatistic: 0 }
  }

  const nA = variantA.length
  const nB = variantB.length

  const combined = [
    ...variantA.map((val, idx) => ({ value: val, group: 'A' as const, index: idx })),
    ...variantB.map((val, idx) => ({ value: val, group: 'B' as const, index: idx })),
  ]

  combined.sort((a, b) => a.value - b.value)

  const ranks: number[] = []
  let i = 0
  while (i < combined.length) {
    let j = i
    while (j < combined.length && combined[j].value === combined[i].value) {
      j++
    }
    const avgRank = ((i + 1) + j) / 2
    for (let k = i; k < j; k++) {
      ranks.push(avgRank)
    }
    i = j
  }

  let rankSumA = 0
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'A') {
      rankSumA += ranks[k]
    }
  }

  const uA = rankSumA - (nA * (nA + 1)) / 2
  const uB = nA * nB - uA
  const uStatistic = Math.min(uA, uB)

  const meanU = (nA * nB) / 2
  const stdU = Math.sqrt((nA * nB * (nA + nB + 1)) / 12)

  if (stdU === 0) {
    return { pValue: 1.0, uStatistic }
  }

  const z = (uStatistic - meanU) / stdU
  const pValue = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(z)))

  return {
    pValue: Math.max(0, Math.min(1, pValue)),
    uStatistic,
  }
}

// Main function: Calculate A/B test statistics
export function calculateABTestStatistics(
  variantAResponses: ResponseValue[],
  variantBResponses: ResponseValue[],
  questionType: QuestionType
): ABTestStatistics {
  // Calculate completion rates (all responses in array are completed)
  const totalA = variantAResponses.length
  const totalB = variantBResponses.length

  // Default values for empty data
  if (totalA === 0 || totalB === 0) {
    return {
      variant_a_count: totalA,
      variant_b_count: totalB,
      variant_a_completion_rate: totalA > 0 ? 1.0 : 0,
      variant_b_completion_rate: totalB > 0 ? 1.0 : 0,
      p_value: 1.0,
      confidence_interval: [0, 0],
      is_significant: false,
    }
  }

  // Select and run appropriate statistical test
  const testType = selectStatisticalTest(questionType)
  let pValue: number
  let confidenceInterval: [number, number] = [0, 0]

  switch (testType) {
    case 'chi_square': {
      const result = chiSquareTest(variantAResponses, variantBResponses)
      pValue = result.pValue
      break
    }
    case 't_test': {
      // Extract numeric values for t-test
      const numericA = variantAResponses
        .map(v => typeof v === 'number' ? v : null)
        .filter((v): v is number => v !== null)
      const numericB = variantBResponses
        .map(v => typeof v === 'number' ? v : null)
        .filter((v): v is number => v !== null)

      const result = tTest(numericA, numericB)
      pValue = result.pValue
      confidenceInterval = result.confidenceInterval
      break
    }
    case 'mann_whitney_u': {
      // Extract numeric values for Mann-Whitney U test
      const numericA = variantAResponses
        .map(v => typeof v === 'number' ? v : null)
        .filter((v): v is number => v !== null)
      const numericB = variantBResponses
        .map(v => typeof v === 'number' ? v : null)
        .filter((v): v is number => v !== null)

      const result = mannWhitneyUTest(numericA, numericB)
      pValue = result.pValue
      break
    }
  }

  const isSignificant = pValue < 0.05

  return {
    variant_a_count: totalA,
    variant_b_count: totalB,
    variant_a_completion_rate: totalA > 0 ? 1.0 : 0,
    variant_b_completion_rate: totalB > 0 ? 1.0 : 0,
    p_value: pValue,
    confidence_interval: confidenceInterval,
    is_significant: isSignificant,
  }
}

// Extended statistics with test type info (for internal use)
export interface ExtendedABTestStatistics extends ABTestStatistics {
  test_type: 'chi_square' | 't_test' | 'mann_whitney_u';
}

export function calculateExtendedABTestStatistics(
  variantAResponses: ResponseValue[],
  variantBResponses: ResponseValue[],
  questionType: QuestionType
): ExtendedABTestStatistics {
  const baseStats = calculateABTestStatistics(variantAResponses, variantBResponses, questionType)
  return {
    ...baseStats,
    test_type: selectStatisticalTest(questionType),
  }
}
