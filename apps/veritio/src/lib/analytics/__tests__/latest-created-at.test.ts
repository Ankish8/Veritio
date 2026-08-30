import { describe, it, expect } from 'vitest'
import { latestCreatedAt } from '../latest-created-at'

describe('latestCreatedAt', () => {
  it('returns the newest timestamp', () => {
    expect(
      latestCreatedAt([
        { created_at: '2026-01-02T00:00:00.000Z' },
        { created_at: '2026-01-03T00:00:00.000Z' },
        { created_at: '2026-01-01T00:00:00.000Z' },
      ])
    ).toBe('2026-01-03T00:00:00.000Z')
  })

  it('returns null for an empty set or rows without the column', () => {
    expect(latestCreatedAt([])).toBeNull()
    expect(latestCreatedAt([{ id: 'x' }])).toBeNull()
    expect(latestCreatedAt([{ created_at: null }])).toBeNull()
  })

  it('distinguishes sets that a row count alone cannot', () => {
    // The precomputed-metrics cache was accepted whenever the row count
    // matched, so deleting one attempt and adding another served stale metrics.
    const before = [
      { created_at: '2026-01-01T00:00:00.000Z' },
      { created_at: '2026-01-02T00:00:00.000Z' },
    ]
    const after = [
      { created_at: '2026-01-01T00:00:00.000Z' },
      { created_at: '2026-01-05T00:00:00.000Z' },
    ]
    expect(before.length).toBe(after.length)
    expect(latestCreatedAt(before)).not.toBe(latestCreatedAt(after))
  })
})
