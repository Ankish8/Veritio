import { describe, expect, it } from 'vitest'
import {
  isProxyOwnPath,
  isWwwVariantOrigin,
  parseAbsoluteUrl,
  rewriteProxyUrl,
  rewriteCssUrls,
  rewriteSrcset,
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

  it('leaves another study’s proxy path alone', () => {
    const other = `${PROXY}/p/other-study/other-snip/${apexB64}/news`
    expect(rewrite(other)).toBe(other)
  })

  // The broken-image bug: el.src/el.href resolve against the proxy ORIGIN, so
  // a target asset written as "/assets/icon.svg" reaches the rewriter already
  // absolute on the proxy host but outside /p/**, where the worker 404s.
  describe('urls that landed on the proxy origin outside a proxy path', () => {
    it('re-points a resolved root-relative asset under the proxy path', () => {
      expect(rewrite(`${PROXY}/assets/icon.svg`)).toBe(
        `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/assets/icon.svg`,
      )
    })

    it('keeps query and hash', () => {
      expect(rewrite(`${PROXY}/assets/icon.svg?v=2#f`)).toBe(
        `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/assets/icon.svg?v=2#f`,
      )
    })

    it('handles the bare proxy origin, and origin + query or hash', () => {
      expect(rewrite(PROXY)).toBe(`${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/`)
      expect(rewrite(`${PROXY}?a=1`)).toBe(
        `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/?a=1`,
      )
      expect(rewrite(`${PROXY}#top`)).toBe(
        `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}/#top`,
      )
    })

    // The companion POSTs every event batch to {proxyBase}/api/**, which the
    // worker serves itself. Re-pointing those under /p/** would silently kill
    // all event recording, so this case must stay untouched.
    it('never touches the worker’s own /api/ route', () => {
      const api = `${PROXY}/api/snippet/${SNIPPET}/events`
      expect(rewrite(api)).toBe(api)
      expect(rewrite(`${PROXY}/api/snippet/${SNIPPET}/snapshot?x=1`)).toBe(
        `${PROXY}/api/snippet/${SNIPPET}/snapshot?x=1`,
      )
    })

    it('does not treat a lookalike host as the proxy', () => {
      const lookalike = `${PROXY}.evil.com/assets/icon.svg`
      expect(rewrite(lookalike)).toBe(lookalike)
    })

    it('is idempotent', () => {
      const once = rewrite(`${PROXY}/assets/icon.svg`)
      expect(rewrite(once)).toBe(once)
    })
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

describe('isProxyOwnPath', () => {
  it('matches the two routes the worker serves itself', () => {
    expect(isProxyOwnPath('/p')).toBe(true)
    expect(isProxyOwnPath('/p/a/b/c')).toBe(true)
    expect(isProxyOwnPath('/api')).toBe(true)
    expect(isProxyOwnPath('/api/snippet/x/events')).toBe(true)
  })

  it('rejects target-origin paths, including near-misses', () => {
    expect(isProxyOwnPath('/assets/icon.svg')).toBe(false)
    expect(isProxyOwnPath('/')).toBe(false)
    expect(isProxyOwnPath('')).toBe(false)
    // "/pricing" starts with "/p" but is not the /p/ route.
    expect(isProxyOwnPath('/pricing')).toBe(false)
    expect(isProxyOwnPath('/apiary')).toBe(false)
  })
})

describe('rewriteSrcset', () => {
  const one = (u: string) => rewrite(u)
  const base = `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}`

  it('rewrites every candidate and keeps its descriptor', () => {
    expect(rewriteSrcset('/a.png 1x, /a@2x.png 2x', one)).toBe(
      `${base}/a.png 1x, ${base}/a@2x.png 2x`,
    )
  })

  it('handles width descriptors and irregular whitespace', () => {
    expect(rewriteSrcset('  /a.png   300w ,\n/b.png 600w  ', one)).toBe(
      `${base}/a.png 300w, ${base}/b.png 600w`,
    )
  })

  it('handles a lone candidate with no descriptor', () => {
    expect(rewriteSrcset('/a.png', one)).toBe(`${base}/a.png`)
    expect(rewriteSrcset('/a.png,', one)).toBe(`${base}/a.png`)
  })

  it('does not split a data: URI on its internal commas', () => {
    const data = 'data:image/svg+xml;base64,AAA,BBB'
    expect(rewriteSrcset(`${data} 1x`, one)).toBe(`${data} 1x`)
  })

  it('leaves off-site candidates pointing off-site', () => {
    expect(rewriteSrcset('https://cdn.other.com/a.png 2x', one)).toBe(
      'https://cdn.other.com/a.png 2x',
    )
  })

  it('rewrites the proxy-origin form the browser resolves to', () => {
    expect(rewriteSrcset(`${PROXY}/a.png 2x`, one)).toBe(`${base}/a.png 2x`)
  })

  it('is idempotent and passes empty input through', () => {
    const once = rewriteSrcset('/a.png 1x, /b.png 2x', one)
    expect(rewriteSrcset(once, one)).toBe(once)
    expect(rewriteSrcset('', one)).toBe('')
  })
})

describe('rewriteCssUrls', () => {
  const one = (u: string) => rewrite(u)
  const base = `${PROXY}/p/${STUDY}/${SNIPPET}/${apexB64}`

  it('rewrites all three url() quoting forms', () => {
    expect(rewriteCssUrls('a{background:url(/i.svg)}', one)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
    expect(rewriteCssUrls(`a{background:url("/i.svg")}`, one)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
    expect(rewriteCssUrls(`a{background:url('/i.svg')}`, one)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
  })

  it('tolerates whitespace inside the token', () => {
    expect(rewriteCssUrls('a{background:url(  /i.svg  )}', one)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
  })

  it('rewrites absolute target-origin urls', () => {
    expect(rewriteCssUrls(`a{background:url(${apex}/i.svg)}`, one)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
  })

  // These resolve against the stylesheet's own proxied URL, so they are already
  // correct; rewriting them would break them.
  it('leaves relative urls alone', () => {
    const css = 'a{background:url(img/i.svg)}'
    expect(rewriteCssUrls(css, one)).toBe(css)
    expect(rewriteCssUrls('a{background:url(../img/i.svg)}', one)).toBe(
      'a{background:url(../img/i.svg)}',
    )
  })

  it('leaves data:, fragment and off-site urls alone', () => {
    const data = 'a{background:url(data:image/svg+xml;base64,AAA)}'
    expect(rewriteCssUrls(data, one)).toBe(data)
    // Fragment refs point into the same document (SVG fills, filters).
    expect(rewriteCssUrls('a{fill:url(#grad)}', one)).toBe('a{fill:url(#grad)}')
    const off = 'a{background:url(https://cdn.other.com/i.svg)}'
    expect(rewriteCssUrls(off, one)).toBe(off)
  })

  it('rewrites every url in a multi-url declaration', () => {
    expect(
      rewriteCssUrls('a{background:url(/a.svg),url(/b.svg)}', one),
    ).toBe(`a{background:url("${base}/a.svg"),url("${base}/b.svg")}`)
  })

  it('rewrites @font-face src without disturbing format()', () => {
    expect(
      rewriteCssUrls(`@font-face{src:url(/f.woff2) format("woff2")}`, one),
    ).toBe(`@font-face{src:url("${base}/f.woff2") format("woff2")}`)
  })

  it('rewrites both @import forms', () => {
    expect(rewriteCssUrls('@import "/theme.css";', one)).toBe(
      `@import "${base}/theme.css";`,
    )
    expect(rewriteCssUrls('@import url(/theme.css);', one)).toBe(
      `@import url("${base}/theme.css");`,
    )
  })

  it('preserves css that needs no rewriting, byte for byte', () => {
    const css = '.a > .b{color:red}\n.c::after{content:"x)y"}'
    expect(rewriteCssUrls(css, one)).toBe(css)
  })

  it('is idempotent and passes empty input through', () => {
    const once = rewriteCssUrls('a{background:url(/i.svg)}', one)
    expect(rewriteCssUrls(once, one)).toBe(once)
    expect(rewriteCssUrls('', one)).toBe('')
  })
})
