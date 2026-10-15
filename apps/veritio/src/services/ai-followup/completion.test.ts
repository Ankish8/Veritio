import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createChatCompletion: vi.fn(), consumeQuota: vi.fn() }))
vi.mock('../assistant/openai', () => ({ createChatCompletion: mocks.createChatCompletion }))
vi.mock('../ai-followup-quota', () => ({ consumeAiFollowupQuota: mocks.consumeQuota }))

import { createFollowupCompletion } from './completion'

const scope = { organizationId: 'o', studyId: 's', participantId: 'p' }
const logger = { warn: vi.fn() }
const messages = [{ role: 'user' as const, content: 'hi' }]

describe('createFollowupCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeQuota.mockResolvedValue(true)
  })

  it('calls Mercury and never another provider', async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({ content: '{"f":false}' })
    expect(await createFollowupCompletion(scope, messages, 400, logger)).toEqual({ content: '{"f":false}', model: 'mercury-2' })
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(1)
    expect(mocks.createChatCompletion.mock.calls[0][1]).not.toHaveProperty('provider')
  })

  it('lets a Mercury failure surface instead of falling back to OpenAI', async () => {
    mocks.createChatCompletion.mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
    await expect(createFollowupCompletion(scope, messages, 400, logger)).rejects.toThrow('rate limited')
    expect(mocks.createChatCompletion).toHaveBeenCalledTimes(1)
  })

  it('makes no model call when the quota is spent', async () => {
    mocks.consumeQuota.mockResolvedValue(false)
    expect(await createFollowupCompletion(scope, messages, 400, logger)).toBeNull()
    expect(mocks.createChatCompletion).not.toHaveBeenCalled()
  })
})
