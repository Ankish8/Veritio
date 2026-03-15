import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { fetchAllRows } from './pagination'
import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'
import { wilsonScoreCI, calculateBoxPlotStats } from '../../lib/algorithms/statistics'
import type { BoxPlotStats } from '../../lib/algorithms/statistics'

type SupabaseClientType = SupabaseClient<Database>

// ============================================================================
// Metrics Types
// ============================================================================

export interface LiveWebsiteTaskMetrics {
  taskId: string
  taskTitle: string
  successRate: number
  avgTimeMs: number
  avgPages: number
  completedCount: number
  abandonedCount: number
  timedOutCount: number
  skippedCount: number
  totalResponses: number
  directSuccessCount: number
  indirectSuccessCount: number
  selfReportedCount: number
  directSuccessRate: number
  indirectSuccessRate: number
  selfReportedRate: number
  avgClicks: number
  responseTimes: number[]
  successCI: { lowerBound: number; upperBound: number } | null
  timeBoxPlot: BoxPlotStats | null
  lastPageUrls: { participantId: string; pageUrl: string; status: string }[]
}

export interface LiveWebsiteMetrics {
  totalParticipants: number
  completedParticipants: number
  averageCompletionTimeMs: number
  participantTaskTimes: number[]
  usabilityScore: number
  overallSuccessRate: number
  overallAbandonRate: number
  overallDirectSuccessRate: number
  overallIndirectSuccessRate: number
  overallSelfReportedRate: number
  avgTimePerTask: number
  avgPagesPerTask: number
  totalEvents: number
  totalRageClicks: number
  taskMetrics: LiveWebsiteTaskMetrics[]
}

// ============================================================================
// Overview Data Shape
// ============================================================================

export interface LiveWebsiteVariant {
  id: string
  name: string
  url: string
  weight: number
  position: number
}

export interface LiveWebsiteOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'live_website_test'
    status: string | null
    share_code: string | null
    settings: unknown
    launched_at: string | null
    created_at: string | null
  }
  tasks: unknown[]
  responses: unknown[]
  postTaskResponses: unknown[]
  events: unknown[]
  participants: unknown[]
  metrics: LiveWebsiteMetrics
  flowQuestions: unknown[]
  flowResponses: unknown[]
  variants: LiveWebsiteVariant[]
}

// ============================================================================
// Metrics Helpers
// ============================================================================

// Direct = followed exact defined path OR navigated straight to target URL
const DIRECT_METHODS = new Set(['auto_path_direct', 'auto_url_direct'])
// Indirect = reached goal via different route
const INDIRECT_METHODS = new Set(['auto_url', 'auto_url_indirect', 'auto_path', 'auto_path_indirect'])

function countCompletionMethods(resps: any[]) {
  let direct = 0, indirect = 0, selfReported = 0
  for (const r of resps) {
    if (r.status !== 'completed') continue
    if (DIRECT_METHODS.has(r.completion_method)) direct++
    else if (INDIRECT_METHODS.has(r.completion_method)) indirect++
    else selfReported++ // self_reported or no method
  }
  return { direct, indirect, selfReported }
}

function countStatuses(resps: any[]) {
  let completed = 0, abandoned = 0, timedOut = 0, skipped = 0
  for (const r of resps) {
    if (r.status === 'completed') completed++
    else if (r.status === 'abandoned') abandoned++
    else if (r.status === 'timed_out') timedOut++
    else if (r.status === 'skipped') skipped++
  }
  return { completed, abandoned, timedOut, skipped }
}

function safeAvg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

// ============================================================================
// Metrics Computation
// ============================================================================

