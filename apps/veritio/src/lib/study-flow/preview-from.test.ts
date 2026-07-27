import { describe, expect, it } from 'vitest'
import type { StudyFlowQuestion } from '@veritio/study-types/study-flow-types'
import {
  findPreviewQuestion,
  includeForcedPreviewQuestion,
  parsePreviewFrom,
  resolvePreviewSection,
  serializePreviewFrom,
} from './preview-from'

const question = (id: string) => ({ id } as StudyFlowQuestion)

describe('preview-from contract', () => {
  it('parses and serializes supported targets safely', () => {
    expect(parsePreviewFrom('question:question_1')).toEqual({
      kind: 'question',
      id: 'question_1',
    })
    expect(
      serializePreviewFrom({ kind: 'task', id: 'task-2' })
    ).toBe('task:task-2')
    expect(parsePreviewFrom('participant:123')).toBeNull()
    expect(parsePreviewFrom('question:../../admin')).toBeNull()
  })

  it('resolves builder section aliases', () => {
    expect(resolvePreviewSection('pre_study')).toBe('pre_study')
    expect(resolvePreviewSection('prototype_settings')).toBe('activity')
    expect(resolvePreviewSection('unknown')).toBeNull()
  })

  it('finds a question section and temporarily restores a hidden target in order', () => {
    const first = question('first')
    const hidden = question('hidden')
    const last = question('last')
    const sections = {
      screening: [],
      pre_study: [first, hidden, last],
      survey: [],
      post_study: [],
    }

    expect(findPreviewQuestion('hidden', sections)).toEqual({
      step: 'pre_study',
      question: hidden,
    })
    expect(
      includeForcedPreviewQuestion(
        sections.pre_study,
        [first, last],
        'hidden'
      ).map(({ id }) => id)
    ).toEqual(['first', 'hidden', 'last'])
  })
})
