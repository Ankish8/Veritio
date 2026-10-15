import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), constructed: [] as Array<{ apiKey?: string; baseURL?: string }> }))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.create } }
    constructor(options: { apiKey?: string; baseURL?: string }) {
      mocks.constructed.push(options)
    }
  },
}))

import { createChatCompletion, describeKeySource } from './openai'
import { hasOwnOpenAiKey, OpenAiKeyRequiredError, openAiKeyRequiredResponse } from './byok'
import { classifyLlmError } from './llm-error'
import type { UserAiOverrides } from '../user-ai-config-service'

const adminWithOpenAiKey = { openai_api_key: 'sk-platform', openai_model: 'gpt-6-luna', openai_base_url: null } as never

function overrides(apiKey: string | null, model: string | null = null): UserAiOverrides {
  return {
    openai: { apiKey, baseUrl: null, model },
    mercury: { apiKey: null, baseUrl: null, model: null },
    useSameProvider: false,
  }
}

describe('OpenAI is bring-your-own-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructed.length = 0
    process.env.OPENAI_API_KEY = 'sk-env-platform'
    mocks.create.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })
  })

  it('refuses OpenAI calls without the user key, even when admin and env keys exist', async () => {
    await expect(
      createChatCompletion([{ role: 'user', content: 'hi' }], { provider: 'openai', adminConfig: adminWithOpenAiKey })
    ).rejects.toBeInstanceOf(OpenAiKeyRequiredError)
    await expect(
      createChatCompletion([{ role: 'user', content: 'hi' }], { provider: 'openai', userOverrides: overrides('   ') })
    ).rejects.toBeInstanceOf(OpenAiKeyRequiredError)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("uses the user's own key and model", async () => {
    await createChatCompletion([{ role: 'user', content: 'hi' }], {
      provider: 'openai',
      userOverrides: overrides('sk-user-own', 'gpt-6-sol'),
      adminConfig: adminWithOpenAiKey,
    })
    expect(mocks.constructed.at(-1)).toMatchObject({ apiKey: 'sk-user-own' })
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ model: 'gpt-6-sol' })
  })

  it('falls back to the admin default model, never the admin key', async () => {
    await createChatCompletion([{ role: 'user', content: 'hi' }], {
      provider: 'openai',
      userOverrides: overrides('sk-user-own'),
      adminConfig: { openai_api_key: 'sk-platform', openai_model: 'gpt-6-sol', openai_base_url: null } as never,
    })
    expect(mocks.constructed.at(-1)).toMatchObject({ apiKey: 'sk-user-own' })
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ model: 'gpt-6-sol' })
  })

  it('defaults the model to gpt-6-luna when the user picked none', async () => {
    await createChatCompletion([{ role: 'user', content: 'hi' }], { provider: 'openai', userOverrides: overrides('sk-user-own') })
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ model: 'gpt-6-luna', reasoning_effort: 'low' })
  })

  it('reports no platform OpenAI key to error messages', () => {
    expect(describeKeySource('openai', undefined, adminWithOpenAiKey)).toEqual({ usingUserKey: false, hasPlatformKey: false })
  })

  it('gives endpoints and errors one clear message and code', () => {
    expect(hasOwnOpenAiKey(overrides('sk-x'))).toBe(true)
    expect(hasOwnOpenAiKey(null)).toBe(false)
    expect(openAiKeyRequiredResponse()).toMatchObject({ status: 403, body: { code: 'openai_key_required' } })
    expect(classifyLlmError(new OpenAiKeyRequiredError())).toContain('Settings > AI Models')
  })
})
