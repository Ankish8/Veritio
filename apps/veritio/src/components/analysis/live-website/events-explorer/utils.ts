import type {
  LiveWebsiteEvent,
  LiveWebsiteTask,
  LiveWebsiteResponse,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

// ── Types ──

export interface PageStats {
  pageUrl: string
  visits: number
  clicks: number
  rageClicks: number
  avgScrollDepth: number | null
  frictionScore: number
  frictionLevel: 'low' | 'medium' | 'high'
  uniqueParticipants: number
}

export interface RageClickElement {
  elementSelector: string
  label: string
  pageUrl: string
  count: number
  uniqueParticipants: number
}

export interface TimelineSegment {
  taskId: string | null
  taskTitle: string | null
  outcome: string | null
  events: TimelineEvent[]
}

export interface TimelineEvent {
  id: string
  eventType: string
  timestamp: string
  pageUrl: string | null
  elementSelector: string | null
  metadata: Record<string, unknown> | null
  /** For collapsed events, how many originals were merged */
  count: number
  /** For scroll events, the max depth reached */
  scrollDepth: number | null
}

export interface MetadataEntry {
  key: string
  value: string
}

// ── Helpers ──

export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

const TRACKING_PARAMS = new Set([
  '__sess', '__api', '__variant', '__optimal', '__study',
  '__veritio_share', '__veritio_session', '__veritio_study',
  '_veritio_share', '_veritio_session', '_veritio_study',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
])

/** Strip tracking/session query params from a URL, returning just path + clean params */
export function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key) || key.startsWith('__veritio')) u.searchParams.delete(key)
    }
    const qs = u.searchParams.toString()
    return `${u.pathname}${qs ? `?${qs}` : ''}` || '/'
  } catch {
    return raw
  }
}

export function truncateUrl(url: string, maxLen: number): string {
  const cleaned = cleanUrl(url)
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen - 3) + '...'
}

