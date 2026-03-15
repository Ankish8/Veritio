export type FindabilityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface FindabilityGradeInfo {
  grade: FindabilityGrade
  gradeDescription: string
}

export interface FindabilityGradeColors {
  text: string
  bg: string
  stroke: string
  ring: string
}

export function getFindabilityGrade(score: number): FindabilityGradeInfo {
  if (typeof score !== 'number' || isNaN(score)) {
    return { grade: 'F', gradeDescription: 'Insufficient data' }
  }

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

export function getFindabilityGradeColor(grade: FindabilityGrade): FindabilityGradeColors {
  return GRADE_COLORS[grade] || GRADE_COLORS['F']
}

export function getFindabilityScoreColor(score: number): FindabilityGradeColors {
  const { grade } = getFindabilityGrade(score)
  return getFindabilityGradeColor(grade)
}

const GRADE_BADGE_COLORS: Record<FindabilityGrade, { bg: string; text: string }> = {
  'A+': { bg: 'bg-green-100', text: 'text-green-700' },
  'A': { bg: 'bg-green-100', text: 'text-green-700' },
  'B': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'C': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'D': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'F': { bg: 'bg-red-100', text: 'text-red-700' },
}

export function getFindabilityBadgeColor(grade: FindabilityGrade): { bg: string; text: string } {
  return GRADE_BADGE_COLORS[grade] || GRADE_BADGE_COLORS['F']
}
