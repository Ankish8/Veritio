/**
 * Normalization for the researcher-authored "Redirect URL" fields on the
 * thank-you, screen-out, closed-study and agreement-declined screens.
 *
 * These fields are free text, so they routinely hold things that are not URLs.
 * The dangerous shape is a schemeless string: handing `"someone@gmail.com"` to
 * `window.location.href` from a study at `/s/ABC123` resolves it *relative to
 * the study path*, so the participant lands on `/s/someone@gmail.com` and a
 * "Study not found" screen at the exact moment they finish. Prepending a scheme
 * makes every value absolute, and anything still not a plausible external
 * http(s) target is refused so callers can hide the button instead of shipping
 * a broken one.
 */

const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/i

/** Hostnames without a dot that are still legitimate redirect targets. */
const DOTLESS_HOSTS = new Set(['localhost'])

/**
 * Resolve a researcher-entered redirect value to an absolute http(s) URL.
 * Returns `null` when the value is empty or cannot be a real external target,
 * which callers must treat as "no redirect configured".
 */
export function normalizeParticipantRedirect(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null

  const scheme = SCHEME_PATTERN.exec(trimmed)?.[1]
  // A "scheme" containing a dot is really a host:port ("example.com:8080"),
  // which still needs a scheme prepended.
  const alreadyAbsolute = Boolean(scheme) && !scheme!.includes('.')

  let candidate: string
  if (alreadyAbsolute) {
    candidate = trimmed
  } else if (trimmed.startsWith('//')) {
    // Protocol-relative is already absolute, it just has no scheme to parse.
    candidate = `https:${trimmed}`
  } else {
    candidate = `https://${trimmed}`
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  // "someone@gmail.com" parses as userinfo + host once a scheme is prepended.
  // Rejecting credentials also blocks the https://veritio.io@evil.com shape.
  if (url.username || url.password) return null

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname) return null
  if (!hostname.includes('.') && !DOTLESS_HOSTS.has(hostname)) return null

  return url.toString()
}

/** True when a value would produce a usable redirect. Empty input is valid ("no redirect"). */
export function isValidParticipantRedirect(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return true
  return normalizeParticipantRedirect(raw) !== null
}
