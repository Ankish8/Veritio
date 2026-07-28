/**
 * Cookie rewriting for the Live Website Test reverse proxy.
 *
 * Every proxied site shares one worker hostname, so without rewriting, cookies
 * set while proxying one target are sent when proxying another. Scoping each
 * cookie's Path to the study's proxy prefix keeps them isolated per study.
 */

/**
 * Builds the cookie scope for a study's proxied traffic.
 *
 * Deliberately excludes the `{base64Origin}` path segment even though it sits
 * inside the proxy URL. The proxy re-encodes that segment when it follows an
 * apex/www redirect, so a cookie scoped to the origin segment would stop
 * matching the moment the site redirected — exactly when session cookies are
 * being set. Scoping to study + snippet keeps cookies alive across that hop and
 * across the several hosts a single study can legitimately span via A/B
 * variants, while still isolating one study's cookies from another's.
 */
export function buildCookieScope(studyId: string, snippetId: string): string {
  return `/p/${studyId}/${snippetId}`
}

/** Collapses accidental double slashes without touching a leading one. */
function normalizePath(path: string): string {
  return path.replace(/\/{2,}/g, '/')
}

/**
 * Rewrites a single Set-Cookie value so it is scoped to `scope`.
 *
 * A target's own Path is preserved underneath the scope (`/account` becomes
 * `{scope}/account`) so sites that deliberately narrow a cookie keep that
 * behaviour. A cookie with no Path gets an explicit one: the browser default is
 * the requesting directory, which under the proxy would leave it scoped to some
 * arbitrary depth of the proxied path rather than the study.
 */
export function rewriteCookiePath(cookie: string, scope: string): string {
  if (!cookie) return cookie

  const base = scope.replace(/\/+$/, '')
  const pathAttr = /;\s*path\s*=\s*([^;]*)/i

  const match = cookie.match(pathAttr)
  if (!match) {
    return `${cookie}; Path=${normalizePath(`${base}/`)}`
  }

  const original = (match[1] || '').trim()
  const suffix = original.startsWith('/') ? original : `/${original}`
  const rewritten = normalizePath(`${base}${suffix}`)

  return cookie.replace(pathAttr, `; Path=${rewritten}`)
}
