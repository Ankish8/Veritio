import { describe, expect, it } from 'vitest'
import { summarizeAiFollowups } from './ai-followup-summary'
import { attachAiFollowups, type StudySummary } from './data-summarizer'
import { buildAiFollowupRows, flattenAiFollowups } from '../../lib/export/ai-followups'
import { formatFollowupAnswer, type AiFollowupEntry } from '../../lib/ai-followup/format'

function entry(overrides: Partial<AiFollowupEntry> = {}): AiFollowupEntry {
  return {
    id: 'f1',
    participant_id: 'p1',
    parent_question_id: 'q1',
    parent_question_text: '<p>How easy was checkout?</p>',
    question_text: 'What made it hard?',
    trigger_reason: 'NPS 3/10 (detractor)',
    position: 1,
    model_used: 'mercury-2',
    created_at: '2026-10-01T10:00:00Z',
    followup_question_type: 'text',
    followup_question_config: null,
    response: { response_value: { text: 'The coupon field' }, response_time_ms: 4200 },
    ...overrides,
  }
}

const baseSummary: StudySummary = {
  studyTitle: 'S',
  studyType: 'card_sort',
  participantCount: 1,
  completedCount: 1,
  completionRate: 100,
  avgCompletionTimeMs: 0,
  data: {},
  hasQuestionnaire: true,
  questionnaireData: { questions: [] },
}

describe('formatFollowupAnswer', () => {
  it('formats each follow-up type', () => {
    expect(formatFollowupAnswer(entry())).toBe('The coupon field')
    expect(
      formatFollowupAnswer(entry({
        followup_question_type: 'multiple_choice',
        followup_question_config: { options: [{ id: 'opt_0', label: 'Price' }] },
        response: { response_value: { optionId: 'opt_0' }, response_time_ms: null },
      }))
    ).toBe('Price')
    expect(formatFollowupAnswer(entry({ followup_question_type: 'yes_no', response: { response_value: { value: false }, response_time_ms: null } }))).toBe('No')
    expect(formatFollowupAnswer(entry({ response: null }))).toBe('')
  })
})

describe('summarizeAiFollowups', () => {
  it('groups by parent question, strips HTML and respects the participant filter', () => {
    const entries = [entry(), entry({ id: 'f2', participant_id: 'p2', response: { response_value: { text: 'Slow' }, response_time_ms: 1 } })]
    const all = summarizeAiFollowups(entries)
    expect(all).toEqual([
      expect.objectContaining({ question: 'How easy was checkout?', asked: 2, answered: 2 }),
    ])
    const filtered = summarizeAiFollowups(entries, new Set(['p2']))
    expect(filtered?.[0].samples).toEqual([{ probe: 'What made it hard?', answer: 'Slow' }])
  })

  it('returns undefined when nothing was answered in scope', () => {
    expect(summarizeAiFollowups([])).toBeUndefined()
    expect(summarizeAiFollowups([entry()], new Set(['nobody']))).toBeUndefined()
  })
})

describe('attachAiFollowups', () => {
  const followups = summarizeAiFollowups([entry()])

  it('adds follow-ups to questionnaire data for non-survey studies', () => {
    const result = attachAiFollowups(baseSummary, followups)
    expect(result.questionnaireData?.aiFollowups).toEqual(followups)
  })

  it('adds follow-ups to the main data for surveys', () => {
    const result = attachAiFollowups({ ...baseSummary, studyType: 'survey', hasQuestionnaire: false }, followups)
    expect(result.data.aiFollowups).toEqual(followups)
  })
})

describe('AI follow-up CSV rows', () => {
  it('flattens the grouped payload and filters by segment', () => {
    const flat = flattenAiFollowups({ q1: [entry()], q2: [entry({ id: 'f2', participant_id: 'p2', parent_question_id: 'q2' })] })
    expect(flat).toHaveLength(2)
    expect(flattenAiFollowups([])).toEqual([])
    const rows = buildAiFollowupRows(flat, new Set(['p1']))
    expect(rows).toHaveLength(2) // header + one row
    expect(rows[1]).toEqual(expect.arrayContaining(['p1', 'q1', 'How easy was checkout?', 'The coupon field', '4.2', 'AI']))
  })

  it('neutralizes spreadsheet formulas in participant text', () => {
    const rows = buildAiFollowupRows([entry({ response: { response_value: { text: '=HYPERLINK("x")' }, response_time_ms: null } })])
    expect(rows[1]).toContain(`'=HYPERLINK("x")`)
  })
})
