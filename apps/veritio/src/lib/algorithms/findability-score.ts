/**
 * Findability Score Algorithm
 *
 * Provides grade classification for tree test findability scores (0-10 scale).
 * Uses the industry-standard Treejack formula: (successRate × 0.75) + (directness × 0.25)
 *
 * Grade Thresholds (0-10 scale):
 * - A+ (9.0+): Excellent findability
 * - A  (8.0-8.9): Very good findability
 * - B  (7.0-7.9): Good findability
 * - C  (6.0-6.9): Average findability
 * - D  (5.0-5.9): Below average findability
 * - F  (<5.0): Poor findability - needs redesign
 */

// ============================================================================
// Types
// ============================================================================

export type FindabilityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface FindabilityGradeInfo {
  grade: FindabilityGrade
  gradeDescription: string
}

export interface FindabilityGradeColors {
  text: string      // Tailwind text color class
  bg: string        // Tailwind background color class
  stroke: string    // SVG stroke color (hex)
  ring: string      // Tailwind ring color class
}

// ============================================================================
// Grade Calculation
// ============================================================================

/**
 * Get findability grade and description from a 0-10 score.
 *
 * Thresholds follow Treejack's industry-standard benchmarks:
 * - 8+ is considered "good" (green in Treejack)
 * - 6-7 is considered "acceptable with caveats" (light green)
 * - 4-5 is considered "problematic" (orange)
 * - 3 and below is "poor" (red)
 *
 * We extend this to a 6-tier system for more granularity.
 *
 * @param score - Findability score on 0-10 scale
 * @returns Grade letter and human-readable description
 */
export function getFindabilityGrade(score: number): FindabilityGradeInfo {
  // Handle invalid scores
  if (typeof score !== 'number' || isNaN(score)) {
    return { grade: 'F', gradeDescription: 'Insufficient data' }
  }

  // Clamp to valid range
  const clampedScore = Math.max(0, Math.min(10, score))

  if (clampedScore >= 9.0) {
    return { grade: 'A+', gradeDescription: 'Excellent findability' }
  }
  if (clampedScore >= 8.0) {
    return { grade: 'A', gradeDescription: 'Very good findability' }
  }
  if (clampedScore >= 7.0) {
    return { grade: 'B', gradeDescription: 'Good findability' }
  }
  if (clampedScore >= 6.0) {
    return { grade: 'C', gradeDescription: 'Average findability' }
  }
  if (clampedScore >= 5.0) {
    return { grade: 'D', gradeDescription: 'Below average findability' }
  }
  return { grade: 'F', gradeDescription: 'Poor findability - needs redesign' }
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Color mapping for each grade.
 * Follows the codebase's existing color patterns:
 * - Green shades for high performance
 * - Amber/yellow for average
 * - Orange/red for poor performance
 */
const GRADE_COLORS: Record<FindabilityGrade, FindabilityGradeColors> = {
  'A+': {
    text: 'text-green-700',
    bg: 'bg-green-500',
    stroke: '#22c55e', // green-500
    ring: 'ring-green-500',
  },
  'A': {
    text: 'text-green-600',
    bg: 'bg-green-500',
    stroke: '#22c55e', // green-500
    ring: 'ring-green-500',
  },
  'B': {
    text: 'text-emerald-600',
    bg: 'bg-emerald-500',
    stroke: '#10b981', // emerald-500
    ring: 'ring-emerald-500',
  },
  'C': {
    text: 'text-amber-600',
    bg: 'bg-amber-500',
    stroke: '#f59e0b', // amber-500
    ring: 'ring-amber-500',
  },
  'D': {
    text: 'text-orange-600',
    bg: 'bg-orange-500',
    stroke: '#f97316', // orange-500
    ring: 'ring-orange-500',
  },
  'F': {
    text: 'text-red-600',
    bg: 'bg-red-500',
    stroke: '#ef4444', // red-500
    ring: 'ring-red-500',
  },
}

/**
 * Get color classes for a grade.
 *
 * @param grade - Findability grade (A+, A, B, C, D, F)
 * @returns Object with Tailwind classes and hex colors
 */
export function getFindabilityGradeColor(grade: FindabilityGrade): FindabilityGradeColors {
  return GRADE_COLORS[grade] || GRADE_COLORS['F']
}

/**
 * Get color classes directly from a score (convenience function).
 *
 * @param score - Findability score on 0-10 scale
 * @returns Object with Tailwind classes and hex colors
 */
export function getFindabilityScoreColor(score: number): FindabilityGradeColors {
  const { grade } = getFindabilityGrade(score)
  return getFindabilityGradeColor(grade)
}

// ============================================================================
// Badge Color Utilities (for inline badges)
// ============================================================================

/**
 * Get badge-specific styling for grade display.
 * Uses lighter backgrounds with darker text for better readability.
 */
const GRADE_BADGE_COLORS: Record<FindabilityGrade, { bg: string; text: string }> = {
  'A+': { bg: 'bg-green-100', text: 'text-green-700' },
  'A': { bg: 'bg-green-100', text: 'text-green-700' },
  'B': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'C': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'D': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'F': { bg: 'bg-red-100', text: 'text-red-700' },
}

/**
 * Get badge styling for a grade (lighter bg, darker text).
 *
 * @param grade - Findability grade
 * @returns Object with bg and text Tailwind classes
 */
export function getFindabilityBadgeColor(grade: FindabilityGrade): { bg: string; text: string } {
  return GRADE_BADGE_COLORS[grade] || GRADE_BADGE_COLORS['F']
}
