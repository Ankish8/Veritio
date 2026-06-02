import { describe, expect, it } from 'vitest'
import {
  evaluateSurveyCompletion,
  type CompletionQuestion,
  type StoredQuestionResponse,
} from '../survey'

function question(overrides: Partial<CompletionQuestion> = {}): CompletionQuestion {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    section: 'survey',
    question_type: 'single_line_text',
    config: {},
    display_logic: null,
    is_required: true,
    custom_section_id: null,
    ...overrides,
  } as CompletionQuestion
}

function response(questionId: string, value: unknown): StoredQuestionResponse {
  return {
    question_id: questionId,
    response_value: value as StoredQuestionResponse['response_value'],
  }
}

describe('evaluateSurveyCompletion', () => {
  it('requires visible required questions to have valid responses', () => {
    const requiredQuestion = question()

    const result = evaluateSurveyCompletion([requiredQuestion], [], false)

    expect(result.isComplete).toBe(false)
    expect(result.visibleQuestionCount).toBe(1)
    expect(result.missingRequiredQuestions).toEqual([requiredQuestion])
  })

  it('treats fully answered visible survey questions as complete for repair checks', () => {
    const questions = [
      question({ id: '11111111-1111-1111-1111-111111111111' }),
      question({ id: '22222222-2222-2222-2222-222222222222', is_required: false }),
    ]

    const result = evaluateSurveyCompletion(
      questions,
      [
        response('11111111-1111-1111-1111-111111111111', 'answered'),
        response('22222222-2222-2222-2222-222222222222', 'also answered'),
      ],
      false,
      { requireAllVisibleQuestions: true }
    )

    expect(result.isComplete).toBe(true)
    expect(result.missingRequiredQuestions).toHaveLength(0)
    expect(result.unansweredVisibleQuestions).toHaveLength(0)
  })

  it('does not auto-complete a skipped optional question when all visible answers are required', () => {
    const questions = [
      question({ id: '11111111-1111-1111-1111-111111111111' }),
      question({ id: '22222222-2222-2222-2222-222222222222', is_required: false }),
    ]

    const explicitCompletion = evaluateSurveyCompletion(
      questions,
      [response('11111111-1111-1111-1111-111111111111', 'answered')],
      true
    )
    const repairCompletion = evaluateSurveyCompletion(
      questions,
      [response('11111111-1111-1111-1111-111111111111', 'answered')],
      true,
      { requireAllVisibleQuestions: true }
    )

    expect(explicitCompletion.isComplete).toBe(true)
    expect(repairCompletion.isComplete).toBe(false)
    expect(repairCompletion.unansweredVisibleQuestions).toHaveLength(1)
  })

  it('requires every semantic differential scale to be answered', () => {
    const semanticQuestion = question({
      question_type: 'semantic_differential',
      config: {
        scalePoints: 7,
        scales: [
          { id: 'scale-a', leftLabel: 'Fast', rightLabel: 'Slow' },
          { id: 'scale-b', leftLabel: 'Detailed', rightLabel: 'Big picture' },
        ],
      },
    })

    const result = evaluateSurveyCompletion(
      [semanticQuestion],
      [response(semanticQuestion.id, { 'scale-a': 1 })],
      false
    )

    expect(result.isComplete).toBe(false)
    expect(result.missingRequiredQuestions).toEqual([semanticQuestion])
  })
})
