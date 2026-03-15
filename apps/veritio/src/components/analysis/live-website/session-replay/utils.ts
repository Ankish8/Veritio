export interface ParsedUserAgent {
  browser: string
  os: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet'
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' }

  const has = (s: string) => ua.includes(s)

  // Browser detection (order matters: Edge/Opera before Chrome, Chrome before Safari)
  let browser = 'Unknown'
  if (has('Edg/') || has('Edge/')) browser = 'Edge'
  else if (has('OPR/') || has('Opera')) browser = 'Opera'
  else if (has('Chrome/') && has('Safari/')) browser = 'Chrome'
  else if (has('Firefox/')) browser = 'Firefox'
  else if (has('Safari/')) browser = 'Safari'

  // OS detection
  let os = 'Unknown'
  if (has('Windows')) os = 'Windows'
  else if (has('Mac OS') || has('Macintosh')) os = 'macOS'
  else if (has('Android')) os = 'Android'
  else if (has('iPhone') || has('iPad')) os = 'iOS'
  else if (has('Linux')) os = 'Linux'
  else if (has('CrOS')) os = 'Chrome OS'

  // Device type (fix: original had operator precedence bug with || and &&)
  let deviceType: ParsedUserAgent['deviceType'] = 'Desktop'
  if (has('Mobi') || (has('Android') && has('Mobile'))) {
    deviceType = 'Mobile'
  } else if (has('iPad') || has('Tablet')) {
    deviceType = 'Tablet'
  }

  return { browser, os, deviceType }
}

export function computeDurationFromEvents(events: any[]): number | null {
  if (events.length < 2) return null
  return events.at(-1).timestamp - events[0].timestamp
}

export interface RrwebPage {
  url: string
  timestamp: number
  width?: number
  height?: number
}

/** Extracts page URLs from rrweb Meta events (type 4) which contain data.href */
export function extractPagesFromRrwebEvents(events: any[]): RrwebPage[] {
  const pages: RrwebPage[] = []
  let lastUrl = ''

  for (const event of events) {
    // rrweb type 4 = Meta event, contains data.href
    if (event.type === 4 && event.data?.href) {
      const url = event.data.href
      if (url !== lastUrl) {
        pages.push({
          url,
          timestamp: event.timestamp,
          width: event.data.width || undefined,
          height: event.data.height || undefined,
        })
        lastUrl = url
      }
    }
  }

  return pages
}

/** Extract viewport dimensions from the first rrweb Meta event (type 4) with valid width/height */
export function extractViewportFromRrwebEvents(events: any[]): { width: number; height: number } | null {
  for (const event of events) {
    if (event.type === 4 && event.data?.width > 0 && event.data?.height > 0) {
      return { width: event.data.width, height: event.data.height }
    }
  }
  return null
}

export interface PageWithDuration {
  url: string
  timestamp: number
  elapsedMs: number
  durationMs: number
}

export function computePageDurations(
  pages: RrwebPage[],
  sessionStartTimestamp: number,
  totalDurationMs: number
): PageWithDuration[] {
  return pages.map((page, i) => {
    const elapsedMs = page.timestamp - sessionStartTimestamp
    const nextTimestamp = i < pages.length - 1 ? pages[i + 1].timestamp : sessionStartTimestamp + totalDurationMs
    const durationMs = nextTimestamp - page.timestamp
    return { url: page.url, timestamp: page.timestamp, elapsedMs, durationMs }
  })
}

export interface RrwebActivityStats {
  clicks: number
  pageViews: number
  scrolls: number
  rageClicks: number
}

/**
 * Derive activity stats directly from rrweb events.
 * rrweb type 3 = IncrementalSnapshot:
 *   source 2 = MouseInteraction (data.type 2 = Click, 4 = DblClick)
 *   source 3 = Scroll
 * rrweb type 4 = Meta (page navigation)
 *
 * Rage clicks: 3+ clicks within 1000ms window
 */
export function extractActivityFromRrwebEvents(events: any[]): RrwebActivityStats {
  let clicks = 0
  let scrolls = 0
  let rageClicks = 0
  const pageUrls = new Set<string>()
  const clickTimestamps: number[] = []

  for (const event of events) {
    // IncrementalSnapshot (type 3)
    if (event.type === 3) {
      const { source, type: interactionType } = event.data ?? {}
      if (source === 2 && (interactionType === 2 || interactionType === 4)) {
        clicks++
        clickTimestamps.push(event.timestamp)
      } else if (source === 3) {
        scrolls++
      }
    // Meta event (type 4) = page navigation
    } else if (event.type === 4 && event.data?.href) {
      pageUrls.add(event.data.href)
    }
  }

  // Rage clicks: 3+ clicks within 1000ms window
  for (let i = 0; i <= clickTimestamps.length - 3; i++) {
    if (clickTimestamps[i + 2] - clickTimestamps[i] <= 1000) {
      rageClicks++
      i += 2 // skip ahead to avoid counting overlapping windows
    }
  }

  return { clicks, pageViews: pageUrls.size, scrolls, rageClicks }
}

/** Extract pathname + search from a URL, falling back to the raw string on parse failure */
export function displayPath(url: string, maxLen?: number): string {
  let path: string
  try {
    const parsed = new URL(url)
    path = parsed.pathname + parsed.search
  } catch {
    path = url
  }
  if (maxLen && path.length > maxLen) {
    return path.slice(0, maxLen - 3) + '...'
  }
  return path
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '--:--'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
