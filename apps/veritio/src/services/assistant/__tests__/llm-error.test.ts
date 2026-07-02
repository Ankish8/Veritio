import { describe, it, expect } from 'vitest'
import { classifyLlmError } from '../llm-error'

/** Mimics an OpenAI SDK APIError, which carries a numeric `status`. */
function apiError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

describe('classifyLlmError', () => {
  it('says "not set up" when no key is configured anywhere', () => {
    const msg = classifyLlmError(new Error('boom'), { usingUserKey: false, hasPlatformKey: false })
    expect(msg).toMatch(/isn't set up yet/i)
    expect(msg).toMatch(/Settings > AI Models/)
  })

  it('handles the "API key is not set" env error', () => {
    const msg = classifyLlmError(new Error('OPENAI_API_KEY is not set'), { hasPlatformKey: true })
    expect(msg).toMatch(/isn't set up yet/i)
  })

  it('classifies a 401 on the platform key as unavailable + self-serve hint', () => {
    const msg = classifyLlmError(
      apiError(401, '401 Incorrect API key provided: sk-proj-abc123. You can find your API key at https://platform.openai.com/account/api-keys'),
      { usingUserKey: false, hasPlatformKey: true },
    )
    expect(msg).toMatch(/unavailable/i)
    expect(msg).toMatch(/Settings > AI Models/)
    // Never leak the raw key fragment or provider URL.
    expect(msg).not.toContain('sk-proj')
    expect(msg).not.toContain('platform.openai.com')
  })

  it('classifies a 401 on the user key as "check your key"', () => {
    const msg = classifyLlmError(apiError(401, 'invalid_api_key'), { usingUserKey: true, hasPlatformKey: true })
    expect(msg).toMatch(/rejected the API key/i)
    expect(msg).toMatch(/Double-check/i)
  })

  it('classifies a 404 as model-not-available', () => {
    const msg = classifyLlmError(apiError(404, 'The model `gpt-foo` does not exist'), { hasPlatformKey: true })
    expect(msg).toMatch(/model isn't available/i)
  })

  it('classifies a 429 quota error for a user key', () => {
    const msg = classifyLlmError(apiError(429, 'You exceeded your current quota'), { usingUserKey: true })
    expect(msg).toMatch(/rate limit or quota/i)
  })

  it('classifies timeouts as retryable', () => {
    const msg = classifyLlmError(new Error('OpenAI stream timed out after 60s'), { hasPlatformKey: true })
    expect(msg).toMatch(/took too long/i)
  })

  it('falls back to a generic retry message for unknown errors', () => {
    const msg = classifyLlmError(apiError(418, "I'm a teapot"), { hasPlatformKey: true })
    expect(msg).toMatch(/Failed to get an AI response/i)
  })
})
