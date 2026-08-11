/**
 * The document URL matters here: `el.src` resolves against it, and reproducing
 * the broken-icon bug requires the page to be served from the proxy origin the
 * way a participant's really is.
 *
 * @vitest-environment jsdom
 * @vitest-environment-options { "url": "https://proxy.example.com/p/study-1/snip-1/b64origin/dashboard" }
 */
import { describe, expect, it } from 'vitest'
import { generateProxyCompanionJs } from './proxy-companion'

const SOURCE = generateProxyCompanionJs()

const PROXY_BASE = 'https://proxy.example.com'
const TARGET_ORIGIN = 'https://target.example.com'
const PROXY_PATH = '/p/study-1/snip-1/b64origin'

/**
 * Slices a run of function declarations out of the generated script so they can
 * be exercised directly. The companion is one big IIFE that boots timers,
 * widgets and network calls the moment it runs with a config present, so the
 * URL helpers are lifted out instead of booting the whole thing.
 *
 * Markers are the section headers around the helpers. If they drift, this
 * throws rather than silently testing nothing.
 */
function slice(startMarker: string, endMarker: string): string {
  const start = SOURCE.indexOf(startMarker)
  const end = SOURCE.indexOf(endMarker, start)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Could not slice generated companion between ${JSON.stringify(startMarker)} and ${JSON.stringify(endMarker)} — markers moved.`,
    )
  }
  return SOURCE.slice(start, end)
}

/** Builds the URL helpers from the generated source, bound to test config. */
function loadUrlHelpers(): {
  rewriteUrl: (url: string) => string
  rewriteSrcsetValue: (value: string) => string
  rewriteCssUrls: (css: string) => string
} {
  const helpers =
    slice('function isProxyOwnPath(p)', '// Navigation Interceptors') +
    slice('function _isSrcsetWs(c)', 'var REWRITABLE_SELECTOR')

  const factory = new Function(
    'PROXY_BASE',
    'PROXY_PATH',
    'TARGET_ORIGIN',
    `${helpers}\nreturn { rewriteUrl, rewriteSrcsetValue, rewriteCssUrls };`,
  )
  return factory(PROXY_BASE, PROXY_PATH, TARGET_ORIGIN)
}

describe('generated proxy companion script', () => {
  // The script is assembled from template literals, where a missed backslash
  // turns into a syntax error that only shows up in a participant's browser.
  it('is syntactically valid JavaScript', () => {
    expect(() => new Function(SOURCE)).not.toThrow()
  })

  it('bails out when no proxy config is present', () => {
    const win = { __VT_PROXY: undefined }
    expect(() =>
      new Function('window', SOURCE)(win),
    ).not.toThrow()
  })
})

describe('companion rewriteUrl', () => {
  const { rewriteUrl } = loadUrlHelpers()

  it('rewrites target-origin and root-relative urls into the proxy path', () => {
    expect(rewriteUrl(`${TARGET_ORIGIN}/news`)).toBe(
      `${PROXY_BASE}${PROXY_PATH}/news`,
    )
    expect(rewriteUrl('/news')).toBe(`${PROXY_BASE}${PROXY_PATH}/news`)
  })

  it('leaves urls already under a proxy path alone', () => {
    const already = `${PROXY_BASE}${PROXY_PATH}/news`
    expect(rewriteUrl(already)).toBe(already)
  })

  // The broken-icon bug. el.src hands back a RESOLVED absolute URL, so an asset
  // authored as "/assets/icon.svg" reaches rewriteUrl as PROXY_BASE +
  // "/assets/icon.svg" — the proxy origin, but a path the worker 404s.
  it('re-points proxy-origin assets that fell outside the proxy path', () => {
    expect(rewriteUrl(`${PROXY_BASE}/assets/icon.svg`)).toBe(
      `${PROXY_BASE}${PROXY_PATH}/assets/icon.svg`,
    )
    expect(rewriteUrl(`${PROXY_BASE}/assets/icon.svg?v=2#f`)).toBe(
      `${PROXY_BASE}${PROXY_PATH}/assets/icon.svg?v=2#f`,
    )
  })

  it('handles the bare proxy origin, and origin + query or hash', () => {
    expect(rewriteUrl(PROXY_BASE)).toBe(`${PROXY_BASE}${PROXY_PATH}/`)
    expect(rewriteUrl(`${PROXY_BASE}?a=1`)).toBe(`${PROXY_BASE}${PROXY_PATH}/?a=1`)
    expect(rewriteUrl(`${PROXY_BASE}#top`)).toBe(`${PROXY_BASE}${PROXY_PATH}/#top`)
  })

  // Every event batch is POSTed to {proxyBase}/api/**, which the worker serves
  // itself. Re-pointing those under /p/** would silently kill all recording.
  it('never touches the worker’s own /api/ route', () => {
    const api = `${PROXY_BASE}/api/snippet/snip-1/events`
    expect(rewriteUrl(api)).toBe(api)
  })

  it('does not treat a lookalike host as the proxy', () => {
    const lookalike = `${PROXY_BASE}.evil.com/assets/icon.svg`
    expect(rewriteUrl(lookalike)).toBe(lookalike)
  })

  it('leaves off-site and non-navigational urls alone', () => {
    expect(rewriteUrl('https://cdn.other.com/a.png')).toBe(
      'https://cdn.other.com/a.png',
    )
    expect(rewriteUrl('data:image/png;base64,AAA')).toBe(
      'data:image/png;base64,AAA',
    )
    expect(rewriteUrl('')).toBe('')
  })

  it('is idempotent', () => {
    const once = rewriteUrl(`${PROXY_BASE}/assets/icon.svg`)
    expect(rewriteUrl(once)).toBe(once)
  })
})

