/**
 * Auto-detect path segments that are likely dynamic IDs (4+ digit numbers).
 * Returns 0-based indices into pathname.split('/').
 */
export function autoDetectWildcardSegments(pathname: string): number[] {
  const pathOnly = pathname.split('?')[0]
  const segments = pathOnly.split('/')
  const indices: number[] = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    // Purely numeric IDs (e.g. 12345, 9876543)
    if (/^\d{4,}$/.test(seg)) {
      indices.push(i)
      continue
    }
    // Alphanumeric slugs that contain both letters and digits (e.g. mmd7jwjw, abc123, 4f8a9c2b)
    // Must be 6+ chars to avoid false-positives on short version strings like "v2" or "api2"
    if (seg.length >= 6 && /^[a-zA-Z0-9_-]+$/.test(seg) && /\d/.test(seg) && /[a-zA-Z]/.test(seg)) {
      indices.push(i)
    }
  }
  return indices
}

/**
 * Extract query parameters from a pathname/URL string.
 * Returns array of {key, value} pairs preserving order.
 */
export function extractQueryParams(pathname: string): { key: string; value: string }[] {
  const qIdx = pathname.indexOf('?')
  if (qIdx === -1) return []
  const search = pathname.slice(qIdx + 1).split('#')[0] // strip hash
  if (!search) return []
  return search.split('&').filter(Boolean).map((pair) => {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) return { key: pair, value: '' }
    return { key: pair.slice(0, eqIdx), value: decodeURIComponent(pair.slice(eqIdx + 1)) }
  })
}

/**
 * Auto-detect wildcard params — returns ALL param keys (default = wildcard everything).
 * This preserves backward compatibility: by default, all params are wildcarded.
 */
export function autoDetectWildcardParams(pathname: string): string[] {
  return extractQueryParams(pathname).map((p) => p.key)
}

/**
 * Replace wildcarded segments with '*' for display purposes.
 * Optionally replaces wildcarded query param values with '*' too.
 */
export function applyWildcards(pathname: string, wildcardSegments: number[], wildcardParams?: string[]): string {
  const qIdx = pathname.indexOf('?')
  const pathOnly = qIdx === -1 ? pathname : pathname.slice(0, qIdx)
  const segments = pathOnly.split('/')
  for (const idx of wildcardSegments) {
    if (idx < segments.length) segments[idx] = '*'
  }
  const basePath = segments.join('/')

  // If no query string, return path only
  if (qIdx === -1) return basePath

  // If wildcardParams not provided, keep query string as-is
  if (!wildcardParams) return basePath + pathname.slice(qIdx)

  // Replace wildcarded param values with '*'
  const params = extractQueryParams(pathname)
  if (params.length === 0) return basePath

  const paramStr = params.map((p) =>
    wildcardParams.includes(p.key) ? `${p.key}=*` : `${p.key}=${encodeURIComponent(p.value)}`
  ).join('&')
  return basePath + '?' + paramStr
}

/**
 * Compare actual pathname against a recorded pathname, treating wildcardSegments as wildcards.
 * Query param matching:
 * - wildcardParams undefined → ignore all query params (backward compat)
 * - wildcardParams defined → non-wildcarded recorded params must exist in actual with exact value
 * Falls back to exact match when wildcardSegments is empty and wildcardParams is undefined.
 */
export function pathnameMatchesWithWildcards(
  actual: string,
  recorded: string,
  wildcardSegments: number[],
  wildcardParams?: string[]
): boolean {
  if (actual === recorded) return true

  const aQ = actual.indexOf('?')
  const rQ = recorded.indexOf('?')
  const aPath = (aQ === -1 ? actual : actual.slice(0, aQ)).split('#')[0]
  const rPath = (rQ === -1 ? recorded : recorded.slice(0, rQ)).split('#')[0]

  // Compare path segments
  const aSegs = aPath.split('/')
  const rSegs = rPath.split('/')
  if (aSegs.length !== rSegs.length) return false
  for (let i = 0; i < rSegs.length; i++) {
    if (wildcardSegments.includes(i)) continue
    if (rSegs[i] !== aSegs[i]) return false
  }

  // Query param matching
  if (wildcardParams === undefined) {
    // Backward compat: ignore all query params
    return true
  }

  // Check non-wildcarded recorded params exist in actual with exact value
  const rParams = extractQueryParams(recorded)
  const aParams = extractQueryParams(actual)
  const aParamMap = new Map(aParams.map((p) => [p.key, p.value]))

  for (const rp of rParams) {
    if (wildcardParams.includes(rp.key)) continue // wildcarded — any value OK
    const actualVal = aParamMap.get(rp.key)
    if (actualVal === undefined || actualVal !== rp.value) return false
  }

  return true
}
