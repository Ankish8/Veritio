import { describe, expect, it } from 'vitest'
import { applyReasoningPolicy } from './openai'

function build(model: string, requested?: Parameters<typeof applyReasoningPolicy>[2], hasTools = false, temperature?: number) {
  const params: Record<string, unknown> = { model }
  if (temperature !== undefined) params.temperature = temperature
  applyReasoningPolicy(params, model, requested, hasTools)
  return params
}

describe('applyReasoningPolicy', () => {
  it('defaults GPT-6 requests to low reasoning', () => {
    expect(build('gpt-6-luna')).toMatchObject({ reasoning_effort: 'low' })
  })

  it('keeps an explicit effort and maps "minimal" to "low"', () => {
    expect(build('gpt-6-luna', 'high')).toMatchObject({ reasoning_effort: 'high' })
    expect(build('gpt-6-luna', 'minimal')).toMatchObject({ reasoning_effort: 'low' })
  })

  it('sends "none" with tools, the only effort Chat Completions allows for GPT-6 tool calls', () => {
    expect(build('gpt-6-luna', 'low', true, 0.2)).toEqual({ model: 'gpt-6-luna', reasoning_effort: 'none', temperature: 0.2 })
  })

  it('drops temperature whenever GPT-6 reasoning is on', () => {
    expect(build('gpt-6-luna', undefined, false, 0)).not.toHaveProperty('temperature')
  })

  it('gives short mercury-2.5 calls minimal reasoning so the budget is not spent on thinking', () => {
    const short: Record<string, unknown> = { max_completion_tokens: 500 }
    applyReasoningPolicy(short, 'mercury-2.5', undefined, false)
    expect(short.reasoning_effort).toBe('minimal')

    const long: Record<string, unknown> = { max_completion_tokens: 4096 }
    applyReasoningPolicy(long, 'mercury-2.5', undefined, false)
    expect(long).not.toHaveProperty('reasoning_effort')

    const chosen: Record<string, unknown> = { max_completion_tokens: 500 }
    applyReasoningPolicy(chosen, 'mercury-2.5', 'low', false)
    expect(chosen.reasoning_effort).toBe('low')
  })

  it('leaves other models untouched', () => {
    expect(build('mercury-2', 'medium', false, 0)).toEqual({ model: 'mercury-2', reasoning_effort: 'medium', temperature: 0 })
    expect(build('gpt-5-mini')).toEqual({ model: 'gpt-5-mini' })
  })
})