describe('companion rewriteSrcsetValue', () => {
  const { rewriteSrcsetValue } = loadUrlHelpers()
  const base = `${PROXY_BASE}${PROXY_PATH}`

  it('rewrites every candidate and keeps its descriptor', () => {
    expect(rewriteSrcsetValue('/a.png 1x, /a@2x.png 2x')).toBe(
      `${base}/a.png 1x, ${base}/a@2x.png 2x`,
    )
  })

  it('handles width descriptors and irregular whitespace', () => {
    expect(rewriteSrcsetValue('  /a.png   300w ,\n/b.png 600w  ')).toBe(
      `${base}/a.png 300w, ${base}/b.png 600w`,
    )
  })

  it('handles a lone candidate with no descriptor', () => {
    expect(rewriteSrcsetValue('/a.png')).toBe(`${base}/a.png`)
    expect(rewriteSrcsetValue('/a.png,')).toBe(`${base}/a.png`)
  })

  it('does not split a data: URI on its internal commas', () => {
    const data = 'data:image/svg+xml;base64,AAA,BBB'
    expect(rewriteSrcsetValue(`${data} 1x`)).toBe(`${data} 1x`)
  })

  it('is idempotent and passes empty input through', () => {
    const once = rewriteSrcsetValue('/a.png 1x, /b.png 2x')
    expect(rewriteSrcsetValue(once)).toBe(once)
    expect(rewriteSrcsetValue('')).toBe('')
  })
})

/** Builds the DOM-rewriting layer from the generated source. */
function loadDomRewriter() {
  const body =
    slice('function isProxyOwnPath(p)', '// Navigation Interceptors') +
    slice('function _isSrcsetWs(c)', '// Shared code modules')

  const factory = new Function(
    'PROXY_BASE',
    'PROXY_PATH',
    'TARGET_ORIGIN',
    'document',
    'MutationObserver',
    `${body}\nreturn { rewriteElement: rewriteElement, rewriteAllLinks: rewriteAllLinks, observeDomChanges: observeDomChanges };`,
  )
  return factory(
    PROXY_BASE,
    PROXY_PATH,
    TARGET_ORIGIN,
    globalThis.document,
    globalThis.MutationObserver,
  )
}

const settle = () => new Promise((r) => setTimeout(r, 0))

