import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { normalizeToPercent } from '../../lib/analytics/coordinate-normalization'
import { fetchAllByRange } from './pagination'
import type {
  ClickEventData,
  FrameWithStats,
  ClickEventFilters,
  PageVisitFilter,
  ClickEventsResponse,
} from '../../types/analytics'

type SupabaseClientType = SupabaseClient<Database>

const CLICK_EVENTS_STATS_COLUMNS = 'frame_id, was_hotspot, session_id' as const

const CLICK_EVENTS_FULL_COLUMNS = `
  id, task_id, frame_id, session_id, x, y, timestamp,
  was_hotspot, triggered_transition, time_since_frame_load_ms,
  component_states,
  prototype_test_sessions!inner(participant_id)
` as const

interface RawClickRow {
  id: string
  task_id: string
  frame_id: string
  session_id: string
  x: number
  y: number
  timestamp: string | null
  was_hotspot: boolean | null
  triggered_transition: boolean | null
  time_since_frame_load_ms: number | null
  component_states: unknown
  prototype_test_sessions: { participant_id: string } | null
}

export async function getClickEventsForStudy(
  supabase: SupabaseClientType,
  studyId: string,
  filters: ClickEventFilters
): Promise<{ data: ClickEventsResponse | null; error: Error | null }> {
  const { data: frames, error: framesError } = await supabase
    .from('prototype_test_frames')
    .select('id, name, thumbnail_url, width, height, study_id')
    .eq('study_id', studyId)
    .order('position')

  if (framesError) {
    return { data: null, error: new Error(`Failed to fetch frames: ${framesError.message}`) }
  }

  const frameMap = new Map(frames?.map(f => [f.id, f]) || [])

  // Both of these are drained page by page. A bare select silently stops at
  // PostgREST's 1000-row cap, so every click map for a study with real traffic
  // was rendering a truncated, arbitrary slice of the data.
  const { data: rawClicks, error: clicksError } = await fetchAllByRange<RawClickRow>(
    (from, to) => {
      let q = supabase
        .from('prototype_test_click_events')
        .select(CLICK_EVENTS_FULL_COLUMNS)
        .eq('study_id', studyId)

      if (filters.taskId) q = q.eq('task_id', filters.taskId)
      if (filters.frameId) q = q.eq('frame_id', filters.frameId)
      if (filters.participantId) {
        q = q.eq('prototype_test_sessions.participant_id', filters.participantId)
      }

      return q
        .order('timestamp', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    },
    undefined,
    'prototype_test_click_events'
  )

  if (clicksError) {
    return { data: null, error: new Error(`Failed to fetch clicks: ${clicksError.message}`) }
  }

  // Scoped to the same task as the clicks. Without the task filter, visits to
  // the same frame during *other* tasks were counted here, inflating every
  // click's pageVisitNumber and mis-bucketing the "first/second visit" filters.
  const { data: navEvents } = await fetchAllByRange<{
    session_id: string
    to_frame_id: string
    timestamp: string | null
  }>(
    (from, to) => {
      let q = supabase
        .from('prototype_test_navigation_events')
        .select('session_id, to_frame_id, timestamp')
        .eq('study_id', studyId)

      if (filters.taskId) q = q.eq('task_id', filters.taskId)

      return q
        .order('timestamp', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    },
    undefined,
    'prototype_test_navigation_events'
  )

  const visitTimestamps = new Map<string, string[]>()
  for (const nav of navEvents || []) {
    if (!nav.timestamp) continue // Skip entries without timestamp
    const key = `${nav.session_id}-${nav.to_frame_id}`
    const visits = visitTimestamps.get(key) || []
    visits.push(nav.timestamp)
    visitTimestamps.set(key, visits)
  }

  const clicksWithVisitNumber = (rawClicks || []).map(click => {
    const key = `${click.session_id}-${click.frame_id}`
    const visits = visitTimestamps.get(key) || []

    let pageVisitNumber = 1
    for (let i = 0; i < visits.length; i++) {
      if (click.timestamp && click.timestamp >= visits[i]) {
        pageVisitNumber = i + 1
      }
    }

    return { ...click, pageVisitNumber }
  })

  const filteredClicks = filterByPageVisit(clicksWithVisitNumber, filters.pageVisit)

  const clicks = filteredClicks.map(click => {
    const frame = frameMap.get(click.frame_id)
    const { normalizedX, normalizedY } = normalizeToPercent(
      click.x,
      click.y,
      frame?.width || 1920,
      frame?.height || 1080
    )

    const session = click.prototype_test_sessions as { participant_id: string } | null

    return {
      id: click.id,
      taskId: click.task_id,
      frameId: click.frame_id,
      sessionId: click.session_id,
      participantId: session?.participant_id || '',
      x: click.x,
      y: click.y,
      normalizedX,
      normalizedY,
      timestamp: click.timestamp || new Date().toISOString(),
      wasHotspot: click.was_hotspot || false,
      triggeredTransition: click.triggered_transition || false,
      timeSinceFrameLoadMs: click.time_since_frame_load_ms || undefined,
      pageVisitNumber: click.pageVisitNumber,
      componentStates: (click.component_states as Record<string, string>) || undefined,
    }
  })

  const frameStats = await calculateFrameStats(supabase, studyId, frames || [], filters)

  let taskInfo: ClickEventsResponse['taskInfo'] = null
  if (filters.taskId) {
    const { data: task } = await supabase
      .from('prototype_test_tasks')
      .select('id, title, start_frame_id, success_frame_ids')
      .eq('id', filters.taskId)
      .single()

    if (task) {
      taskInfo = {
        taskId: task.id,
        taskTitle: task.title || '',
        startFrameId: task.start_frame_id,
        successFrameIds: (task.success_frame_ids as string[]) || [],
      }
    }
  }

  return {
    data: {
      clicks: clicks as ClickEventData[],
      frames: frameStats,
      taskInfo,
    },
    error: null,
  }
}

function filterByPageVisit<T extends { pageVisitNumber: number }>(
  clicks: T[],
  filter?: PageVisitFilter
): T[] {
  if (!filter || filter === 'all') return clicks

  switch (filter) {
    case 'first':
      return clicks.filter(c => c.pageVisitNumber === 1)
    case 'second':
      return clicks.filter(c => c.pageVisitNumber === 2)
    case 'third':
      return clicks.filter(c => c.pageVisitNumber === 3)
    case 'fourth_plus':
      return clicks.filter(c => c.pageVisitNumber >= 4)
    default:
      return clicks
  }
}

async function calculateFrameStats(
  supabase: SupabaseClientType,
  studyId: string,
  frames: Array<{
    id: string
    name: string
    thumbnail_url: string | null
    width: number | null
    height: number | null
  }>,
  filters: ClickEventFilters
): Promise<FrameWithStats[]> {
  // Same filters as the click list. These used to ignore `participantId`, so
  // narrowing the click map to one participant still showed study-wide frame
  // stats beside their clicks. Resolving the session id up front is cheaper
  // than an !inner join on both queries — sessions are UNIQUE(participant_id).
  let sessionIdFilter: string | null = null
  if (filters.participantId) {
    const { data: session } = await supabase
      .from('prototype_test_sessions')
      .select('id')
      .eq('study_id', studyId)
      .eq('participant_id', filters.participantId)
      .maybeSingle()

    // No session means the participant has no events; an id that matches
    // nothing is the correct filter, and is what the click list produces too.
    sessionIdFilter = session?.id ?? '00000000-0000-0000-0000-000000000000'
  }

  const { data: clickData } = await fetchAllByRange<{
    frame_id: string
    was_hotspot: boolean | null
    session_id: string
  }>(
    (from, to) => {
      let q = supabase
        .from('prototype_test_click_events')
        .select(CLICK_EVENTS_STATS_COLUMNS)
        .eq('study_id', studyId)

      if (filters.taskId) q = q.eq('task_id', filters.taskId)
      if (sessionIdFilter) q = q.eq('session_id', sessionIdFilter)

      return q.order('id', { ascending: true }).range(from, to)
    },
    undefined,
    'prototype_test_click_events (stats)'
  )

  const { data: navData } = await fetchAllByRange<{
    to_frame_id: string
    from_frame_id: string | null
    session_id: string
    time_on_from_frame_ms: number | null
  }>(
    (from, to) => {
      let q = supabase
        .from('prototype_test_navigation_events')
        .select('to_frame_id, from_frame_id, session_id, time_on_from_frame_ms')
        .eq('study_id', studyId)

      if (filters.taskId) q = q.eq('task_id', filters.taskId)
      if (sessionIdFilter) q = q.eq('session_id', sessionIdFilter)

      return q.order('id', { ascending: true }).range(from, to)
    },
    undefined,
    'prototype_test_navigation_events (stats)'
  )

  const statsMap = new Map<string, {
    pageVisits: number
    uniqueVisitors: Set<string>
    totalClicks: number
    misclickCount: number
    totalTimeMs: number
    timeCount: number
  }>()

  for (const frame of frames) {
    statsMap.set(frame.id, {
      pageVisits: 0,
      uniqueVisitors: new Set(),
      totalClicks: 0,
      misclickCount: 0,
      totalTimeMs: 0,
      timeCount: 0,
    })
  }

  for (const click of clickData || []) {
    const stats = statsMap.get(click.frame_id)
    if (stats) {
      stats.totalClicks++
      if (!click.was_hotspot) stats.misclickCount++
      stats.uniqueVisitors.add(click.session_id)
    }
  }

  for (const nav of navData || []) {
    const toStats = statsMap.get(nav.to_frame_id)
    if (toStats) {
      toStats.pageVisits++
      toStats.uniqueVisitors.add(nav.session_id)
    }

    if (nav.from_frame_id && nav.time_on_from_frame_ms) {
      const fromStats = statsMap.get(nav.from_frame_id)
      if (fromStats) {
        fromStats.totalTimeMs += nav.time_on_from_frame_ms
        fromStats.timeCount++
      }
    }
  }

  let startFrameId: string | null = null
  let successFrameIds: string[] = []

  if (filters.taskId) {
    const { data: task } = await supabase
      .from('prototype_test_tasks')
      .select('start_frame_id, success_frame_ids')
      .eq('id', filters.taskId)
      .single()

    if (task) {
      startFrameId = task.start_frame_id
      successFrameIds = (task.success_frame_ids as string[]) || []
    }
  }

  // A task's starting screen is shown to every participant but is never
  // *navigated to*, so it produces no navigation event and read as 0 visits —
  // making the one screen everyone saw look like the least-visited in the
  // study. Count one visit per session that produced any event for this task.
  if (startFrameId) {
    const startStats = statsMap.get(startFrameId)
    if (startStats) {
      const sessionsOnTask = new Set<string>()
      for (const click of clickData || []) sessionsOnTask.add(click.session_id)
      for (const nav of navData || []) sessionsOnTask.add(nav.session_id)

      for (const sessionId of sessionsOnTask) {
        startStats.pageVisits++
        startStats.uniqueVisitors.add(sessionId)
      }
    }
  }

  return frames.map(frame => {
    const stats = statsMap.get(frame.id)!
    return {
      id: frame.id,
      name: frame.name,
      thumbnailUrl: frame.thumbnail_url,
      frameWidth: frame.width,
      frameHeight: frame.height,
      pageVisits: stats.pageVisits,
      uniqueVisitors: stats.uniqueVisitors.size,
      totalClicks: stats.totalClicks,
      misclickCount: stats.misclickCount,
      avgTimeMs: stats.timeCount > 0 ? Math.round(stats.totalTimeMs / stats.timeCount) : 0,
      isStartingScreen: frame.id === startFrameId,
      isCorrectDestination: successFrameIds.includes(frame.id),
    }
  })
}
