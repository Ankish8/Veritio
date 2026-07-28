import { describe, expect, it } from 'vitest'
import {
  isWwwVariantOrigin,
  parseAbsoluteUrl,
  rewriteProxyUrl,
} from './proxy-url-rewrite'

const STUDY = 'study-1'
const SNIPPET = 'snip-1'
const PROXY = 'https://proxy.example.com'

const apex = 'https://bbc.com'
const apexB64 = btoa(apex)
const wwwB64 = btoa('https://www.bbc.com')

function rewrite(url: string, targetOrigin = apex, base64Origin = apexB64) {
  return rewriteProxyUrl(url, targetOrigin, STUDY, SNIPPET, base64Origin, PROXY)
}

describe('isWwwVariantOrigin', () => {
  it('matches apex -> www and www -> apex', () => {
    expect(isWwwVariantOrigin(apex, 'https://www.bbc.com')).toBe(true)
    expect(isWwwVariantOrigin('https://www.bbc.com', apex)).toBe(true)
  })

  it('rejects the identical host', () => {
    expect(isWwwVariantOrigin(apex, apex)).toBe(false)
  })

  it('rejects a non-www subdomain', () => {
    expect(isWwwVariantOrigin(apex, 'https://news.bbc.com')).toBe(false)
    expect(isWwwVariantOrigin(apex, 'https://api.bbc.com')).toBe(false)
  })

  it('rejects a different registrable domain', () => {
    expect(isWwwVariantOrigin(apex, 'https://www.evil.com')).toBe(false)
    expect(isWwwVariantOrigin(apex, 'https://bbc.com.evil.com')).toBe(false)
  })

  // The reason this rule is www-only rather than a "last two labels" same-site
  // check: under that naive rule these would wrongly match on co.uk.
  it('does not treat unrelated multi-part-TLD hosts as same site', () => {
    expect(isWwwVariantOrigin('https://bbc.co.uk', 'https://itv.co.uk')).toBe(
      false,
    )
    expect(
      isWwwVariantOrigin('https://shop.com.au', 'https://other.com.au'),
    ).toBe(false)
  })

  it('still matches apex <-> www on a multi-part TLD', () => {
    expect(isWwwVariantOrigin('https://bbc.co.uk', 'https://www.bbc.co.uk')).toBe(
      true,
    )
  })

  it('accepts an http -> https upgrade but never a downgrade', () => {
    expect(isWwwVariantOrigin('http://bbc.com', 'https://www.bbc.com')).toBe(true)
    expect(isWwwVariantOrigin('https://bbc.com', 'http://www.bbc.com')).toBe(
      false,
    )
  })

  it('rejects a port mismatch', () => {
    expect(
      isWwwVariantOrigin('https://bbc.com:8443', 'https://www.bbc.com'),
    ).toBe(false)
  })

  it('rejects non-http(s) schemes and malformed input', () => {
    expect(isWwwVariantOrigin(apex, 'ftp://www.bbc.com')).toBe(false)
    expect(isWwwVariantOrigin(apex, 'javascript:alert(1)')).toBe(false)
    expect(isWwwVariantOrigin(apex, 'not a url')).toBe(false)
    expect(isWwwVariantOrigin('', '')).toBe(false)
  })

  it('does not match a bare "www" host against another bare host', () => {
    expect(isWwwVariantOrigin('https://www', 'https://anything')).toBe(false)
  })
})

describe('parseAbsoluteUrl', () => {
  it('parses absolute urls', () => {
    expect(parseAbsoluteUrl('https://a.com/x', apex)?.href).toBe('https://a.com/x')
  })

  it('inherits the base scheme for protocol-relative urls', () => {
    expect(parseAbsoluteUrl('//a.com/x', 'http://b.com')?.protocol).toBe('http:')
    expect(parseAbsoluteUrl('//a.com/x', 'https://b.com')?.protocol).toBe(
      'https:',
    )
  })

  it('returns null for non-absolute input', () => {
    expect(parseAbsoluteUrl('/x', apex)).toBeNull()
    expect(parseAbsoluteUrl('data:text/plain,hi', apex)).toBeNull()
    expect(parseAbsoluteUrl('mailto:a@b.com', apex)).toBeNull()
    expect(parseAbsoluteUrl('', apex)).toBeNull()
  })
})

describe('rewriteProxyUrl', () => {
  it('rewrites absolute urls on the target origin', () => {
    expect(rewrite(`${apex}/news?a=1#f`)).toBe(
      `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/news?a=1#f`,
    )
  })

  it('rewrites root-relative paths', () => {
    expect(rewrite('/news')).toBe(`${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/news`)
  })

  it('rewrites protocol-relative urls on the target origin', () => {
    expect(rewrite('//bbc.com/news')).toBe(
      `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/news`,
    )
  })

  it('leaves urls already pointing at the proxy alone', () => {
    const already = `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/news`
    expect(rewrite(already)).toBe(already)
  })

  // The regression this whole module exists for.
  it('keeps an apex -> www redirect inside the proxy', () => {
    expect(rewrite('https://www.bbc.com/')).toBe(
      `${PROXY}/p/${STUDY}/${SNIPPET}/${wwwB64}/`,
    )
  })

  it('re-encodes the variant with its own origin, so it cannot bounce back', () => {
    const out = rewrite('https://www.bbc.com/news?x=1#top')
    // Must carry the www origin, not the apex one it was configured with.
    expect(out).toContain(`/${wwwB64}/`)
    expect(out).not.toContain(`/${apexB64}/`)
    expect(out).toBe(`${PROXY}/p/${STUDY}/${SNIPPET}/${wwwB64}/news?x=1#top`)
  })

  it('keeps a www -> apex redirect inside the proxy', () => {
    const out = rewriteProxyUrl(
      'https://bbc.com/news',
      'https://www.bbc.com',
      STUDY,
      SNIPPET,
      wwwB64,
      PROXY,
    )
    expect(out).toBe(`${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/news`)
  })

  it('handles a protocol-relative www variant', () => {
    expect(rewrite('//www.bbc.com/news')).toBe(
      `${PROXY}/p/${STUDY}/${SNIPPET}/${wwwB64}/news`,
    )
  })

  it('lets genuinely off-site urls exit the proxy', () => {
    expect(rewrite('https://evil.com/x')).toBe('https://evil.com/x')
    expect(rewrite('https://news.bbc.com/x')).toBe('https://news.bbc.com/x')
  })

  it('leaves non-navigational urls alone', () => {
    expect(rewrite('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA')
    expect(rewrite('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(rewrite('')).toBe('')
  })
})