describe('companion DOM rewriting', () => {
  const dom = loadDomRewriter()
  dom.observeDomChanges()

  it('reproduces and fixes the broken icon: a dynamically inserted img', async () => {
    const el = document.createElement('img')
    el.setAttribute('src', '/assets/icon.svg')
    // This is the bug in one line: the browser has already resolved the asset
    // onto the proxy ORIGIN, where the worker serves nothing and 404s.
    expect(el.src).toBe(`${PROXY_BASE}/assets/icon.svg`)

    document.body.appendChild(el)
    await settle()

    expect(el.src).toBe(`${PROXY_BASE}${PROXY_PATH}/assets/icon.svg`)
  })

  it('fixes a src assigned after the element is already in the DOM', async () => {
    const el = document.createElement('img')
    document.body.appendChild(el)
    await settle()

    el.setAttribute('src', '/assets/late.svg')
    await settle()

    expect(el.src).toBe(`${PROXY_BASE}${PROXY_PATH}/assets/late.svg`)
  })

  it('fixes a src that changes on re-render', async () => {
    const el = document.createElement('img')
    el.setAttribute('src', '/assets/first.svg')
    document.body.appendChild(el)
    await settle()

    el.setAttribute('src', '/assets/second.svg')
    await settle()

    expect(el.src).toBe(`${PROXY_BASE}${PROXY_PATH}/assets/second.svg`)
  })

  // Rewriting fires the very observer that triggered it. If rewriteElement
  // wrote unconditionally this would never settle and the test would time out.
  it('settles instead of looping when it rewrites an observed attribute', async () => {
    const el = document.createElement('img')
    el.setAttribute('src', '/assets/loop.svg')
    document.body.appendChild(el)

    for (let i = 0; i < 5; i++) await settle()

    expect(el.src).toBe(`${PROXY_BASE}${PROXY_PATH}/assets/loop.svg`)
  })

  it('rewrites srcset candidates on inserted elements', async () => {
    const pic = document.createElement('picture')
    const source = document.createElement('source')
    source.setAttribute('srcset', '/a.png 1x, /a@2x.png 2x')
    pic.appendChild(source)
    document.body.appendChild(pic)
    await settle()

    expect(source.getAttribute('srcset')).toBe(
      `${PROXY_BASE}${PROXY_PATH}/a.png 1x, ${PROXY_BASE}${PROXY_PATH}/a@2x.png 2x`,
    )
  })

  it('rewrites anchors so SPA links stay inside the proxy', async () => {
    const a = document.createElement('a')
    a.setAttribute('href', '/settings')
    document.body.appendChild(a)
    await settle()

    expect(a.href).toBe(`${PROXY_BASE}${PROXY_PATH}/settings`)
  })

  it('leaves an already-correct url untouched', async () => {
    const el = document.createElement('img')
    const good = `${PROXY_BASE}${PROXY_PATH}/assets/ok.svg`
    el.setAttribute('src', good)
    document.body.appendChild(el)
    await settle()

    expect(el.src).toBe(good)
  })

  it('leaves genuinely off-site images alone', async () => {
    const el = document.createElement('img')
    el.setAttribute('src', 'https://cdn.other.com/logo.png')
    document.body.appendChild(el)
    await settle()

    expect(el.src).toBe('https://cdn.other.com/logo.png')
  })
})

