/**
 * Unit tests for use-question-data pure functions.
 * Tests all question type parsers with various data formats.
 */

import { describe, it, expect } from 'vitest'
import {
  getChoiceOptions,
  aggregateChoiceResponses,
  aggregateOpinionScaleResponses,
} from './use-question-data'
import type { StudyFlowQuestionRow, Json } from '@veritio/study-types'

// =============================================================================
// Test Data Fixtures
// =============================================================================

const createQuestion = (
  questionType: string,
  config: Json
): StudyFlowQuestionRow => ({
  id: 'test-question-id',
  study_id: 'test-study-id',
  section: 'survey',
  custom_section_id: null,
  position: 0,
  question_type: questionType,
  question_text: 'Test Question',
  question_text_html: null,
  description: null,
  is_required: true,
  config,
  display_logic: null,
  branching_logic: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
})

// =============================================================================
// Yes/No Question Tests
// =============================================================================

describe('getChoiceOptions - Yes/No Questions', () => {
  it('should parse yes_no config with custom labels', () => {
    const question = createQuestion('yes_no', {
      styleType: 'icons',
      yesLabel: 'Yes, I have!',
      noLabel: 'Not yet',
    })

    const options = getChoiceOptions(question)

    expect(options).toHaveLength(2)
    expect(options[0]).toEqual({ id: 'yes', label: 'Yes, I have!' })
    expect(options[1]).toEqual({ id: 'no', label: 'Not yet' })
  })

  it('should use default labels when not provided', () => {
    const question = createQuestion('yes_no', { styleType: 'buttons' })
    const options = getChoiceOptions(question)

    expect(options).toHaveLength(2)
    expect(options[0]).toEqual({ id: 'yes', label: 'Yes' })
    expect(options[1]).toEqual({ id: 'no', label: 'No' })
  })
})

describe('aggregateChoiceResponses - Yes/No Questions', () => {
  it('should aggregate yes_no responses correctly', () => {
    const question = createQuestion('yes_no', {
      yesLabel: 'Definitely',
      noLabel: 'Nope',
    })

    const responses = [
      { response_value: true },
      { response_value: true },
      { response_value: false },
      { response_value: true },
    ]

    const result = aggregateChoiceResponses(question, responses)

    expect(result.totalResponses).toBe(4)
    expect(result.options).toHaveLength(2)
    expect(result.options[0]).toMatchObject({
      id: 'yes',
      label: 'Definitely',
      count: 3,
      percentage: 75,
    })
    expect(result.options[1]).toMatchObject({
      id: 'no',
      label: 'Nope',
      count: 1,
      percentage: 25,
    })
  })
})

// =============================================================================
// Multiple Choice Tests
// =============================================================================

describe('aggregateChoiceResponses - Multiple Choice Questions', () => {
  it('should aggregate single-choice responses', () => {
    const question = createQuestion('multiple_choice', {
      mode: 'single',
      options: [
        { id: 'opt1', label: 'Option 1' },
        { id: 'opt2', label: 'Option 2' },
        { id: 'opt3', label: 'Option 3' },
      ],
    })

    const responses = [
      { response_value: { optionId: 'opt1' } },
      { response_value: { optionId: 'opt1' } },
      { response_value: { optionId: 'opt2' } },
    ]

    const result = aggregateChoiceResponses(question, responses)

    expect(result.totalResponses).toBe(3)
    expect(result.mode).toBe('single')
    expect(result.options[0]).toMatchObject({
      id: 'opt1',
      count: 2,
      percentage: 67,
    })
    expect(result.options[1]).toMatchObject({
      id: 'opt2',
      count: 1,
      percentage: 33,
    })
  })

  it('should aggregate multi-choice responses', () => {
    const question = createQuestion('multiple_choice', {
      mode: 'multi',
      options: [
        { id: 'opt1', label: 'Option 1' },
        { id: 'opt2', label: 'Option 2' },
      ],
    })

    const responses = [
      { response_value: { optionIds: ['opt1', 'opt2'] } },
      { response_value: { optionIds: ['opt1'] } },
    ]

    const result = aggregateChoiceResponses(question, responses)

    expect(result.totalResponses).toBe(2)
    expect(result.mode).toBe('multi')
    expect(result.options[0].count).toBe(2) // opt1 selected twice
    expect(result.options[1].count).toBe(1) // opt2 selected once
  })
})

