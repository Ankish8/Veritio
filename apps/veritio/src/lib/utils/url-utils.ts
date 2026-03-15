/**
 * Tracking parameters to strip from URLs for normalization.
 * Shared across all live-website analysis views.
 */
const TRACKING_PARAMS = new Set([
  '__sess', '__api', '__variant', '__optimal', '__study',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
])

/**
 * Normalize a page URL by stripping tracking/session query params and hash fragments.
 * Preserves `#modal` suffix to separate modal click data from base page.
 *
 * @param url - Raw page URL (can be full URL or path)
 * @returns Cleaned URL path with optional `#modal` suffix
 */
export function normalizePageUrl(url: string): string {
  const hashIdx = url.indexOf('#')
  const hasModalHash = hashIdx >= 0 && url.slice(hashIdx) === '#modal'
  const noHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url

  const modalSuffix = hasModalHash ? '#modal' : ''

  const qIdx = noHash.indexOf('?')
  if (qIdx < 0) return noHash + modalSuffix

  const base = noHash.slice(0, qIdx)
  const search = noHash.slice(qIdx + 1)
  const kept: string[] = []
  for (const part of search.split('&')) {
    const key = part.split('=')[0]
    if (TRACKING_PARAMS.has(key) || key.startsWith('__veritio') || key.startsWith('_veritio')) continue
    kept.push(part)
  }
  const cleaned = kept.length > 0 ? base + '?' + kept.join('&') : base
  return cleaned + modalSuffix
}
