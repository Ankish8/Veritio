import { describe, expect, it, vi } from 'vitest'
import { decideFollowup } from './rules'
import { parseFollowupResponse } from './parse'
import { buildSystemPrompt, buildUserMessage } from './prompt'
import { generateFollowup } from './generate'
import { buildFollowupThread, parseResponseContext } from './context'
import type { FollowupEvaluationInput } from './types'

function input(overrides: Partial<FollowupEvaluationInput> & { type?: string; config?: Record<string, unknown> } = {}): FollowupEvaluationInput {
  const { type = 'multi_line_text', config = {}, ...rest } = overrides
  return {
    study: { title: 'Checkout redesign', purpose: 'Find friction in checkout', description: null, language: 'en' },
    question: {
      text: 'What was the hardest part of checkout?',
      type,
      config: { aiFollowup: { enabled: true }, ...config },
    },
    answerText: 'The shipping step was confusing',
    responseContext: {},
    thread: [],
    ...rest,
  }
}

describe('decideFollowup', () => {
  it('lets the model judge short text answers instead of forcing a canned probe', () => {
    const decision = decideFollowup(input({ answerText: 'Nothing' }))
    expect(decision).toMatchObject({ kind: 'ask', mustAsk: false, fallbackQuestion: null })
  })

  it('skips empty and already-detailed text answers', () => {
    expect(decideFollowup(input({ answerText: '   ' })).kind).toBe('skip')
    expect(decideFollowup(input({ answerText: 'word '.repeat(81) })).kind).toBe('skip')
  })

  it('requires a probe for NPS detractors, with a question-neutral fallback', () => {
    const decision = decideFollowup(input({ type: 'nps', responseContext: { value: 3 } }))
    expect(decision).toMatchObject({ kind: 'ask', mustAsk: true })
    if (decision.kind === 'ask') expect(decision.fallbackQuestion).toContain('3')
  })

  it('skips promoters unless the researcher set a probing focus', () => {
    expect(decideFollowup(input({ type: 'nps', responseContext: { value: 10 } })).kind).toBe('skip')
    const withFocus = decideFollowup(
      input({ type: 'nps', responseContext: { value: 10 }, config: { aiFollowup: { enabled: true, depthHint: 'What delights them' } } })
    )
    expect(withFocus).toMatchObject({ kind: 'ask', mustAsk: false })
  })

  it('reads opinion scale bounds from the saved config, including zero-based scales', () => {
    // 0..4 scale: 1 is 25% (low). The old client-sent 1..5 bounds made it 0%.
    const low = decideFollowup(input({ type: 'opinion_scale', responseContext: { value: 1 }, config: { scalePoints: 5, startAtZero: true } }))
    expect(low).toMatchObject({ kind: 'ask', mustAsk: true })
    const high = decideFollowup(input({ type: 'opinion_scale', responseContext: { value: 4 }, config: { scalePoints: 5, startAtZero: true } }))
    expect(high.kind).toBe('skip')
  })

  it('uses slider min and max from the saved config', () => {
    const decision = decideFollowup(input({ type: 'slider', responseContext: { value: 15 }, config: { minValue: 10, maxValue: 60 } }))
    expect(decision).toMatchObject({ kind: 'ask', mustAsk: true })
  })

  it('requires a probe when Other is picked under the when_other trigger, quoting their text', () => {
    const decision = decideFollowup(
      input({
        type: 'multiple_choice',
        answerText: 'Selected: Other',
        responseContext: { selectedOptionIds: [], isOtherSelected: true, otherText: 'A coupon bug' },
        config: { options: [{ id: 'a', label: 'Price' }], aiFollowup: { enabled: true, triggerCondition: 'when_other' } },
      })
    )
    expect(decision).toMatchObject({ kind: 'ask', mustAsk: true })
    if (decision.kind === 'ask') expect(decision.fallbackQuestion).toContain('A coupon bug')
  })

  it('takes trigger options from the saved config, not the request', () => {
    const config = {
      options: [{ id: 'a', label: 'Price' }, { id: 'b', label: 'Speed' }],
      aiFollowup: { enabled: true, triggerCondition: 'specific_options', triggerOptionIds: ['b'] },
    }
    expect(decideFollowup(input({ type: 'multiple_choice', responseContext: { selectedOptionIds: ['a'] }, config })).kind).toBe('skip')
    const hit = decideFollowup(input({ type: 'multiple_choice', responseContext: { selectedOptionIds: ['b'] }, config }))
    expect(hit).toMatchObject({ kind: 'ask', mustAsk: true })
    if (hit.kind === 'ask') expect(hit.signal).toContain('Speed')
  })

  it('judges the second probe on the reply to the first, never forcing it', () => {
    const decision = decideFollowup(
      input({ type: 'nps', responseContext: { value: 2 }, thread: [{ question: 'Why a 2?', answer: 'Slow' }] })
    )
    expect(decision).toMatchObject({ kind: 'ask', mustAsk: false })
    expect(decideFollowup(input({ thread: [{ question: 'Why?', answer: '' }] })).kind).toBe('skip')
  })
})

