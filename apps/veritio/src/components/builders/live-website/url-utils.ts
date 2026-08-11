/** Check if a URL string is valid */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

/** Ensure URL has a protocol */
export function normalizeUrl(url: string): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

/** Extract the origin from a URL string, returning empty string on failure */
export function extractBaseUrl(url: string): string {
  if (!url) return ''
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).origin
  } catch {
    return ''
  }
}

/**
 * Extract the path portion of a URL (path + query + hash).
 * Returns '/' for a bare origin, '' when the URL is empty or unparseable.
 */
export function extractPathFromUrl(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return ''
  }
}

/** Extract the path portion from a full URL relative to a base URL */
export function getPathFromUrl(fullUrl: string, baseUrl: string): string {
  if (!fullUrl) return ''
  if (baseUrl && fullUrl.startsWith(baseUrl)) {
    // Only a real boundary counts, so https://example.com does not "match"
    // https://example.com.other.test and leave a garbled remainder behind.
    const rest = fullUrl.slice(baseUrl.length)
    if (rest === '' || rest.startsWith('/') || rest.startsWith('?') || rest.startsWith('#')) return rest
  }
  try {
    const url = new URL(fullUrl)
    return url.pathname + url.search + url.hash
  } catch {
    return fullUrl
  }
}

export const VARIANT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
]
