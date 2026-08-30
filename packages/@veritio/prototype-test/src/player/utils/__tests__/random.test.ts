import { describe, it, expect, vi, afterEach } from 'vitest'
import { randomId, shuffle } from '../random'

afterEach(() => {
  vi.unstubAllGlobals()
})

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomId', () => {
  it('uses crypto.randomUUID when available', () => {
    const spy = vi.fn(() => '00000000-0000-4000-8000-000000000000')
    vi.stubGlobal('crypto', { ...globalThis.crypto, randomUUID: spy })
    expect(randomId()).toBe('00000000-0000-4000-8000-000000000000')
    expect(spy).toHaveBeenCalled()
  })

  it('still returns a valid v4 uuid outside a secure context', () => {
    // crypto.randomUUID is only exposed in secure contexts, so on a self-hosted
    // deployment served over plain HTTP the old direct call threw partway
    // through the study.
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    expect(randomId()).toMatch(UUID_V4)
  })

  it('falls back again when getRandomValues is missing too', () => {
    vi.stubGlobal('crypto', undefined)
    expect(randomId()).toMatch(UUID_V4)
  })

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomId()))
    expect(ids.size).toBe(500)
  })
})

describe('shuffle', () => {
  it('returns a new array and leaves the input untouched', () => {
    const input = Object.freeze(['a', 'b', 'c']) as unknown as string[]
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect([...out].sort()).toEqual(['a', 'b', 'c'])
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('is unbiased across positions', () => {
    // `sort(() => Math.random() - 0.5)`, which this replaced, leaves elements
    // near their starting index far more often than chance.
    const items = ['a', 'b', 'c', 'd', 'e']
    const counts = new Map(items.map((i) => [i, new Array(items.length).fill(0)]))

    const RUNS = 12_000
    for (let n = 0; n < RUNS; n++) {
      shuffle(items).forEach((item, index) => {
        counts.get(item)![index]++
      })
    }

    const expected = RUNS / items.length
    for (const positions of counts.values()) {
      for (const count of positions) {
        // Within 20% of uniform. A biased shuffle misses this badly.
        expect(Math.abs(count - expected) / expected).toBeLessThan(0.2)
      }
    }
  })

  it('handles empty and single-element inputs', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['only'])).toEqual(['only'])
  })
})
