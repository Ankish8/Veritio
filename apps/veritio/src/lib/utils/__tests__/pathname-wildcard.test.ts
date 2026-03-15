import { describe, it, expect } from 'vitest'
import {
  autoDetectWildcardSegments,
  extractQueryParams,
  autoDetectWildcardParams,
  applyWildcards,
  pathnameMatchesWithWildcards,
} from '../pathname-wildcard'

describe('autoDetectWildcardSegments', () => {
  it('detects long numeric segments', () => {
    expect(autoDetectWildcardSegments('/bot/1772187702787')).toEqual([2])
  })

  it('detects multiple numeric IDs', () => {
    expect(autoDetectWildcardSegments('/org/123456789/bot/987654321')).toEqual([2, 4])
  })

  it('ignores short numbers', () => {
    expect(autoDetectWildcardSegments('/page/2')).toEqual([])
    expect(autoDetectWildcardSegments('/step/42')).toEqual([])
  })

  it('ignores non-numeric segments', () => {
    expect(autoDetectWildcardSegments('/bot/settings')).toEqual([])
  })

  it('handles root path', () => {
    expect(autoDetectWildcardSegments('/')).toEqual([])
  })

  it('strips query string before segmenting', () => {
    expect(autoDetectWildcardSegments('/bot/1772187702787?name=sara&type=voicebot')).toEqual([2])
  })
})

describe('extractQueryParams', () => {
  it('returns empty array for no query string', () => {
    expect(extractQueryParams('/bot/123')).toEqual([])
  })

  it('parses single param', () => {
    expect(extractQueryParams('/bot/123?name=sara')).toEqual([
      { key: 'name', value: 'sara' },
    ])
  })

  it('parses multiple params', () => {
    expect(extractQueryParams('/bot/123?name=sara&type=voicebot')).toEqual([
      { key: 'name', value: 'sara' },
      { key: 'type', value: 'voicebot' },
    ])
  })

  it('handles params with no value', () => {
    expect(extractQueryParams('/bot/123?debug')).toEqual([
      { key: 'debug', value: '' },
    ])
  })

  it('decodes URL-encoded values', () => {
    expect(extractQueryParams('/search?q=hello%20world')).toEqual([
      { key: 'q', value: 'hello world' },
    ])
  })

  it('strips hash before parsing', () => {
    expect(extractQueryParams('/bot/123?name=sara#section')).toEqual([
      { key: 'name', value: 'sara' },
    ])
  })
})

describe('autoDetectWildcardParams', () => {
  it('returns all param keys', () => {
    expect(autoDetectWildcardParams('/bot/123?name=sara&type=voicebot')).toEqual(['name', 'type'])
  })

  it('returns empty for no query string', () => {
    expect(autoDetectWildcardParams('/bot/123')).toEqual([])
  })
})

describe('applyWildcards', () => {
  it('replaces wildcarded segments with *', () => {
    expect(applyWildcards('/bot/1772187702787', [2])).toBe('/bot/*')
  })

  it('preserves query string when no wildcardParams', () => {
    expect(applyWildcards('/bot/1772187702787?name=sara', [2])).toBe('/bot/*?name=sara')
  })

  it('returns original when no wildcards', () => {
    expect(applyWildcards('/bot/settings', [])).toBe('/bot/settings')
  })

  it('replaces wildcarded param values with *', () => {
    expect(applyWildcards('/bot/1772187702787?name=sara&type=voicebot', [2], ['name'])).toBe(
      '/bot/*?name=*&type=voicebot'
    )
  })

  it('replaces all param values when all wildcarded', () => {
    expect(applyWildcards('/bot/123?name=sara&type=voicebot', [], ['name', 'type'])).toBe(
      '/bot/123?name=*&type=*'
    )
  })

  it('keeps all param values exact when empty wildcardParams', () => {
    expect(applyWildcards('/bot/123?name=sara&type=voicebot', [], [])).toBe(
      '/bot/123?name=sara&type=voicebot'
    )
  })

  it('handles no query string with wildcardParams provided', () => {
    expect(applyWildcards('/bot/123', [2], [])).toBe('/bot/*')
  })
})

describe('pathnameMatchesWithWildcards', () => {
  it('exact match always passes', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/123?name=sara&type=voicebot',
      '/bot/123?name=sara&type=voicebot',
      []
    )).toBe(true)
  })

  it('wildcard segment matches any value', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=sara&type=voicebot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2]
    )).toBe(true)
  })

  it('non-wildcarded segment must match exactly', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=sara&type=voicebot',
      '/widget/1772187702787?name=sara&type=voicebot',
      [2]
    )).toBe(false)
  })

  it('undefined wildcardParams ignores all query params (backward compat)', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=different&type=chatbot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      undefined
    )).toBe(true)
  })

  it('undefined wildcardParams ignores missing query params', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      undefined
    )).toBe(true)
  })

  it('all params wildcarded matches any param values', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=different&type=chatbot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      ['name', 'type']
    )).toBe(true)
  })

  it('non-wildcarded param must match exactly', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=different&type=voicebot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      ['type'] // only type is wildcarded, name must match
    )).toBe(false)
  })

  it('non-wildcarded param matches when value is same', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=sara&type=chatbot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      ['type'] // type wildcarded, name must match
    )).toBe(true)
  })

  it('empty wildcardParams requires all params to match exactly', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=sara&type=voicebot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      []
    )).toBe(true)

    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=different&type=voicebot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      []
    )).toBe(false)
  })

  it('missing required param in actual fails', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?type=voicebot',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      ['type'] // type wildcarded, name must match — but name is missing in actual
    )).toBe(false)
  })

  it('extra params in actual URL are ignored', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/9999999999?name=sara&type=voicebot&extra=yes',
      '/bot/1772187702787?name=sara&type=voicebot',
      [2],
      ['name'] // name wildcarded, type must match
    )).toBe(true)
  })

  it('different segment count does not match', () => {
    expect(pathnameMatchesWithWildcards(
      '/bot/123/extra',
      '/bot/123',
      []
    )).toBe(false)
  })
})
