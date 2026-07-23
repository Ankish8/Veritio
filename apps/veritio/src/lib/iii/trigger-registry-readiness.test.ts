import { describe, expect, it, vi } from 'vitest'
import { waitForTriggerRegistryReadiness } from './trigger-registry-readiness'

function createClock() {
  let time = 0

  return {
    now: () => time,
    sleep: vi.fn(async (ms: number) => {
      time += ms
    }),
  }
}

describe('waitForTriggerRegistryReadiness', () => {
  it('returns immediately when every trigger is already active', async () => {
    const clock = createClock()
    const readRegisteredCount = vi.fn(async () => 434)

    const result = await waitForTriggerRegistryReadiness({
      expected: 434,
      readRegisteredCount,
      now: clock.now,
      sleep: clock.sleep,
    })

    expect(result).toEqual({
      status: 'ready',
      attempts: 1,
      registered: 434,
      elapsedMs: 0,
    })
    expect(clock.sleep).not.toHaveBeenCalled()
  })

  it('waits for independently-starting workers instead of failing on a partial registry', async () => {
    const clock = createClock()
    const readRegisteredCount = vi
      .fn<[], Promise<number>>()
      .mockResolvedValueOnce(384)
      .mockResolvedValueOnce(384)
      .mockResolvedValueOnce(434)

    const result = await waitForTriggerRegistryReadiness({
      expected: 434,
      readRegisteredCount,
      timeoutMs: 10_000,
      pollIntervalMs: 1_000,
      now: clock.now,
      sleep: clock.sleep,
    })

    expect(result).toEqual({
      status: 'ready',
      attempts: 3,
      registered: 434,
      elapsedMs: 2_000,
    })
    expect(clock.sleep).toHaveBeenCalledTimes(2)
  })

  it('retries transient registry read errors during engine startup', async () => {
    const clock = createClock()
    const readRegisteredCount = vi
      .fn<[], Promise<number>>()
      .mockRejectedValueOnce(new Error('engine registry unavailable'))
      .mockResolvedValueOnce(434)

    const result = await waitForTriggerRegistryReadiness({
      expected: 434,
      readRegisteredCount,
      timeoutMs: 5_000,
      pollIntervalMs: 500,
      now: clock.now,
      sleep: clock.sleep,
    })

    expect(result.status).toBe('ready')
    expect(result.attempts).toBe(2)
  })

  it('reports a persistent mismatch only after the readiness deadline', async () => {
    const clock = createClock()
    const onPending = vi.fn()

    const result = await waitForTriggerRegistryReadiness({
      expected: 434,
      readRegisteredCount: async () => 384,
      timeoutMs: 2_500,
      pollIntervalMs: 1_000,
      now: clock.now,
      sleep: clock.sleep,
      onPending,
    })

    expect(result).toEqual({
      status: 'mismatch',
      attempts: 4,
      registered: 384,
      elapsedMs: 2_500,
    })
    expect(clock.sleep).toHaveBeenNthCalledWith(3, 500)
    expect(onPending).toHaveBeenCalledTimes(4)
  })

  it('distinguishes an unreadable registry from a verified mismatch', async () => {
    const clock = createClock()

    const result = await waitForTriggerRegistryReadiness({
      expected: 434,
      readRegisteredCount: async () => {
        throw new Error('registry unavailable')
      },
      timeoutMs: 1_000,
      pollIntervalMs: 1_000,
      now: clock.now,
      sleep: clock.sleep,
    })

    expect(result).toEqual({
      status: 'unavailable',
      attempts: 2,
      registered: null,
      elapsedMs: 1_000,
      error: 'registry unavailable',
    })
  })
})
