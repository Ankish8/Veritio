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
 * Rewrites a URL found in a proxied response so it stays inside the proxy.
 *
 * Handles, in order: URLs already pointing at the proxy, absolute URLs on the
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
    // Already pointing at proxy — leave alone
    if (url.startsWith(proxyBase)) return url

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