export function truncateStr(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function getScrollDepth(metadata: Record<string, unknown> | null): number | null {
  if (!metadata) return null
  const depth = metadata.scrollPercentage ?? metadata.scroll_depth ?? metadata.scrollDepth
  return typeof depth === 'number' ? depth : null
}

export function getClickLabel(metadata: Record<string, unknown> | null, selector: string | null): string {
  if (metadata?.elementText) return `"${metadata.elementText}"`
  if (metadata?.elementAriaLabel) return `"${metadata.elementAriaLabel}"`
  if (selector) return parseElementLabel(selector)
  return 'element'
}

export function parseElementLabel(selector: string): string {
  // ID selectors: #add-to-cart -> "Add to Cart"
  const idMatch = selector.match(/#([\w-]+)/)
  if (idMatch) {
    return humanize(idMatch[1])
  }

  // Class selectors: .btn.submit -> "Submit"
  // Filter out Tailwind utility classes (px-4, w-full, h-6, text-sm, bg-white, etc.)
  const TAILWIND_PATTERN = /^(p[xytblr]?|m[xytblr]?|w|h|min-[wh]|max-[wh]|gap|top|right|bottom|left|inset|z|text|bg|border|rounded|shadow|opacity|flex|grid|block|inline|hidden|overflow|absolute|relative|fixed|sticky|col|row|items|justify|self|place|space|divide|ring|outline|font|leading|tracking|whitespace|break|truncate|sr|transition|duration|delay|ease|animate|scale|rotate|translate|skew|origin|cursor|select|resize|appearance|fill|stroke)-/
  const classes = selector.match(/\.([\w-]+)/g)
  if (classes?.length) {
    const UTILITY_CLASSES = new Set(['btn', 'button', 'container', 'wrapper', 'inner', 'outer', 'flex', 'grid', 'block', 'inline', 'hidden', 'relative', 'absolute', 'fixed', 'sticky'])
    const meaningful = classes
      .map(c => c.slice(1))
      .filter(c => !UTILITY_CLASSES.has(c) && !TAILWIND_PATTERN.test(c))
    if (meaningful.length > 0) {
      return humanize(meaningful[meaningful.length - 1])
    }
  }

  // Tag selectors: button, a, input
  const tagMatch = selector.match(/^(\w+)/)
  if (tagMatch) return `<${tagMatch[1]}>`

  return selector
}

// ── Computation functions ──

export function computePageStats(events: LiveWebsiteEvent[]): PageStats[] {
  const pageMap = new Map<string, {
    visits: number
    clicks: number
    rageClicks: number
    scrollDepths: number[]
    participants: Set<string>
  }>()

  for (const event of events) {
    if (!event.page_url) continue

    let entry = pageMap.get(event.page_url)
    if (!entry) {
      entry = { visits: 0, clicks: 0, rageClicks: 0, scrollDepths: [], participants: new Set() }
      pageMap.set(event.page_url, entry)
    }

    if (event.participant_id) entry.participants.add(event.participant_id)

    switch (event.event_type) {
      case 'navigation':
      case 'page_view':
        entry.visits++
        break
      case 'click':
        entry.clicks++
        break
      case 'rage_click':
        entry.rageClicks++
        break
      case 'scroll': {
        const depth = getScrollDepth(event.metadata)
        if (depth !== null) entry.scrollDepths.push(depth)
        break
      }
    }
  }

  const results: PageStats[] = []
  for (const [pageUrl, data] of pageMap) {
    const avgScrollDepth = data.scrollDepths.length > 0
      ? Math.round(data.scrollDepths.reduce((a, b) => a + b, 0) / data.scrollDepths.length)
      : null
    const frictionScore = computeFrictionScore(data.rageClicks, avgScrollDepth, data.visits)
    results.push({
      pageUrl,
      visits: data.visits,
      clicks: data.clicks,
      rageClicks: data.rageClicks,
      avgScrollDepth,
      frictionScore,
      frictionLevel: frictionScore <= 20 ? 'low' : frictionScore <= 40 ? 'medium' : 'high',
      uniqueParticipants: data.participants.size,
    })
  }

  results.sort((a, b) => b.frictionScore - a.frictionScore)
  return results
}

export function computeFrictionScore(
  rageClicks: number,
  avgScrollDepth: number | null,
  visits: number,
): number {
  if (visits === 0) return 0

  const rageScore = Math.min(50, Math.round((rageClicks / visits) * 100))
  const scrollPenalty = avgScrollDepth !== null
    ? Math.max(0, Math.min(50, Math.round((1 - avgScrollDepth / 100) * 50)))
    : 0

  return rageScore + scrollPenalty
}

export function computeRageClicksByElement(events: LiveWebsiteEvent[]): RageClickElement[] {
  const elementMap = new Map<string, {
    pageUrlCounts: Map<string, number>
    count: number
    participants: Set<string>
  }>()

  for (const event of events) {
    if (event.event_type !== 'rage_click' || !event.element_selector) continue

    let entry = elementMap.get(event.element_selector)
    if (!entry) {
      entry = { pageUrlCounts: new Map(), count: 0, participants: new Set() }
      elementMap.set(event.element_selector, entry)
    }

    entry.count++
    if (event.participant_id) entry.participants.add(event.participant_id)
    if (event.page_url) {
      entry.pageUrlCounts.set(event.page_url, (entry.pageUrlCounts.get(event.page_url) || 0) + 1)
    }
  }

  const results: RageClickElement[] = []
  for (const [selector, data] of elementMap) {
    results.push({
      elementSelector: selector,
      label: parseElementLabel(selector),
      pageUrl: getMostFrequent(data.pageUrlCounts) ?? '',
      count: data.count,
      uniqueParticipants: data.participants.size,
    })
  }

  results.sort((a, b) => b.count - a.count)
  return results
}

export function buildParticipantTimeline(
  participantId: string,
  events: LiveWebsiteEvent[],
  tasks: LiveWebsiteTask[],
  responses: LiveWebsiteResponse[],
): TimelineSegment[] {
  const pEvents = events
    .filter(e => e.participant_id === participantId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const responseMap = new Map(
    responses
      .filter(r => r.participant_id === participantId)
      .map(r => [r.task_id, r])
  )

  // Group events by task_id
  const groups = new Map<string | null, LiveWebsiteEvent[]>()
  for (const event of pEvents) {
    const existing = groups.get(event.task_id) || []
    existing.push(event)
    groups.set(event.task_id, existing)
  }

  const segments: TimelineSegment[] = []

  // Tasks in order_position first
  const orderedTaskIds = tasks
    .sort((a, b) => a.order_position - b.order_position)
    .map(t => t.id)

  for (const taskId of orderedTaskIds) {
    const taskEvents = groups.get(taskId)
    if (!taskEvents?.length) continue

    const task = taskMap.get(taskId)
    const response = responseMap.get(taskId)
    segments.push({
      taskId,
      taskTitle: task?.title || 'Task',
      outcome: response?.status || null,
      events: collapseConsecutiveEvents(taskEvents),
    })
  }

  // "Between tasks" segment for events with null task_id
  const nullEvents = groups.get(null)
  if (nullEvents?.length) {
    segments.push({
      taskId: null,
      taskTitle: 'Between Tasks',
      outcome: null,
      events: collapseConsecutiveEvents(nullEvents),
    })
  }

  return segments
}

export function collapseConsecutiveEvents(events: LiveWebsiteEvent[]): TimelineEvent[] {
  const result: TimelineEvent[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Collapse consecutive scrolls on same page
    if (event.event_type === 'scroll') {
      let maxDepth = getScrollDepth(event.metadata)
      let count = 1
      while (i + 1 < events.length && events[i + 1].event_type === 'scroll' && events[i + 1].page_url === event.page_url) {
        i++
        count++
        const d = getScrollDepth(events[i].metadata)
        if (d !== null && (maxDepth === null || d > maxDepth)) maxDepth = d
      }
      result.push(toTimelineEvent(event, count, maxDepth))
      continue
    }

    // Collapse consecutive clicks on same element
    if (event.event_type === 'click' && event.element_selector) {
      let count = 1
      while (i + 1 < events.length && events[i + 1].event_type === 'click' && events[i + 1].element_selector === event.element_selector && events[i + 1].page_url === event.page_url) {
        i++
        count++
      }
      result.push(toTimelineEvent(event, count, null))
      continue
    }

    result.push(toTimelineEvent(event, 1, event.event_type === 'scroll' ? getScrollDepth(event.metadata) : null))
  }

  return result
}

// ── Internal helpers ──

function toTimelineEvent(event: LiveWebsiteEvent, count: number, scrollDepth: number | null): TimelineEvent {
  return {
    id: event.id,
    eventType: event.event_type,
    timestamp: event.timestamp,
    pageUrl: event.page_url,
    elementSelector: event.element_selector,
    metadata: event.metadata,
    count,
    scrollDepth,
  }
}

function humanize(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function getMostFrequent(counts: Map<string, number>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      best = key
    }
  }
  return best
}
