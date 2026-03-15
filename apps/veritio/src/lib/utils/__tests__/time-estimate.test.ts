import { describe, it, expect } from 'vitest'
import {
  calculateTimeEstimate,
  formatTimeEstimate,
  isSimpleQuestion,
  isComplexQuestion,
  type StudyContentCounts,
} from '../time-estimate'

function emptyCounts(overrides: Partial<StudyContentCounts> = {}): StudyContentCounts {
  return {
    studyType: 'card_sort',
    cardCount: 0,
    categoryCount: 0,
    treeTaskCount: 0,
    prototypeTaskCount: 0,
    firstClickTaskCount: 0,
    designCount: 0,
    liveWebsiteTaskCount: 0,
    screeningQuestionCount: 0,
    preStudyQuestionCount: 0,
    postStudyQuestionCount: 0,
    surveyQuestionCount: 0,
    simpleQuestionCount: 0,
    complexQuestionCount: 0,
    hasWelcome: false,
    hasThankYou: false,
    hasInstructions: false,
    postTaskQuestionCount: 0,
    ...overrides,
  }
}

describe('isSimpleQuestion / isComplexQuestion', () => {
  it('classifies simple question types correctly', () => {
    expect(isSimpleQuestion('yes_no')).toBe(true)
    expect(isSimpleQuestion('nps')).toBe(true)
    expect(isSimpleQuestion('opinion_scale')).toBe(true)
    expect(isSimpleQuestion('single_line_text')).toBe(true)
    expect(isSimpleQuestion('multiple_choice')).toBe(true)
    expect(isSimpleQuestion('slider')).toBe(true)
    expect(isSimpleQuestion('image_choice')).toBe(true)
    expect(isSimpleQuestion('semantic_differential')).toBe(true)
  })

  it('classifies complex question types correctly', () => {
    expect(isComplexQuestion('multi_line_text')).toBe(true)
    expect(isComplexQuestion('matrix')).toBe(true)
    expect(isComplexQuestion('ranking')).toBe(true)
    expect(isComplexQuestion('constant_sum')).toBe(true)
    expect(isComplexQuestion('audio_response')).toBe(true)
  })

  it('unknown types are neither simple nor complex', () => {
    expect(isSimpleQuestion('unknown')).toBe(false)
    expect(isComplexQuestion('unknown')).toBe(false)
  })
})

describe('calculateTimeEstimate', () => {
  it('returns 0 for empty study', () => {
    const result = calculateTimeEstimate(emptyCounts())
    expect(result.min).toBe(0)
    expect(result.max).toBe(0)
  })

  it('calculates time for card sort study', () => {
    const result = calculateTimeEstimate(emptyCounts({
      studyType: 'card_sort',
      cardCount: 20,
      hasWelcome: true,
      hasInstructions: true,
      hasThankYou: true,
    }))

    // 30 (welcome) + 30 (instructions) + 15 (thank you) + 20*17 (cards) = 415s
    // min: 415 * 0.75 = 311.25 → 311
    // max: 415 * 1.3 = 539.5 → 540
    expect(result.min).toBe(311)
    expect(result.max).toBe(540)
  })

  it('calculates time for tree test study', () => {
    const result = calculateTimeEstimate(emptyCounts({
      studyType: 'tree_test',
      treeTaskCount: 5,
      hasWelcome: true,
      hasThankYou: true,
      postTaskQuestionCount: 5,
    }))

    // 30 (welcome) + 15 (thank you) + 5*52 (tasks) + 5*25 (post-task q) = 430s
    // min: 430 * 0.75 = 322.5 → 323
    // max: 430 * 1.3 = 559 → 559
    expect(result.min).toBe(323)
    expect(result.max).toBe(559)
  })

  it('calculates time for survey with mixed question types', () => {
    const result = calculateTimeEstimate(emptyCounts({
      studyType: 'survey',
      simpleQuestionCount: 10,
      complexQuestionCount: 3,
      hasWelcome: true,
      hasThankYou: true,
    }))

    // 30 + 15 + 10*20 + 3*75 = 470s
    // min: 470 * 0.75 = 352.5 → 353
    // max: 470 * 1.3 = 611 → 611
    expect(result.min).toBe(353)
    expect(result.max).toBe(611)
  })

  it('includes pre-study and screening questions', () => {
    const result = calculateTimeEstimate(emptyCounts({
      studyType: 'card_sort',
      cardCount: 10,
      simpleQuestionCount: 3, // screening + pre-study simple
      complexQuestionCount: 1, // one complex pre-study
    }))

    // 10*17 + 3*20 + 1*75 = 305s
    // min: 305 * 0.75 = 228.75 → 229
    // max: 305 * 1.3 = 396.5 → 397
    expect(result.min).toBe(229)
    expect(result.max).toBe(397)
  })

  it('calculates time for prototype test', () => {
    const result = calculateTimeEstimate(emptyCounts({
      studyType: 'prototype_test',
      prototypeTaskCount: 3,
      postTaskQuestionCount: 6,
      hasWelcome: true,
      hasInstructions: true,
      hasThankYou: true,
    }))

    // 30 + 30 + 15 + 3*105 + 6*25 = 540s
    // min: 540 * 0.75 = 405
    // max: 540 * 1.3 = 702
    expect(result.min).toBe(405)
    expect(result.max).toBe(702)
  })
})

describe('formatTimeEstimate', () => {
  it('formats under 1 minute', () => {
    expect(formatTimeEstimate({ min: 20, max: 40 })).toBe('Under 1 minute')
  })

  it('formats about 1 minute', () => {
    expect(formatTimeEstimate({ min: 40, max: 60 })).toBe('About 1 minute')
  })

  it('formats short ranges', () => {
    expect(formatTimeEstimate({ min: 120, max: 180 })).toBe('2-3 minutes')
  })

  it('formats medium ranges', () => {
    expect(formatTimeEstimate({ min: 300, max: 600 })).toBe('5-10 minutes')
  })

  it('formats longer ranges', () => {
    expect(formatTimeEstimate({ min: 900, max: 1200 })).toBe('15-20 minutes')
  })

  it('handles zero estimate', () => {
    expect(formatTimeEstimate({ min: 0, max: 0 })).toBe('Under 1 minute')
  })

  it('formats same rounded min/max', () => {
    // min: 170s = 2.83min → 3, max: 195s = 3.25min → 3
    expect(formatTimeEstimate({ min: 170, max: 195 })).toBe('About 3 minutes')
  })
})
