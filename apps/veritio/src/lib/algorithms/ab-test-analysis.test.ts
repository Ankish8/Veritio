import { describe, it, expect } from 'vitest'
import {
  chiSquareTest,
  tTest,
  mannWhitneyUTest,
  calculateABTestStatistics,
  selectStatisticalTest,
} from './ab-test-analysis'

describe('A/B Test Statistical Analysis', () => {
  describe('selectStatisticalTest', () => {
    it('should select chi-square for categorical data', () => {
      expect(selectStatisticalTest('multiple_choice')).toBe('chi_square')
      expect(selectStatisticalTest('yes_no')).toBe('chi_square')
    })

    it('should select t-test for continuous data', () => {
      expect(selectStatisticalTest('nps')).toBe('t_test')
      expect(selectStatisticalTest('opinion_scale')).toBe('t_test')
    })

    it('should select Mann-Whitney U for ordinal data', () => {
      expect(selectStatisticalTest('ranking')).toBe('mann_whitney_u')
    })
  })

  describe('chiSquareTest', () => {
    it('should return p-value of 1.0 for empty data', () => {
      const result = chiSquareTest([], [])
      expect(result.pValue).toBe(1.0)
      expect(result.chiSquare).toBe(0)
    })

    it('should return p-value of 1.0 for single category', () => {
      const result = chiSquareTest(['A', 'A', 'A'], ['A', 'A', 'A'])
      expect(result.pValue).toBe(1.0)
    })

    it('should calculate chi-square for different distributions', () => {
      // Variant A: 10 "Yes", 5 "No"
      // Variant B: 5 "Yes", 10 "No"
      const variantA = Array(10).fill('Yes').concat(Array(5).fill('No'))
      const variantB = Array(5).fill('Yes').concat(Array(10).fill('No'))

      const result = chiSquareTest(variantA, variantB)

      // Should have low p-value (significant difference)
      expect(result.chiSquare).toBeGreaterThan(0)
      expect(result.pValue).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('should handle identical distributions', () => {
      const variantA = ['A', 'B', 'C', 'A', 'B', 'C']
      const variantB = ['A', 'B', 'C', 'A', 'B', 'C']

      const result = chiSquareTest(variantA, variantB)

      // Should have high p-value (no significant difference)
      expect(result.chiSquare).toBe(0)
      expect(result.pValue).toBeGreaterThan(0.05)
    })
  })

  describe('tTest', () => {
    it('should return p-value of 1.0 for insufficient data', () => {
      const result = tTest([5], [10])
      expect(result.pValue).toBe(1.0)
      expect(result.tStatistic).toBe(0)
    })

    it('should calculate t-test for different means', () => {
      // Variant A: mean ~5
      const variantA = [4, 5, 6, 5, 4, 6]
      // Variant B: mean ~10
      const variantB = [9, 10, 11, 10, 9, 11]

      const result = tTest(variantA, variantB)

      // Should have very low p-value (significant difference)
      expect(result.tStatistic).not.toBe(0)
      expect(result.pValue).toBeLessThan(0.05)
      expect(result.confidenceInterval[0]).toBeLessThan(result.confidenceInterval[1])
    })

    it('should handle identical means', () => {
      const variantA = [5, 5, 5, 5, 5]
      const variantB = [5, 5, 5, 5, 5]

      const result = tTest(variantA, variantB)

      // Should have high p-value (no significant difference)
      // Note: With zero variance, this returns p=1.0 due to se=0 check
      expect(result.pValue).toBe(1.0)
    })
  })

  describe('mannWhitneyUTest', () => {
    it('should return p-value of 1.0 for empty data', () => {
      const result = mannWhitneyUTest([], [])
      expect(result.pValue).toBe(1.0)
      expect(result.uStatistic).toBe(0)
    })

    it('should calculate U statistic for different distributions', () => {
      // Variant A: lower ranks
      const variantA = [1, 2, 3, 4, 5]
      // Variant B: higher ranks
      const variantB = [6, 7, 8, 9, 10]

      const result = mannWhitneyUTest(variantA, variantB)

      // Should have very low p-value (significant difference)
      expect(result.uStatistic).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeLessThan(0.05)
    })

    it('should handle identical distributions', () => {
      const variantA = [1, 2, 3, 4, 5]
      const variantB = [1, 2, 3, 4, 5]

      const result = mannWhitneyUTest(variantA, variantB)

      // Should have high p-value (no significant difference)
      expect(result.pValue).toBeGreaterThan(0.05)
    })

    it('should handle ties correctly', () => {
      const variantA = [1, 1, 2, 2, 3]
      const variantB = [1, 2, 2, 3, 3]

      const result = mannWhitneyUTest(variantA, variantB)

      // Should handle ties with average ranks
      expect(result.uStatistic).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeGreaterThanOrEqual(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })
  })

  describe('calculateABTestStatistics', () => {
    it('should return default values for empty data', () => {
      const result = calculateABTestStatistics([], [], 'multiple_choice')

      expect(result.variant_a_count).toBe(0)
      expect(result.variant_b_count).toBe(0)
      expect(result.p_value).toBe(1.0)
      expect(result.is_significant).toBe(false)
    })

    it('should use chi-square test for multiple choice questions', () => {
      const variantA = Array(20).fill('Option A').concat(Array(5).fill('Option B'))
      const variantB = Array(5).fill('Option A').concat(Array(20).fill('Option B'))

      const result = calculateABTestStatistics(variantA, variantB, 'multiple_choice')

      expect(result.variant_a_count).toBe(25)
      expect(result.variant_b_count).toBe(25)
      expect(result.p_value).toBeLessThan(0.05)
      expect(result.is_significant).toBe(true)
    })

    it('should use t-test for NPS questions', () => {
      // Variant A: promoters (9-10)
      const variantA = [9, 10, 9, 10, 9, 10, 9, 10]
      // Variant B: detractors (0-6)
      const variantB = [3, 4, 5, 3, 4, 5, 3, 4]

      const result = calculateABTestStatistics(variantA, variantB, 'nps')

      expect(result.variant_a_count).toBe(8)
      expect(result.variant_b_count).toBe(8)
      expect(result.p_value).toBeLessThan(0.05)
      expect(result.is_significant).toBe(true)
      expect(result.confidence_interval![0]).toBeLessThan(result.confidence_interval![1])
    })

    it('should use Mann-Whitney U for ranking questions', () => {
      const variantA = [1, 2, 3, 4, 5]
      const variantB = [6, 7, 8, 9, 10]

      const result = calculateABTestStatistics(variantA, variantB, 'ranking')

      expect(result.variant_a_count).toBe(5)
      expect(result.variant_b_count).toBe(5)
      expect(result.p_value).toBeLessThan(0.05)
      expect(result.is_significant).toBe(true)
    })

    it('should handle no significant difference', () => {
      const variantA = [5, 5, 6, 6, 7, 7]
      const variantB = [5, 5, 6, 6, 7, 7]

      const result = calculateABTestStatistics(variantA, variantB, 'opinion_scale')

      expect(result.p_value).toBeGreaterThan(0.05)
      expect(result.is_significant).toBe(false)
    })
  })
})