// The generated CSS regexes are the most escape-heavy code in the companion:
// every backslash has to survive the template literal that emits them. These
// assert the shipped behaviour, not the source text.
describe('companion rewriteCssUrls', () => {
  const { rewriteCssUrls } = loadUrlHelpers()
  const base = `${PROXY_BASE}${PROXY_PATH}`

  it('rewrites all three url() quoting forms', () => {
    expect(rewriteCssUrls('a{background:url(/i.svg)}')).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
    expect(rewriteCssUrls(`a{background:url("/i.svg")}`)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
    expect(rewriteCssUrls(`a{background:url('/i.svg')}`)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
  })

  it('rewrites the proxy-origin form and @import', () => {
    expect(rewriteCssUrls(`a{background:url(${PROXY_BASE}/i.svg)}`)).toBe(
      `a{background:url("${base}/i.svg")}`,
    )
    expect(rewriteCssUrls('@import "/theme.css";')).toBe(
      `@import "${base}/theme.css";`,
    )
  })

  it('leaves relative, data:, fragment and off-site urls alone', () => {
    expect(rewriteCssUrls('a{background:url(img/i.svg)}')).toBe(
      'a{background:url(img/i.svg)}',
    )
    expect(rewriteCssUrls('a{background:url(data:image/svg+xml;base64,AAA)}')).toBe(
      'a{background:url(data:image/svg+xml;base64,AAA)}',
    )
    expect(rewriteCssUrls('a{fill:url(#grad)}')).toBe('a{fill:url(#grad)}')
    expect(rewriteCssUrls('a{background:url(https://cdn.other.com/i.svg)}')).toBe(
      'a{background:url(https://cdn.other.com/i.svg)}',
    )
  })

  it('preserves css that needs no rewriting, byte for byte', () => {
    const css = '.a > .b{color:red}\n.c::after{content:"x)y"}'
    expect(rewriteCssUrls(css)).toBe(css)
  })

  it('is idempotent', () => {
    const once = rewriteCssUrls('a{background:url(/i.svg)}')
    expect(rewriteCssUrls(once)).toBe(once)
  })
})

describe('companion SVG sprite and inline CSS rewriting', () => {
  const dom = loadDomRewriter()
  dom.observeDomChanges()

  const svg = (inner: string) => {
    const host = document.createElement('div')
    host.innerHTML = `<svg>${inner}</svg>`
    document.body.appendChild(host)
    return host
  }

  it('rewrites an SVG sprite reference in href', async () => {
    const host = svg('<use href="/sprite.svg#edit"></use>')
    await settle()
    expect(host.querySelector('use')!.getAttribute('href')).toBe(
      `${PROXY_BASE}${PROXY_PATH}/sprite.svg#edit`,
    )
  })

  it('rewrites the legacy xlink:href form', async () => {
    const host = svg('<use xlink:href="/sprite.svg#save"></use>')
    await settle()
    const use = host.querySelector('use')!
    const got =
      use.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ||
      use.getAttribute('xlink:href')
    expect(got).toBe(`${PROXY_BASE}${PROXY_PATH}/sprite.svg#save`)
  })

  // A same-document sprite reference must not be sent to the proxy.
  it('leaves a fragment-only reference alone', async () => {
    const host = svg('<use href="#icon-inline"></use>')
    await settle()
    expect(host.querySelector('use')!.getAttribute('href')).toBe('#icon-inline')
  })

  it('rewrites <image> inside an svg', async () => {
    const host = svg('<image href="/photo.png"></image>')
    await settle()
    expect(host.querySelector('image')!.getAttribute('href')).toBe(
      `${PROXY_BASE}${PROXY_PATH}/photo.png`,
    )
  })

  it('rewrites url() inside an injected <style> block', async () => {
    const el = document.createElement('style')
    el.textContent = '.icon{background:url(/i.svg)}'
    document.body.appendChild(el)
    await settle()
    expect(el.textContent).toBe(
      `.icon{background:url("${PROXY_BASE}${PROXY_PATH}/i.svg")}`,
    )
  })

  // Rewriting textContent is itself a childList mutation, so this re-enters the
  // observer. It must converge rather than spin.
  it('settles after rewriting a style block', async () => {
    const el = document.createElement('style')
    el.textContent = '.a{background:url(/loop.svg)}'
    document.body.appendChild(el)
    for (let i = 0; i < 5; i++) await settle()
    expect(el.textContent).toBe(
      `.a{background:url("${PROXY_BASE}${PROXY_PATH}/loop.svg")}`,
    )
  })

  it('rewrites url() in an inline style attribute', async () => {
    const el = document.createElement('div')
    el.setAttribute('style', 'background-image:url(/hero.png)')
    document.body.appendChild(el)
    await settle()
    expect(el.getAttribute('style')).toContain(
      `url("${PROXY_BASE}${PROXY_PATH}/hero.png")`,
    )
  })
})