describe('buildUserMessage', () => {
  it('includes study goal, probing focus, the original answer and the earlier probe', () => {
    const message = buildUserMessage(
      input({
        config: { aiFollowup: { enabled: true, depthHint: 'Which form field' } },
        thread: [{ question: 'What was confusing about shipping?', answer: 'The address form' }],
      }),
      'Reply to the previous follow-up'
    )
    expect(message).toContain('Find friction in checkout')
    expect(message).toContain('Which form field')
    expect(message).toContain('The shipping step was confusing')
    expect(message).toContain('What was confusing about shipping?')
    expect(message).toContain('The address form')
  })

  it('strips HTML from the question text', () => {
    const message = buildUserMessage(input({ question: { text: '<p>How <b>easy</b> was it?</p>', type: 'nps', config: {} } }), 'x')
    expect(message).toContain('"How easy was it?"')
  })
})

describe('buildSystemPrompt', () => {
  it('only offers structured formats in adaptive mode', () => {
    expect(buildSystemPrompt('open', false)).not.toContain('"t":"mc"')
    expect(buildSystemPrompt('adaptive', false)).toContain('"t":"mc"')
  })

  it('tells the model it may not decline when a probe is required', () => {
    expect(buildSystemPrompt('open', true)).toContain('MUST')
    expect(buildSystemPrompt('open', false)).not.toContain('MUST')
  })
})

describe('parseFollowupResponse', () => {
  it('coerces structured follow-ups to text in open format', () => {
    const parsed = parseFollowupResponse('{"f":true,"q":"Why?","t":"mc","opts":["A","B"]}', 'open', [])
    expect(parsed).toMatchObject({ question: 'Why?', followupType: 'text', followupConfig: null })
  })

  it('keeps valid multiple choice in adaptive format and dedupes options', () => {
    const parsed = parseFollowupResponse('{"f":true,"q":"Which?","t":"mc","opts":["A","A","B",""]}', 'adaptive', [])
    expect(parsed?.followupType).toBe('multiple_choice')
    expect(parsed?.followupConfig?.options?.map((o) => o.label)).toEqual(['A', 'B'])
  })

  it('rejects a question cut off by the token limit', () => {
    expect(parseFollowupResponse('{"f":true,"q":"How did the uncertainty about shipping cost"}', 'open', [])).toBeNull()
    expect(parseFollowupResponse('{"f":true,"q":"¿Qué parte fue confusa?"}', 'open', [])?.question).toBe('¿Qué parte fue confusa?')
  })

  it('replaces em dashes in participant-facing questions', () => {
    const parsed = parseFollowupResponse('{"f":true,"q":"You rated 7 — what would make it a 9?"}', 'open', [])
    expect(parsed?.question).toBe('You rated 7, what would make it a 9?')
  })

  it('rejects declines, bad JSON, overlong questions and repeats', () => {
    expect(parseFollowupResponse('{"f":false}', 'open', [])).toBeNull()
    expect(parseFollowupResponse('not json', 'open', [])).toBeNull()
    expect(parseFollowupResponse(JSON.stringify({ f: true, q: 'x'.repeat(301) }), 'open', [])).toBeNull()
    expect(parseFollowupResponse('{"f":true,"q":"Why was it slow?"}', 'open', ['why was it slow'])).toBeNull()
  })
})

