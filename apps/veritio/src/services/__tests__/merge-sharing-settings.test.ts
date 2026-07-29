/**
 * mergeSharingSettings Tests
 *
 * Regression cover for the wipe bug: clients write sharing_settings by sending
 * the whole object back from a store they hydrated earlier, so a caller that
 * never loaded a sibling key used to erase it. Public-results tokens, passwords
 * and expiry live under `publicResults`, so that erasure silently unshared
 * reports.
 */

import { describe, it, expect, vi } from 'vitest'
import { mergeSharingSettings } from '../study-service'

type StoredSharingSettings = Record<string, unknown> | null

/** Minimal stand-in for the one `select().eq().single()` chain the helper uses. */
function supabaseWithStored(stored: StoredSharingSettings) {
  const single = vi.fn().mockResolvedValue({ data: { sharing_settings: stored }, error: null })
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
  } as never
}

const STUDY_ID = '5776c6e9-ad57-4209-8c16-c7978e891e09'

const PUBLIC_RESULTS = {
  enabled: true,
  passwordHash: '$2a$10$hash',
  expiresAt: '2026-12-31T23:59:59Z',
  sharedMetrics: { overview: true, participants: true, analysis: true, questionnaire: false },
}

describe('mergeSharingSettings', () => {
  it('preserves keys the caller never loaded', async () => {
    // The builder hydrating without sharing_settings sends {} back
    const merged = await mergeSharingSettings(
      supabaseWithStored({ publicResults: PUBLIC_RESULTS, autoAddToPanel: true }),
      STUDY_ID,
      {}
    )

    expect(merged).toEqual({ publicResults: PUBLIC_RESULTS, autoAddToPanel: true })
  })

  it('keeps publicResults when a caller only writes redirects', async () => {
    const redirects = { completionUrl: 'https://example.com/done' }

    const merged = await mergeSharingSettings(
      supabaseWithStored({ publicResults: PUBLIC_RESULTS }),
      STUDY_ID,
      { redirects }
    )

    expect(merged).toEqual({ publicResults: PUBLIC_RESULTS, redirects })
  })

  it('replaces a provided subtree wholesale so intra-subtree deletes still work', async () => {
    // Clearing the expiry means sending publicResults without expiresAt
    const withoutExpiry = { ...PUBLIC_RESULTS, expiresAt: undefined }

    const merged = await mergeSharingSettings(
      supabaseWithStored({ publicResults: PUBLIC_RESULTS }),
      STUDY_ID,
      { publicResults: withoutExpiry }
    )

    expect((merged.publicResults as Record<string, unknown>).expiresAt).toBeUndefined()
    expect((merged.publicResults as Record<string, unknown>).passwordHash).toBe('$2a$10$hash')
  })

  it('deletes a key on an explicit null', async () => {
    const merged = await mergeSharingSettings(
      supabaseWithStored({ publicResults: PUBLIC_RESULTS, autoAddToPanel: true }),
      STUDY_ID,
      { autoAddToPanel: null }
    )

    expect(merged).toEqual({ publicResults: PUBLIC_RESULTS })
    expect('autoAddToPanel' in merged).toBe(false)
  })

  it('ignores undefined values rather than writing them', async () => {
    const merged = await mergeSharingSettings(
      supabaseWithStored({ autoAddToPanel: true }),
      STUDY_ID,
      { autoAddToPanel: undefined }
    )

    expect(merged).toEqual({ autoAddToPanel: true })
  })

  it('treats a null column as an empty object', async () => {
    const redirects = { screenoutUrl: 'https://example.com/no' }

    const merged = await mergeSharingSettings(supabaseWithStored(null), STUDY_ID, { redirects })

    expect(merged).toEqual({ redirects })
  })

  it('does not mutate the stored object', async () => {
    const stored = { publicResults: PUBLIC_RESULTS }

    await mergeSharingSettings(supabaseWithStored(stored), STUDY_ID, {
      publicResults: { enabled: false, sharedMetrics: {} },
    })

    expect(stored.publicResults).toBe(PUBLIC_RESULTS)
  })
})
