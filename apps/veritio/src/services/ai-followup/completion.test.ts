import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createChatCompletion: vi.fn(), consumeQuota: vi.fn() }))
vi.mock('../assistant/openai', () => ({ createChatCompletion: mocks.createChatCompletion }))
vi.mock('../ai-followup-quota', () => ({ consumeAiFollowupQuota: mocks.consumeQuota }))

import { createFollowupCompletion, isRetryable } from './completion'

const scope = { organizationId: 'o', studyId: 's', participantId: 'p' }
const logger = { warn: vi.fn() }
const messages = [{ role: 'user' as const, content: 'hi' }]

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status })
}

describe('createFollowupCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeQuota.mockResolvedValue(true)
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('uses Mercury when it answers', async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({ content: '{"f":false}' })
    expect(await createFollowupCompletion(scope, messages, 400, logger)).toEqual({ content: '{"f":false}', model: 'mercury-2' })
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(1)
  })

  it('falls back to OpenAI on a Mercury rate limit, without temperature', async () => {
    mocks.createChatCompletion.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce({ content: '{"f":false}' })
    expect(await createFollowupCompletion(scope, messages, 400, logger)).toEqual({ content: '{"f":false}', model: 'gpt-5-mini' })
    const fallbackOptions = mocks.createChatCompletion.mock.calls[1][1]
    expect(fallbackOptions).toMatchObject({ provider: 'openai' })
    expect(fallbackOptions).not.toHaveProperty('temperature')
  })

  it('does not retry a content-filter 400', async () => {
    mocks.createChatCompletion.mockRejectedValueOnce(httpError(400))
    await expect(createFollowupCompletion(scope, messages, 400, logger)).rejects.toThrow('HTTP 400')
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(1)
  })

  it('does not fall back when no OpenAI key is configured', async () => {
    delete process.env.OPENAI_API_KEY
    mocks.createChatCompletion.mockRejectedValueOnce(httpError(503))
    await expect(createFollowupCompletion(scope, messages, 400, logger)).rejects.toThrow('HTTP 503')
  })

  it('makes no model call when the quota is spent', async () => {
    mocks.consumeQuota.mockResolvedValue(false)
    expect(await createFollowupCompletion(scope, messages, 400, logger)).toBeNull()
    expect(mocks.createChatCompletion).not.toHaveBeenCalled()
  })
})

describe('isRetryable', () => {
  it('retries rate limits, server errors and network failures only', () => {
    expect(isRetryable(httpError(429))).toBe(true)
    expect(isRetryable(httpError(502))).toBe(true)
    expect(isRetryable(new Error('timeout'))).toBe(true)
    expect(isRetryable(httpError(400))).toBe(false)
    expect(isRetryable(httpError(401))).toBe(false)
  })
})
