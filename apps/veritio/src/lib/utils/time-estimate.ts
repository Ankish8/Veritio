/**
 * Study Time Estimate Calculator
 *
 * Calculates estimated participant completion time based on study content.
 * Used by the builder (reactive via Zustand) and recruit page (server-side via DB counts).
 */

import type { QuestionType } from '@veritio/study-types/study-flow-types'

export interface StudyContentCounts {
  studyType: string
  cardCount: number
  categoryCount: number
  treeTaskCount: number
  prototypeTaskCount: number
  firstClickTaskCount: number
  designCount: number
  liveWebsiteTaskCount: number
  screeningQuestionCount: number
  preStudyQuestionCount: number
  postStudyQuestionCount: number
  surveyQuestionCount: number
  simpleQuestionCount: number
  complexQuestionCount: number
  hasWelcome: boolean
  hasThankYou: boolean
  hasInstructions: boolean
  postTaskQuestionCount: number
}

export interface TimeEstimateResult {
  min: number // seconds
  max: number // seconds
}

/** Seconds per element benchmarks */
const SECONDS = {
  welcome: 30,
  thankYou: 15,
  instructions: 30,
  simpleQuestion: 20,
  complexQuestion: 75,
  cardSortPerCard: 17,
  treeTestPerTask: 52,
  prototypeTestPerTask: 105,
  firstClickPerTask: 37,
  firstImpressionPerDesign: 17,
  liveWebsitePerTask: 120,
  postTaskQuestion: 25,
} as const

/** Spread factors for min/max range */
const MIN_FACTOR = 0.75
const MAX_FACTOR = 1.3

/** Question types considered "simple" (quick to answer) */
const SIMPLE_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  'single_line_text',
  'multiple_choice',
  'image_choice',
  'opinion_scale',
  'yes_no',
  'nps',
  'slider',
  'semantic_differential',
])

/** Question types considered "complex" (take longer) */
const COMPLEX_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  'multi_line_text',
  'matrix',
  'ranking',
  'constant_sum',
  'audio_response',
])

export function isSimpleQuestion(type: string): boolean {
  return SIMPLE_QUESTION_TYPES.has(type as QuestionType)
}

export function isComplexQuestion(type: string): boolean {
  return COMPLEX_QUESTION_TYPES.has(type as QuestionType)
}

/**
 * Calculate min/max time estimate in seconds from study content counts.
 */
export function calculateTimeEstimate(counts: StudyContentCounts): TimeEstimateResult {
  let totalSeconds = 0

  if (counts.hasWelcome) totalSeconds += SECONDS.welcome
  if (counts.hasInstructions) totalSeconds += SECONDS.instructions
  if (counts.hasThankYou) totalSeconds += SECONDS.thankYou

  totalSeconds += counts.simpleQuestionCount * SECONDS.simpleQuestion
  totalSeconds += counts.complexQuestionCount * SECONDS.complexQuestion

  totalSeconds += counts.cardCount * SECONDS.cardSortPerCard
  totalSeconds += counts.treeTaskCount * SECONDS.treeTestPerTask
  totalSeconds += counts.prototypeTaskCount * SECONDS.prototypeTestPerTask
  totalSeconds += counts.firstClickTaskCount * SECONDS.firstClickPerTask
  totalSeconds += counts.designCount * SECONDS.firstImpressionPerDesign
  totalSeconds += counts.liveWebsiteTaskCount * SECONDS.liveWebsitePerTask

  totalSeconds += counts.postTaskQuestionCount * SECONDS.postTaskQuestion

  return {
    min: Math.round(totalSeconds * MIN_FACTOR),
    max: Math.round(totalSeconds * MAX_FACTOR),
  }
}

/**
 * Format a time estimate into a human-readable string.
 *
 * Examples: "About 1 minute", "2-3 minutes", "15-20 minutes"
 */
export function formatTimeEstimate({ min, max }: TimeEstimateResult): string {
  const minMinutes = min / 60
  const maxMinutes = max / 60

  // Less than 1 minute
  if (maxMinutes < 1) {
    return 'Under 1 minute'
  }

  // Round to clean numbers
  const roundedMin = roundToClean(minMinutes)
  const roundedMax = roundToClean(maxMinutes)

  // Very short — "About 1 minute"
  if (roundedMax <= 1) {
    return 'About 1 minute'
  }

  // Same after rounding
  if (roundedMin === roundedMax) {
    return `About ${roundedMin} minutes`
  }

  return `${roundedMin}-${roundedMax} minutes`
}

/** Round minutes to human-friendly numbers: <5 rounds to nearest 1, >=5 rounds to nearest 5. */
function roundToClean(minutes: number): number {
  if (minutes < 1) return 1
  if (minutes < 5) return Math.round(minutes)
  return Math.round(minutes / 5) * 5
}
