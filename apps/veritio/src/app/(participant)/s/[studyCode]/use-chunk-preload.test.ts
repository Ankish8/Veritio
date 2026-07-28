import { describe, expect, it } from 'vitest'
import { collectQuestionTypes } from './use-chunk-preload'

describe('collectQuestionTypes', () => {
  it('returns nothing for a null study', () => {
    expect(collectQuestionTypes(null)).toEqual([])
  })

  it('collects distinct types across every question section', () => {
    const types = collectQuestionTypes({
      screening_questions: [{ question_type: 'yes_no' }],
      pre_study_questions: [{ question_type: 'ranking' }],
      post_study_questions: [{ question_type: 'audio_response' }],
      survey_questions: [{ question_type: 'ranking' }, { question_type: 'nps' }],
    })

    expect([...types].sort()).toEqual(['audio_response', 'nps', 'ranking', 'yes_no'])
  })

  it('tolerates missing sections and malformed questions', () => {
    const types = collectQuestionTypes({
      survey_questions: [
        { question_type: 'nps' },
        {} as { question_type?: string },
        null as unknown as { question_type?: string },
      ],
    })

    expect(types).toEqual(['nps'])
  })
})
