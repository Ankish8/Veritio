import { isWwwVariantOrigin } from './proxy-url-rewrite'

export type OriginChangeReason = 'unchanged' | 'www-variant' | 'cross-origin'

export interface OriginResolution {
  /** The URL to store. Origin swapped; the researcher's path/query/hash kept. */
  url: string
  /** True when the stored origin differs from what was entered. */
  changed: boolean
  reason: OriginChangeReason
}

/**
 * Decides what to store after following a target URL's redirects.
 *
 * Only the ORIGIN is ever adopted; the researcher's own path, query, and hash are
 * always preserved. That distinction is what makes this safe against redirects
 * that are request-dependent rather than canonical:
 *
 * - stripe.com -> stripe.com/in is a geo redirect. Same origin, so nothing
 *   changes and the researcher's path is untouched. Baking in `/in` would pin
 *   every participant to one region's landing page.
 * - bbc.com -> www.bbc.com is canonical. Cross-origin, so the origin is adopted
 *   and `/news` (if the researcher typed it) is carried across.
 *
 * An https -> http downgrade is never adopted.
 */
export function applyResolvedOrigin(
  entered: string,
  resolvedFinalUrl: string,
): OriginResolution {
  const unchanged: OriginResolution = {
    url: entered,
    changed: false,
    reason: 'unchanged',
  }

  let enteredUrl: URL
  let finalUrl: URL
  try {
    enteredUrl = new URL(entered)
    finalUrl = new URL(resolvedFinalUrl)
  } catch {
    return unchanged
  }

  for (const u of [enteredUrl, finalUrl]) {
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return unchanged
  }

  // Same origin covers path-only redirects (geo, locale, A/B): leave them alone.
  if (enteredUrl.origin === finalUrl.origin) return unchanged

  // Never downgrade the transport on the researcher's behalf.
  if (enteredUrl.protocol === 'https:' && finalUrl.protocol === 'http:') {
    return unchanged
  }

  const next = new URL(enteredUrl.toString())
  next.protocol = finalUrl.protocol
  next.host = finalUrl.host

  return {
    url: next.toString(),
    changed: true,
    reason: isWwwVariantOrigin(enteredUrl.origin, finalUrl.origin)
      ? 'www-variant'
      : 'cross-origin',
  }
}