// =============================================================================
// Opinion Scale Tests
// =============================================================================

describe('aggregateOpinionScaleResponses - Opinion Scale Questions', () => {
  it('should handle simple number format (new format)', () => {
    const question = createQuestion('opinion_scale', {
      scalePoints: 5,
      scaleType: 'numerical',
      startAtZero: false,
      leftLabel: 'Poor',
      rightLabel: 'Excellent',
    })

    const responses = [
      { response_value: 1 }, // Scale point 1
      { response_value: 3 }, // Scale point 3
      { response_value: 3 },
      { response_value: 5 }, // Scale point 5
    ]

    const result = aggregateOpinionScaleResponses(question, responses)

    expect(result.totalResponses).toBe(4)
    expect(result.scalePoints).toBe(5)
    expect(result.average).toBe(3) // (1 + 3 + 3 + 5) / 4 = 3
    expect(result.distribution[0]).toMatchObject({
      value: 1,
      label: 'Poor',
      count: 1,
      percentage: 25,
    })
    expect(result.distribution[2]).toMatchObject({
      value: 3,
      count: 2,
      percentage: 50,
    })
  })

  it('should handle object format (legacy format)', () => {
    const question = createQuestion('opinion_scale', {
      scalePoints: 5,
      scaleType: 'numerical',
      startAtZero: false,
    })

    const responses = [
      { response_value: { value: 0 } }, // 0-indexed = display 1
      { response_value: { value: 2 } }, // 0-indexed = display 3
      { response_value: { value: 4 } }, // 0-indexed = display 5
    ]

    const result = aggregateOpinionScaleResponses(question, responses)

    expect(result.totalResponses).toBe(3)
    expect(result.distribution[0].count).toBe(1) // Scale 1
    expect(result.distribution[2].count).toBe(1) // Scale 3
    expect(result.distribution[4].count).toBe(1) // Scale 5
  })

  it('should handle mixed formats', () => {
    const question = createQuestion('opinion_scale', {
      scalePoints: 5,
      scaleType: 'numerical',
      startAtZero: false,
    })

    const responses = [
      { response_value: 3 }, // New format (1-indexed)
      { response_value: { value: 2 } }, // Legacy format (0-indexed = display 3)
      { response_value: 5 }, // New format
    ]

    const result = aggregateOpinionScaleResponses(question, responses)

    expect(result.totalResponses).toBe(3)
    expect(result.distribution[2].count).toBe(2) // Scale 3: two responses
    expect(result.distribution[4].count).toBe(1) // Scale 5: one response
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty responses', () => {
    const question = createQuestion('yes_no', { styleType: 'buttons' })
    const result = aggregateChoiceResponses(question, [])

    expect(result.totalResponses).toBe(0)
    expect(result.options[0].count).toBe(0)
    expect(result.options[0].percentage).toBe(0)
  })

  it('should handle malformed response values gracefully', () => {
    const question = createQuestion('opinion_scale', { scalePoints: 5 })
    const responses = [
      { response_value: null },
      { response_value: undefined },
      { response_value: 'invalid' },
      { response_value: 3 }, // Valid
    ]

    const result = aggregateOpinionScaleResponses(question, responses)

    // Should only count the valid response
    expect(result.totalResponses).toBe(1)
    expect(result.distribution[2].count).toBe(1)
  })

  it('should handle missing config gracefully', () => {
    const question = createQuestion('yes_no', null)
    const options = getChoiceOptions(question)

    // Should use defaults
    expect(options).toEqual([
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
    ])
  })
})
