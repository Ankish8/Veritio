import { describe, expect, it } from 'vitest'
import { config } from './evaluate-ai-followup.step'

const bodySchema = (config.triggers[0] as { bodySchema: { safeParse: (value: unknown) => { success: boolean } } }).bodySchema
const validBody = {
  participantId: '00000000-0000-4000-8000-000000000001',
  questionId: '00000000-0000-4000-8000-000000000002',
  questionText: 'What made this difficult?',
  answer: 'The navigation was confusing.',
  questionType: 'multi_line_text',
  responseContext: '{"value":"example"}',
  followupPosition: 1,
  depthHint: 'Ask about navigation',
}

describe('AI follow-up public input bounds', () => {
  it('accepts the documented bounded payload', () => {
    expect(bodySchema.safeParse(validBody).success).toBe(true)
  })

  it.each([
    ['questionText', 'x'.repeat(1001)],
    ['answer', 'x'.repeat(4001)],
    ['questionType', 'x'.repeat(65)],
    ['responseContext', 'x'.repeat(8001)],
    ['depthHint', 'x'.repeat(1001)],
  ])('rejects oversized %s before provider work', (field, value) => {
    expect(bodySchema.safeParse({ ...validBody, [field]: value }).success).toBe(false)
  })

  it('rejects empty question text', () => {
    expect(bodySchema.safeParse({ ...validBody, questionText: '' }).success).toBe(false)
  })
})