export function computeLiveWebsiteMetrics(
  tasks: any[],
  responses: any[],
  events: any[],
  participants: any[],
  trackingMode?: string
): LiveWebsiteMetrics {
  const totalParticipants = participants.length
  const completedParticipants = participants.filter((p: any) => p.status === 'completed').length

  // Per-participant completion time — prefer response-based durations, fall back to participant timestamps
  const participantDurations = new Map<string, number>()
  for (const r of responses) {
    if (r.duration_ms > 0 && r.participant_id) {
      participantDurations.set(r.participant_id, (participantDurations.get(r.participant_id) || 0) + r.duration_ms)
    }
  }

  const participantTaskTimes: number[] = []
  for (const p of participants) {
    if (p.status !== 'completed') continue
    const responseDuration = participantDurations.get(p.id)
    if (responseDuration && responseDuration > 0) {
      participantTaskTimes.push(responseDuration)
    } else if (p.started_at && p.completed_at) {
      participantTaskTimes.push(new Date(p.completed_at).getTime() - new Date(p.started_at).getTime())
    }
  }
  const averageCompletionTimeMs = safeAvg(participantTaskTimes)

  // Overall status and completion method counts
  const totalResponses = responses.length
  const statusCounts = countStatuses(responses)
  const overallSuccessRate = totalResponses > 0 ? statusCounts.completed / totalResponses : 0
  const overallAbandonRate = totalResponses > 0 ? statusCounts.abandoned / totalResponses : 0

  const methodCounts = countCompletionMethods(responses)
  const overallDirectSuccessRate = totalResponses > 0 ? methodCounts.direct / totalResponses : 0
  const overallIndirectSuccessRate = totalResponses > 0 ? methodCounts.indirect / totalResponses : 0
  const overallSelfReportedRate = totalResponses > 0 ? methodCounts.selfReported / totalResponses : 0

  // Avg time per task (across all responses)
  const responseTimes = responses.filter((r: any) => r.duration_ms > 0).map((r: any) => r.duration_ms)
  const avgTimePerTask = safeAvg(responseTimes)

  // Event-based metrics — accept both 'page_view' (snippet emits) and 'navigation' (legacy)
  const navigationEvents: any[] = []
  let totalRageClicks = 0
  const clickEvents: any[] = []
  for (const e of events) {
    if (e.event_type === 'page_view' || e.event_type === 'navigation') navigationEvents.push(e)
    else if (e.event_type === 'rage_click') totalRageClicks++
    else if (e.event_type === 'click') clickEvents.push(e)
  }
  const totalEvents = events.length

  // Avg pages per task — group by task_id + session_id, count unique pages per session, then average
  const sessionPages = new Map<string, Set<string>>()
  for (const e of navigationEvents) {
    if (e.task_id && e.session_id) {
      const key = e.task_id + '|' + e.session_id
      const pages = sessionPages.get(key)
      if (pages) pages.add(e.page_url)
      else sessionPages.set(key, new Set([e.page_url]))
    }
  }
  // Group session page counts by task_id
  const taskSessionPageCounts = new Map<string, number[]>()
  for (const [key, pages] of sessionPages) {
    const taskId = key.split('|')[0]
    const counts = taskSessionPageCounts.get(taskId)
    if (counts) counts.push(pages.size)
    else taskSessionPageCounts.set(taskId, [pages.size])
  }
  // Overall avg pages per task (average of per-session averages across all tasks)
  const taskPageAverages = [...taskSessionPageCounts.values()]
    .filter(counts => counts.length > 0)
    .map(counts => safeAvg(counts))
  const avgPagesPerTask = safeAvg(taskPageAverages)

  // Usability Score (0-100)
  // url_only: 40% success + 30% time efficiency + 30% error avoidance
  // snippet/reverse_proxy: 25% direct + 15% indirect + 30% time + 30% error
  let usabilityScore = 0
  if (totalResponses > 0) {
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    const timeScore = avgTimePerTask > 0 ? clamp(100 - (avgTimePerTask / 120000 * 100)) : 100
    const errorScore = clamp(100 - (overallAbandonRate * 100))

    usabilityScore = trackingMode === 'url_only'
      ? Math.round(0.4 * overallSuccessRate * 100 + 0.3 * timeScore + 0.3 * errorScore)
      : Math.round(0.25 * overallDirectSuccessRate * 100 + 0.15 * overallIndirectSuccessRate * 100 + 0.3 * timeScore + 0.3 * errorScore)
  }

  // Pre-compute per-task click counts grouped by participant
  const taskParticipantClicks = new Map<string, Map<string, number>>()
  for (const e of clickEvents) {
    if (e.task_id && e.participant_id) {
      let participantMap = taskParticipantClicks.get(e.task_id)
      if (!participantMap) {
        participantMap = new Map()
        taskParticipantClicks.set(e.task_id, participantMap)
      }
      participantMap.set(e.participant_id, (participantMap.get(e.participant_id) || 0) + 1)
    }
  }

  // Pre-compute last navigation event per participant per task (for lastPageUrls)
  const lastNavByParticipantTask = new Map<string, { pageUrl: string; timestamp: string }>()
  for (const e of navigationEvents) {
    if (e.task_id && e.participant_id && e.page_url) {
      const key = `${e.task_id}|${e.participant_id}`
      const existing = lastNavByParticipantTask.get(key)
      if (!existing || e.timestamp > existing.timestamp) {
        lastNavByParticipantTask.set(key, { pageUrl: e.page_url, timestamp: e.timestamp })
      }
    }
  }

  // Build sets for abandoned participant derivation
  // Participants marked as 'abandoned' by cron but with no response row for a task
  // should count as abandoned for that task
  const abandonedParticipantIds = new Set(
    participants.filter((p: any) => p.status === 'abandoned').map((p: any) => p.id)
  )
  const responsesByTask = new Map<string, Set<string>>()
  for (const r of responses) {
    if (r.task_id && r.participant_id) {
      let ids = responsesByTask.get(r.task_id)
      if (!ids) {
        ids = new Set()
        responsesByTask.set(r.task_id, ids)
      }
      ids.add(r.participant_id)
    }
  }

  // Per-task metrics
  const taskMetrics: LiveWebsiteTaskMetrics[] = tasks.map((task: any) => {
    const taskResps = responses.filter((r: any) => r.task_id === task.id)
    const statuses = countStatuses(taskResps)
    const methods = countCompletionMethods(taskResps)

    // Response-level abandoned + participants abandoned by cron with no response for this task
    const taskRespIds = responsesByTask.get(task.id) || new Set<string>()
    const derivedAbandoned = [...abandonedParticipantIds].filter(pid => !taskRespIds.has(pid)).length
    const taskAbandoned = statuses.abandoned + derivedAbandoned
    const taskTotal = taskResps.length + derivedAbandoned

    const taskTimes = taskResps.filter((r: any) => r.duration_ms > 0).map((r: any) => r.duration_ms as number)

    // Avg clicks per participant for this task
    const clickMap = taskParticipantClicks.get(task.id)
    const avgClicks = clickMap && clickMap.size > 0
      ? [...clickMap.values()].reduce((a, b) => a + b, 0) / clickMap.size
      : 0

    // Last page URL per participant for this task
    const lastPageUrls = taskResps
      .map((r: any) => {
        const navData = lastNavByParticipantTask.get(`${task.id}|${r.participant_id}`)
        return navData ? { participantId: r.participant_id, pageUrl: navData.pageUrl, status: r.status } : null
      })
      .filter(Boolean) as { participantId: string; pageUrl: string; status: string }[]

    const rate = (n: number) => taskTotal > 0 ? n / taskTotal : 0

    return {
      taskId: task.id,
      taskTitle: task.title,
      successRate: rate(statuses.completed),
      avgTimeMs: safeAvg(taskTimes),
      avgPages: safeAvg(taskSessionPageCounts.get(task.id) || []),
      completedCount: statuses.completed,
      abandonedCount: taskAbandoned,
      timedOutCount: statuses.timedOut,
      skippedCount: statuses.skipped,
      totalResponses: taskTotal,
      directSuccessCount: methods.direct,
      indirectSuccessCount: methods.indirect,
      selfReportedCount: methods.selfReported,
      directSuccessRate: rate(methods.direct),
      indirectSuccessRate: rate(methods.indirect),
      selfReportedRate: rate(methods.selfReported),
      avgClicks,
      responseTimes: taskTimes,
      successCI: taskTotal > 0 ? wilsonScoreCI(statuses.completed, taskTotal) : null,
      timeBoxPlot: taskTimes.length > 1 ? calculateBoxPlotStats(taskTimes) : null,
      lastPageUrls,
    }
  })

  return {
    totalParticipants,
    completedParticipants,
    averageCompletionTimeMs,
    participantTaskTimes,
    usabilityScore,
    overallSuccessRate,
    overallAbandonRate,
    overallDirectSuccessRate,
    overallIndirectSuccessRate,
    overallSelfReportedRate,
    avgTimePerTask,
    avgPagesPerTask,
    totalEvents,
    totalRageClicks,
    taskMetrics,
  }
}

