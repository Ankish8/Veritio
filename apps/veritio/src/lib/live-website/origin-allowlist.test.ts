import { describe, expect, it } from 'vitest'
import {
  collectStudyOrigins,
  isOriginAllowedForStudy,
} from './origin-allowlist'

describe('collectStudyOrigins', () => {
  it('reduces full URLs with paths down to origins', () => {
    const origins = collectStudyOrigins({
      websiteUrl: 'https://myoperator.com/pricing',
      taskUrls: ['https://myoperator.com/pricing-v2'],
    })
    expect([...origins]).toEqual(['https://myoperator.com'])
  })

  // Mirrors real production data: one active study spans four hosts across its
  // A/B variants, so the allowlist has to be a union rather than one column.
  it('unions every source column', () => {
    const origins = collectStudyOrigins({
      websiteUrl: 'https://voicebot-v1.vercel.app/',
      taskUrls: ['https://voicebot-v2-beta.vercel.app/bots/mmd7kddf'],
      variantUrls: ['https://voicebot-v3.vercel.app/', 'https://scribe.com/'],
      taskVariantUrls: ['https://www.saucedemo.com/?flow=express'],
    })
    expect([...origins].sort()).toEqual([
      'https://scribe.com',
      'https://voicebot-v1.vercel.app',
      'https://voicebot-v2-beta.vercel.app',
      'https://voicebot-v3.vercel.app',
      'https://www.saucedemo.com',
    ])
  })

  // One active study has settings.websiteUrl = null and relies on task URLs.
  it('handles a null websiteUrl by falling back to other columns', () => {
    const origins = collectStudyOrigins({
      websiteUrl: null,
      taskUrls: ['https://example.com/a', null, undefined, ''],
    })
    expect([...origins]).toEqual(['https://example.com'])
  })

  it('skips unparseable values rather than throwing', () => {
    const origins = collectStudyOrigins({
      websiteUrl: 'not a url',
      taskUrls: ['also not a url', 'https://ok.com/x'],
    })
    expect([...origins]).toEqual(['https://ok.com'])
  })

  it('returns an empty set when nothing is configured', () => {
    expect(collectStudyOrigins({}).size).toBe(0)
    expect(collectStudyOrigins({ websiteUrl: null, taskUrls: [] }).size).toBe(0)
  })
})

describe('isOriginAllowedForStudy', () => {
  const allowed = new Set(['https://bbc.com', 'https://voicebot-v1.vercel.app'])

  it('allows an exact origin match', () => {
    expect(isOriginAllowedForStudy('https://bbc.com', allowed)).toBe(true)
    expect(
      isOriginAllowedForStudy('https://voicebot-v1.vercel.app', allowed),
    ).toBe(true)
  })

  // Required: the proxy re-encodes an apex -> www redirect with the www origin,
  // so exact matching would make the worker reject its own rewritten URL.
  it('allows the www counterpart of a configured apex origin', () => {
    expect(isOriginAllowedForStudy('https://www.bbc.com', allowed)).toBe(true)
  })

  it('allows the apex counterpart of a configured www origin', () => {
    expect(
      isOriginAllowedForStudy('https://tango.ai', new Set(['https://www.tango.ai'])),
    ).toBe(true)
  })

  it('rejects an unrelated origin', () => {
    expect(isOriginAllowedForStudy('https://en.wikipedia.org', allowed)).toBe(
      false,
    )
    expect(isOriginAllowedForStudy('https://evil.com', allowed)).toBe(false)
  })

  it('rejects a non-www subdomain and a suffix-confusion host', () => {
    expect(isOriginAllowedForStudy('https://news.bbc.com', allowed)).toBe(false)
    expect(isOriginAllowedForStudy('https://bbc.com.evil.com', allowed)).toBe(
      false,
    )
  })

  it('ignores the path when comparing', () => {
    expect(isOriginAllowedForStudy('https://bbc.com/news?a=1', allowed)).toBe(
      true,
    )
  })

  it('rejects a scheme downgrade', () => {
    expect(isOriginAllowedForStudy('http://bbc.com', allowed)).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(isOriginAllowedForStudy('not a url', allowed)).toBe(false)
    expect(isOriginAllowedForStudy('', allowed)).toBe(false)
  })

  // A study with nothing configured must not be treated as an attack.
  it('allows anything when no origins are configured', () => {
    expect(isOriginAllowedForStudy('https://anything.com', new Set())).toBe(true)
    expect(isOriginAllowedForStudy('https://anything.com', [])).toBe(true)
  })

  it('accepts an array as well as a Set', () => {
    expect(isOriginAllowedForStudy('https://bbc.com', ['https://bbc.com'])).toBe(
      true,
    )
  })
})
