import { describe, expect, it } from 'vitest'
import {
  createLiveWebsiteSnippetId,
  ensureLiveWebsiteSnippetId,
  hasValidLiveWebsiteTrackingConfiguration,
  isCompanionTrackingMode,
  isValidLiveWebsiteSnippetId,
} from './snippet-id'

describe('live website snippet ID invariant', () => {
  it('recognizes companion tracking modes', () => {
    expect(isCompanionTrackingMode('reverse_proxy')).toBe(true)
    expect(isCompanionTrackingMode('snippet')).toBe(true)
    expect(isCompanionTrackingMode('url_only')).toBe(false)
  })

  it('accepts only route-safe snippet IDs', () => {
    expect(isValidLiveWebsiteSnippetId('abc12345-def')).toBe(true)
    expect(isValidLiveWebsiteSnippetId('abc_DEF-123')).toBe(true)
    expect(isValidLiveWebsiteSnippetId('')).toBe(false)
    expect(isValidLiveWebsiteSnippetId(null)).toBe(false)
    expect(isValidLiveWebsiteSnippetId('contains/slash')).toBe(false)
  })

  it('creates the established 12-character ID format', () => {
    expect(createLiveWebsiteSnippetId(() => '12345678-abcd-4000-8000-123456789abc')).toBe('12345678-abc')
  })

  it.each(['reverse_proxy', 'snippet'] as const)('repairs missing IDs for %s mode', (mode) => {
    const repaired = ensureLiveWebsiteSnippetId(
      { mode, snippetId: null, websiteUrl: 'https://example.com' },
      () => 'fixed-id-123'
    )

    expect(repaired).toEqual({
      mode,
      snippetId: 'fixed-id-123',
      websiteUrl: 'https://example.com',
    })
  })

  it('preserves valid IDs and Observer Mode settings', () => {
    const valid = { mode: 'reverse_proxy', snippetId: 'existing-id' }
    const observer = { mode: 'url_only', snippetId: null }

    expect(ensureLiveWebsiteSnippetId(valid)).toBe(valid)
    expect(ensureLiveWebsiteSnippetId(observer)).toBe(observer)
  })

  it('reports invalid companion configurations', () => {
    expect(
      hasValidLiveWebsiteTrackingConfiguration({
        mode: 'reverse_proxy',
        snippetId: null,
      })
    ).toBe(false)
    expect(
      hasValidLiveWebsiteTrackingConfiguration({
        mode: 'snippet',
        snippetId: 'installed-id',
      })
    ).toBe(true)
    expect(
      hasValidLiveWebsiteTrackingConfiguration({
        mode: 'url_only',
        snippetId: null,
      })
    ).toBe(true)
  })
})