describe('generateFollowup', () => {
  it('returns the model question with its reason', async () => {
    const complete = vi.fn().mockResolvedValue({ content: '{"f":true,"q":"Which part of shipping?","r":"vague"}', model: 'mercury-2' })
    const result = await generateFollowup(input(), { complete })
    expect(result).toMatchObject({ question: 'Which part of shipping?', triggerReason: 'vague', modelUsed: 'mercury-2' })
    expect(complete).toHaveBeenCalledOnce()
  })

  it('does not call the model when the rules skip', async () => {
    const complete = vi.fn()
    expect(await generateFollowup(input({ answerText: '' }), { complete })).toBeNull()
    expect(complete).not.toHaveBeenCalled()
  })

  it('falls back to a template when a required probe hits a model error or quota', async () => {
    const onError = vi.fn()
    const failing = await generateFollowup(input({ type: 'nps', responseContext: { value: 1 } }), {
      complete: vi.fn().mockRejectedValue(new Error('down')),
      onError,
    })
    expect(failing).toMatchObject({ modelUsed: 'template', followupType: 'text' })
    expect(onError).toHaveBeenCalled()

    const quota = await generateFollowup(input({ type: 'nps', responseContext: { value: 1 } }), {
      complete: vi.fn().mockResolvedValue(null),
    })
    expect(quota?.modelUsed).toBe('template')
  })

  it('moves on without a probe when an optional probe fails', async () => {
    const result = await generateFollowup(input(), { complete: vi.fn().mockRejectedValue(new Error('down')) })
    expect(result).toBeNull()
  })

  it('uses the fallback when the model declines a required probe', async () => {
    const result = await generateFollowup(input({ type: 'nps', responseContext: { value: 0 } }), {
      complete: vi.fn().mockResolvedValue({ content: '{"f":false}', model: 'mercury-2' }),
    })
    expect(result?.modelUsed).toBe('template')
  })
})

describe('generateFollowup outcomes', () => {
  it('reports skipped, asked (model and template) and declined', async () => {
    const onOutcome = vi.fn()
    await generateFollowup(input({ answerText: '' }), { complete: vi.fn(), onOutcome })
    expect(onOutcome).toHaveBeenLastCalledWith({ kind: 'skipped', reason: 'Empty answer' })

    await generateFollowup(input(), { complete: vi.fn().mockResolvedValue({ content: '{"f":true,"q":"Which part?"}', model: 'gpt-5-mini' }), onOutcome })
    expect(onOutcome).toHaveBeenLastCalledWith({ kind: 'asked', model: 'gpt-5-mini', required: false })

    await generateFollowup(input({ type: 'nps', responseContext: { value: 1 } }), { complete: vi.fn().mockResolvedValue(null), onOutcome })
    expect(onOutcome).toHaveBeenLastCalledWith({ kind: 'asked', model: 'template', required: true })

    await generateFollowup(input(), { complete: vi.fn().mockResolvedValue({ content: '{"f":false}', model: 'mercury-2' }), onOutcome })
    expect(onOutcome).toHaveBeenLastCalledWith({ kind: 'declined', reason: 'answer_complete_or_invalid', model: 'mercury-2' })

    await generateFollowup(input(), { complete: vi.fn().mockRejectedValue(new Error('x')), onOutcome })
    expect(onOutcome).toHaveBeenLastCalledWith({ kind: 'declined', reason: 'model_error', model: null })
  })
})

describe('buildFollowupThread', () => {
  it('pairs stored probe wording with the replies from the player', () => {
    const result = buildFollowupThread(['Stored probe?'], 'original answer', [{ answer: 'reply' }])
    expect(result).toEqual({ thread: [{ question: 'Stored probe?', answer: 'reply' }], answerText: 'original answer' })
  })

  it('maps the legacy shape (probe reply sent as answer) onto the last probe', () => {
    const result = buildFollowupThread(['Stored probe?'], 'reply', undefined)
    expect(result.thread).toEqual([{ question: 'Stored probe?', answer: 'reply' }])
  })
})

describe('parseResponseContext', () => {
  it('accepts known fields and drops everything else', () => {
    expect(parseResponseContext('{"value":4,"evil":"x"}')).toEqual({ value: 4 })
    expect(parseResponseContext('{"selectedOptionIds":["a",3],"otherText":"hi"}')).toEqual({ selectedOptionIds: ['a'], otherText: 'hi' })
    expect(parseResponseContext('Yes')).toEqual({})
    expect(parseResponseContext('7')).toEqual({ value: 7 })
  })
})
