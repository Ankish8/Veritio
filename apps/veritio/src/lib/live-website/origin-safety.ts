/**
 * SSRF guards for anything that fetches a researcher-supplied website URL.
 *
 * Shared by the Cloudflare proxy worker and the save-time origin resolver so a
 * single blocklist governs every server-side fetch of an untrusted origin. Both
 * only ever fetch the PUBLIC site a study is configured against, so loopback,
 * private/CGNAT ranges, link-local / cloud-metadata addresses, and internal-only
 * suffixes are always illegitimate.
 */

/** Maximum redirect hops to follow when resolving a target URL. */
export const MAX_REDIRECT_HOPS = 5

/**
 * Returns true if the origin must never be fetched.
 *
 * Note this is a hostname-level check, not DNS resolution: a public hostname
 * with an A record pointing at 127.0.0.1 still passes. It is defense in depth,
 * not a complete SSRF defense. Callers that fetch must also refuse to expose
 * response bodies for arbitrary origins.
 */
export function isBlockedProxyOrigin(origin: string): boolean {
  let u: URL
  try {
    u = new URL(origin)
  } catch {
    return true
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true
  if (u.username || u.password) return true // no embedded credentials

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true
  }
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }

  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{0,2}:/.test(host) || host.startsWith('fe80:')) return true

  return false
}
