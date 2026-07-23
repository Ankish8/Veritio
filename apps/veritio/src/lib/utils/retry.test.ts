import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throwOnServerError, withRetry } from './retry'

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('times out a hung attempt and retries it', async () => {
    let firstAttemptWasAborted = false
    const operation = vi
      .fn()
      .mockImplementationOnce(
        (signal?: AbortSignal) =>
          new Promise((_, reject) => {
            signal?.addEventListener('abort', () => {
              firstAttemptWasAborted = true
              reject(new DOMException('Aborted', 'AbortError'))
            })
          })
      )
      .mockResolvedValueOnce('saved')

    const resultPromise = withRetry(operation, {
      maxAttempts: 2,
      timeoutMs: 1_000,
      initialDelayMs: 100,
      maxDelayMs: 100,
    })
    await vi.advanceTimersByTimeAsync(1_250)

    await expect(resultPromise).resolves.toBe('saved')
    expect(operation).toHaveBeenCalledTimes(2)
    expect(firstAttemptWasAborted).toBe(true)
  })

  it('turns rate limits into retryable errors', () => {
    expect(() => throwOnServerError(new Response(null, { status: 429 }))).toThrow('status 429')
  })
})