// ============================================================================
// Variant-Aware Metrics
// ============================================================================

/**
 * Compute metrics filtered to a specific variant.
 * Returns same shape as computeLiveWebsiteMetrics.
 */
export function computeVariantMetrics(
  variantId: string | null,
  tasks: any[],
  responses: any[],
  events: any[],
  participants: any[],
  trackingMode?: string
): LiveWebsiteMetrics {
  if (!variantId) {
    // Aggregate: use all responses
    return computeLiveWebsiteMetrics(tasks, responses, events, participants, trackingMode)
  }
  // Filter to this variant only
  const filteredResponses = responses.filter((r: any) => r.variant_id === variantId)
  const filteredParticipantIds = new Set(filteredResponses.map((r: any) => r.participant_id))
  const filteredParticipants = participants.filter((p: any) => filteredParticipantIds.has(p.id))
  const filteredEvents = events.filter((e: any) =>
    !e.participant_id || filteredParticipantIds.has(e.participant_id)
  )
  return computeLiveWebsiteMetrics(tasks, filteredResponses, filteredEvents, filteredParticipants, trackingMode)
}

// ============================================================================
// Overview Service (SSR - fast initial load)
// ============================================================================

const liveWebsiteResultsService = createResultsService({
  studyType: 'live_website_test',

  fetchSmallTables: async (supabase, studyId) => {
    const [tasksResult, screenshotsResult] = await Promise.all([
      (supabase
        .from('live_website_tasks' as any) as any)
        .select('*')
        .eq('study_id', studyId)
        .order('order_position'),
      (supabase
        .from('live_website_page_screenshots' as any) as any)
        .select('*')
        .eq('study_id', studyId)
        .order('captured_at'),
    ])

    return {
      tasks: tasksResult.data || [],
      screenshots: screenshotsResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => {
    const [responses, postTaskResponses, events] = await Promise.all([
      fetchAllRows<any>(supabase, 'live_website_responses' as any, studyId, { cursorColumn: 'id' }),
      fetchAllRows<any>(supabase, 'live_website_post_task_responses' as any, studyId, { cursorColumn: 'id' }),
      fetchAllRows<any>(supabase, 'live_website_events' as any, studyId, { cursorColumn: 'id' }),
    ])

    return {
      responses,
      postTaskResponses,
      events,
    }
  },

  computeAnalysis: async (data) => {
    const settings = data.study.settings as Record<string, unknown> | null
    const trackingMode = (settings?.mode as string) || 'url_only'
    return computeLiveWebsiteMetrics(
      data.tasks as any[],
      data.responses as any[],
      (data as any).events || [],
      data.participants as any[],
      trackingMode
    )
  },
})

export async function getLiveWebsiteOverview(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<LiveWebsiteOverviewData>> {
  const [result, variantsResult, participantVariantsResult] = await Promise.all([
    liveWebsiteResultsService.getOverview(supabase, studyId),
    (supabase.from('live_website_variants' as any) as any)
      .select('id, name, url, weight, position')
      .eq('study_id', studyId)
      .order('position'),
    (supabase.from('live_website_participant_variants' as any) as any)
      .select('participant_id, variant_id')
      .eq('study_id', studyId),
  ])

  if (result.data) {
    return {
      data: {
        ...result.data,
        postTaskResponses: (result.data as any).postTaskResponses || [],
        events: (result.data as any).events || [],
        metrics: result.data.analysis as LiveWebsiteMetrics,
        screenshots: (result.data as any).screenshots || [],
        variants: variantsResult.data || [],
        participantVariants: participantVariantsResult.data || [],
        analysis: undefined,
      } as any,
      error: null,
    }
  }

  return result as unknown as ServiceResult<LiveWebsiteOverviewData>
}
