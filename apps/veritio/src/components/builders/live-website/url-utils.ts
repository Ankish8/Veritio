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

/** Extract the path portion from a full URL relative to a base URL */
export function getPathFromUrl(fullUrl: string, baseUrl: string): string {
  if (!fullUrl) return ''
  if (baseUrl && fullUrl.startsWith(baseUrl)) return fullUrl.slice(baseUrl.length)
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
