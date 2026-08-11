/**
 * URL rewriting for the Live Website Test reverse proxy.
 *
 * Lives in the app (rather than in workers/) so it is covered by the app's test
 * suite, which only collects `src/**`. The Cloudflare worker imports from here,
 * as it already does for the rrweb embeds and the companion script.
 *
 * The `isWwwVariantOrigin` rule is shared with save-time origin resolution so a
 * single definition of "same site" governs both ends.
 */

/**
 * Parses `url` if it is absolute or protocol-relative; returns null otherwise
 * (root-relative paths, `data:`, `mailto:`, fragments, malformed input).
 *
 * Protocol-relative URLs inherit the scheme of `base`.
 */
export function parseAbsoluteUrl(url: string, base: string): URL | null {
  try {
    if (/^https?:\/\//i.test(url)) return new URL(url)
    if (url.startsWith('//')) return new URL(new URL(base).protocol + url)
    return null
  } catch {
    return null
  }
}

/**
 * True when `candidate` differs from `configured` only by a leading `www.` on
 * the host (apex <-> www, in either direction).
 *
 * Deliberately narrower than a general same-site check. Correct same-site
 * matching requires the Public Suffix List: a naive "last two labels" rule turns
 * bbc.co.uk into co.uk and would treat every unrelated *.co.uk host as same
 * site. The apex<->www pair carries the overwhelming majority of real-world
 * redirects with none of that ambiguity, so this stays intentionally small.
 *
 * An http -> https upgrade is accepted. A downgrade never is.
 */
export function isWwwVariantOrigin(
  configured: string,
  candidate: string,
): boolean {
  try {
    const a = new URL(configured)
    const b = new URL(candidate)

    if (a.protocol !== 'http:' && a.protocol !== 'https:') return false
    if (b.protocol !== 'http:' && b.protocol !== 'https:') return false

    if (a.protocol !== b.protocol) {
      // Upgrade only; never follow https -> http.
      if (!(a.protocol === 'http:' && b.protocol === 'https:')) return false
    }
    if (a.port !== b.port) return false

    const hostA = a.hostname.toLowerCase()
    const hostB = b.hostname.toLowerCase()
    if (hostA === hostB) return false // same host, so not a variant

    const stripWww = (h: string) => h.replace(/^www\./, '')
    const bareA = stripWww(hostA)
    const bareB = stripWww(hostB)

    // Guard against a bare "www" host, where stripping leaves an empty string
    // and would match anything else that also strips to empty.
    if (!bareA || !bareB) return false

    return bareA === bareB
  } catch {
    return false
  }
}

/**
 * True for the only two path prefixes the proxy worker serves in its own right:
 * `/p/**` (a proxied page) and `/api/**` (its forwarder to the backend, which
 * the companion script calls directly). The worker 404s everything else on its
 * origin, so any other path there is a target-origin URL wearing the wrong
 * base — see the proxy-origin branch of `rewriteProxyUrl`.
 */
export function isProxyOwnPath(path: string): boolean {
  return (
    path === '/p' ||
    path.startsWith('/p/') ||
    path === '/api' ||
    path.startsWith('/api/')
  )
}

/**
 * Rewrites a URL found in a proxied response so it stays inside the proxy.
 *
 * Handles, in order: URLs already on the proxy origin, absolute URLs on the
 * target origin, protocol-relative URLs on the target origin, apex<->www
 * variants of the target origin, and root-relative paths.
 *
 * Genuinely off-site URLs are returned unchanged on purpose: following them
 * would keep recording the participant on a site the researcher never
 * configured, so they are allowed to exit the proxy.
 */
export function rewriteProxyUrl(
  url: string,
  targetOrigin: string,
  studyId: string,
  snippetId: string,
  base64Origin: string,
  proxyBase: string = 'https://your-proxy-worker.workers.dev',
): string {
  if (!url) return url

  const proxyPath = `/p/${studyId}/${snippetId}/${base64Origin}`

  try {
    // Already on the proxy origin. This used to return every such URL
    // unchanged, which quietly broke images, styles and links on SPA targets:
    // `el.src`/`el.href` hand back a RESOLVED absolute URL, so a page asset
    // authored as `/assets/icon.svg` reaches a rewriter as
    // `{proxyBase}/assets/icon.svg` — same origin as the proxy, but not a route
    // the worker serves, so it 404s and the browser renders a broken image.
    // Only `/p/**` and `/api/**` are genuinely the worker's; re-point the rest
    // under this study's proxy path.
    if (url.startsWith(proxyBase)) {
      const rest = url.slice(proxyBase.length)
      // A lookalike host that merely shares the prefix
      // (https://proxy.example.com.evil.com/x) is not the proxy. A real
      // same-origin URL either ends at the origin or continues with a path,
      // query, or fragment.
      if (rest && !/^[/?#]/.test(rest)) return url
      if (isProxyOwnPath(rest.split(/[?#]/)[0])) return url
      return proxyBase + proxyPath + (rest.startsWith('/') ? rest : '/' + rest)
    }

    // Absolute URL on target origin
    if (url.startsWith(targetOrigin)) {
      return proxyBase + proxyPath + url.slice(targetOrigin.length)
    }

    // Protocol-relative on target origin
    const noProto = targetOrigin.replace(/^https?:/, '')
    if (url.startsWith('//' + noProto.replace(/^\/\//, ''))) {
      return (
        proxyBase +
        proxyPath +
        url.slice(('//' + noProto.replace(/^\/\//, '')).length)
      )
    }

    // apex <-> www variant of the target origin.
    //
    // Nearly every site redirects one to the other (bbc.com -> www.bbc.com), and
    // that is cross-origin, so it used to fall through to the pass-through
    // below. The participant then left the proxy on the very first request: no
    // companion script, no rrweb, zero events recorded, and no error surfaced.
    //
    // The variant is re-encoded with its OWN origin instead of reusing
    // base64Origin. Reusing it would rewrite www back to the apex, which the
    // site redirects to www again: a bounce that never settles.
    const variant = parseAbsoluteUrl(url, targetOrigin)
    if (variant && isWwwVariantOrigin(targetOrigin, variant.origin)) {
      const variantPath = `/p/${studyId}/${snippetId}/${btoa(variant.origin)}`
      return (
        proxyBase +
        variantPath +
        variant.pathname +
        variant.search +
        variant.hash
      )
    }

    // Root-relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return proxyBase + proxyPath + url
    }
  } catch {
    // pass
  }

  return url
}

/**
 * Rewrites every candidate URL in a `srcset`, leaving its descriptors intact.
 *
 * `srcset` carries URLs that nothing else in the pipeline touches: `img[src]`
 * rewriting misses them entirely, and `<picture><source>` has no `src` at all,
 * so a responsive image's every candidate stayed pointed at a path the proxy
 * 404s.
 *
 * Split follows the HTML parsing rules rather than a naive comma split: a
 * candidate's URL runs to the next whitespace, so `data:` URIs (which contain
 * commas of their own) survive.
 */
export function rewriteSrcset(
  value: string,
  rewriteOne: (url: string) => string,
): string {
  if (!value) return value

  const isWs = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'
  const candidates: string[] = []
  let i = 0

  while (i < value.length) {
    // Leading whitespace, plus commas left over from the previous candidate.
    while (i < value.length && (isWs(value[i]) || value[i] === ',')) i++
    if (i >= value.length) break

    const urlStart = i
    while (i < value.length && !isWs(value[i])) i++
    let url = value.slice(urlStart, i)

    // A URL ending in a comma closes its candidate and carries no descriptor.
    let descriptor = ''
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '')
    } else {
      const descStart = i
      while (i < value.length && value[i] !== ',') i++
      descriptor = value.slice(descStart, i).trim()
      if (i < value.length) i++ // consume the separating comma
    }

    if (!url) continue
    const rewritten = rewriteOne(url)
    candidates.push(descriptor ? `${rewritten} ${descriptor}` : rewritten)
  }

  return candidates.length ? candidates.join(', ') : value
}

/**
 * Matches a CSS `url()` token in its three forms: double-quoted, single-quoted,
 * and bare. Deliberately simple about backslash escapes inside quotes, which
 * are vanishingly rare in real stylesheets; `rewriteCssUrls` returns the
 * original token untouched whenever rewriting is a no-op, so a mis-parse
 * degrades to "left alone" rather than to corrupted CSS.
 */
const CSS_URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/g

/** `@import "theme.css"` — the string form, which carries no url() to match. */
const CSS_IMPORT_RE = /(@import\s+)("[^"]*"|'[^']*')/g

/**
 * Rewrites the URLs inside a stylesheet or a `style` attribute.
 *
 * Stylesheets were passed through untouched, so a root-relative
 * `url(/img/icon.svg)` resolved against the proxy ORIGIN and 404'd — the same
 * failure as the broken `<img>`, but silent: a failed CSS background paints
 * nothing rather than a broken-image glyph.
 *
 * Relative URLs are deliberately left alone. `url(img/icon.svg)` resolves
 * against the stylesheet's own already-proxied URL, so it is correct as-is and
 * rewriting it would break it.
 */
export function rewriteCssUrls(
  css: string,
  rewriteOne: (url: string) => string,
): string {
  if (!css) return css

  const swap = (raw: string, original: string): string => {
    if (!raw) return original
    const next = rewriteOne(raw)
    if (next === raw) return original
    return next
  }

  let out = css.replace(CSS_URL_RE, (match, dq, sq, bare) => {
    const raw = dq !== undefined ? dq : sq !== undefined ? sq : bare
    const next = swap(raw, match)
    if (next === match) return match
    // Re-emit quoted: a rewritten URL can contain characters (parentheses in a
    // base64 origin segment, say) that a bare url() token cannot carry.
    return `url("${next.replace(/"/g, '\\"')}")`
  })

  out = out.replace(CSS_IMPORT_RE, (match, keyword, quoted) => {
    const quote = quoted[0]
    const raw = quoted.slice(1, -1)
    const next = swap(raw, match)
    if (next === match) return match
    return `${keyword}${quote}${next}${quote}`
  })

  return out
}
