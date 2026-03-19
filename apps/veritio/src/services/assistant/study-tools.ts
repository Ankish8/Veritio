/**
 * Veritio AI Assistant -- Study Data Tool Handlers
 *
 * Each handler fetches study data using existing result services.
 * Called by the tool executor when the LLM invokes a study data function.
 *
 * IMPORTANT: All result handlers summarize data for the LLM to stay within
 * token limits. Raw per-participant arrays are dropped; pre-computed
 * aggregates and metrics are kept. This prevents the 361k-token overflow
 * that occurred when full result payloads were passed to OpenAI.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudyDataToolName, ToolExecutionResult } from './types'
import {
  getCardSortResults,
  getTreeTestResults,
  getSurveyResults,
  getPrototypeTestResults,
  getFirstClickResults,
  getFirstImpressionResults,
} from '../results/index'
interface StudyToolContext {
  supabase: SupabaseClient
  studyId: string
  studyType: string
  userId?: string
}

/**
 * Route a study data tool call to the appropriate handler.
 */
export async function executeStudyTool(
  toolName: StudyDataToolName,
  args: Record<string, unknown>,
  ctx: StudyToolContext,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'get_study_overview':
      return handleGetStudyOverview(ctx)
    case 'get_task_metrics':
      return handleGetTaskMetrics(ctx, args)
    case 'get_responses':
      return handleGetResponses(ctx, args)
    case 'get_participant_list':
      return handleGetParticipantList(ctx, args)
    case 'get_card_sort_results':
      return handleGetCardSortResults(ctx)
    case 'get_tree_test_results':
      return handleGetTreeTestResults(ctx)
    case 'get_prototype_test_results':
      return handleGetPrototypeTestResults(ctx)
    case 'get_first_click_results':
      return handleGetFirstClickResults(ctx)
    case 'get_first_impression_results':
      return handleGetFirstImpressionResults(ctx)
    case 'get_survey_results':
      return handleGetSurveyResults(ctx)
    case 'get_live_website_results':
      return handleGetLiveWebsiteResults(ctx)
    case 'export_study_data':
      return handleExportStudyData(ctx, args)
    case 'create_export_job':
      return handleCreateExportJob(ctx, args)
    case 'generate_insights_report':
      return handleGenerateInsightsReport(ctx, args)
    default:
      return { result: { error: `Unknown study tool: ${toolName}` } }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleGetStudyOverview(ctx: StudyToolContext): Promise<ToolExecutionResult> {
  const { data: study, error } = await ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, created_at, updated_at, settings, share_code')
    .eq('id', ctx.studyId)
    .single()

  if (error || !study) {
    return { result: { error: 'Failed to fetch study overview' } }
  }

  const [{ count: totalParticipants }, { count: completedParticipants }] = await Promise.all([
    ctx.supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('study_id', ctx.studyId),
    ctx.supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('study_id', ctx.studyId)
      .eq('status', 'completed'),
  ])

  return {
    result: {
      ...study,
      participantCount: totalParticipants ?? 0,
      completedCount: completedParticipants ?? 0,
      completionRate:
        totalParticipants && totalParticipants > 0
          ? Math.round(((completedParticipants ?? 0) / totalParticipants) * 100)
          : 0,
    },
  }
}

async function handleGetTaskMetrics(
  ctx: StudyToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const taskId = args.task_id as string | undefined

  let query = ctx.supabase
    .from('tasks')
    .select('*')
    .eq('study_id', ctx.studyId)
    .order('order_position', { ascending: true })

  if (taskId) {
    query = query.eq('id', taskId)
  }

  const { data: tasks, error } = await query

  if (error) {
    return { result: { error: 'Failed to fetch task metrics' } }
  }

  return { result: { tasks: tasks ?? [], count: tasks?.length ?? 0 } }
}

async function handleGetResponses(
  ctx: StudyToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const limit = Math.min((args.limit as number) || 15, 50)
  const statusFilter = (args.status as string) || 'completed'

  let query = ctx.supabase
    .from('participants')
    .select('id, status, started_at, completed_at, country, region, city, source_app')
    .eq('study_id', ctx.studyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    return { result: { error: 'Failed to fetch responses' } }
  }

  return { result: { responses: data ?? [], count: data?.length ?? 0 } }
}

async function handleGetParticipantList(
  ctx: StudyToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const statusFilter = (args.status as string) || 'all'
  const limit = Math.min((args.limit as number) || 50, 100)

  let query = ctx.supabase
    .from('participants')
    .select('id, status, started_at, completed_at, created_at, country, region, city, source_app')
    .eq('study_id', ctx.studyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    return { result: { error: 'Failed to fetch participant list' } }
  }

  return { result: { participants: data ?? [], count: data?.length ?? 0 } }
}

// ---------------------------------------------------------------------------
// Summarization helpers — keep aggregates, drop raw per-participant data
// ---------------------------------------------------------------------------

function summarizeFirstImpressionForLLM(data: any): Record<string, unknown> {
  return {
    study: data.study,
    designs: (data.designs ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      position: d.position,
      source_type: d.source_type,
      is_practice: d.is_practice,
      questionCount: d.questions?.length ?? 0,
    })),
    metrics: data.metrics,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw sessions/exposures/responses/participants omitted. Use get_responses for individual participant data.',
  }
}

function summarizeCardSortForLLM(data: any): Record<string, unknown> {
  const analysis = data.analysis
  let summarizedAnalysis = null
  if (analysis) {
    summarizedAnalysis = {
      topSimilarPairs: analysis.topSimilarPairs,
      suggestedClusters: analysis.suggestedClusters,
      naturalClusters: analysis.naturalClusters,
      categoryAgreement: analysis.categoryAgreement,
      // Drop the full similarity matrix — it's an NxN grid that can be huge
      similarityMatrixSize: analysis.similarityMatrix?.matrix?.length ?? 0,
    }
  }

  return {
    study: data.study,
    cards: data.cards,
    categories: data.categories,
    stats: data.stats,
    analysis: summarizedAnalysis,
    standardizations: data.standardizations,
    responseCount: data.responses?.length ?? 0,
    participantCount: data.participants?.length ?? 0,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw responses/participants/flowResponses omitted. Use get_responses for individual participant data.',
  }
}

function summarizeTreeTestForLLM(data: any): Record<string, unknown> {
  return {
    study: data.study,
    tasks: data.tasks,
    metrics: data.metrics,
    nodeCount: data.nodes?.length ?? 0,
    responseCount: data.responses?.length ?? 0,
    participantCount: data.participants?.length ?? 0,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw responses/participants/nodes/flowResponses omitted. Use get_responses for individual participant data.',
  }
}

function summarizePrototypeTestForLLM(data: any): Record<string, unknown> {
  return {
    study: data.study,
    tasks: (data.tasks ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      position: t.position,
      success_criteria_type: t.success_criteria_type,
    })),
    metrics: data.metrics,
    taskAttemptCount: data.taskAttempts?.length ?? 0,
    sessionCount: data.sessions?.length ?? 0,
    participantCount: data.participants?.length ?? 0,
    frameCount: data.frames?.length ?? 0,
    componentStateEventCount: data.componentStateEvents?.length ?? 0,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw taskAttempts/sessions/participants/frames/componentStateEvents/flowResponses omitted. Use get_responses for individual participant data.',
  }
}

function summarizeFirstClickForLLM(data: any): Record<string, unknown> {
  return {
    study: data.study,
    tasks: (data.tasks ?? []).map((t: any) => ({
      id: t.id,
      instruction: t.instruction,
      position: t.position,
      aoiNames: (t.aois ?? []).map((a: any) => a.name),
    })),
    metrics: data.metrics,
    responseCount: data.responses?.length ?? 0,
    participantCount: data.participants?.length ?? 0,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw responses/participants/flowResponses/postTaskResponses omitted. Use get_responses for individual participant data.',
  }
}

function summarizeLiveWebsiteForLLM(data: any): Record<string, unknown> {
  const metrics = data.metrics
  return {
    study: data.study,
    tasks: (data.tasks ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      target_url: t.target_url,
      success_criteria_type: t.success_criteria_type,
      order_position: t.order_position,
    })),
    metrics: metrics ? {
      totalParticipants: metrics.totalParticipants,
      completedParticipants: metrics.completedParticipants,
      averageCompletionTimeMs: metrics.averageCompletionTimeMs,
      usabilityScore: metrics.usabilityScore,
      overallSuccessRate: metrics.overallSuccessRate,
      overallAbandonRate: metrics.overallAbandonRate,
      overallDirectSuccessRate: metrics.overallDirectSuccessRate,
      overallIndirectSuccessRate: metrics.overallIndirectSuccessRate,
      overallSelfReportedRate: metrics.overallSelfReportedRate,
      avgTimePerTask: metrics.avgTimePerTask,
      avgPagesPerTask: metrics.avgPagesPerTask,
      totalEvents: metrics.totalEvents,
      totalRageClicks: metrics.totalRageClicks,
      taskMetrics: (metrics.taskMetrics ?? []).map((tm: any) => ({
        taskId: tm.taskId,
        taskTitle: tm.taskTitle,
        successRate: tm.successRate,
        avgTimeMs: tm.avgTimeMs,
        avgPages: tm.avgPages,
        completedCount: tm.completedCount,
        abandonedCount: tm.abandonedCount,
        timedOutCount: tm.timedOutCount,
        skippedCount: tm.skippedCount,
        totalResponses: tm.totalResponses,
        directSuccessRate: tm.directSuccessRate,
        indirectSuccessRate: tm.indirectSuccessRate,
        selfReportedRate: tm.selfReportedRate,
        avgClicks: tm.avgClicks,
      })),
    } : null,
    responseCount: data.responses?.length ?? 0,
    eventCount: data.events?.length ?? 0,
    participantCount: data.participants?.length ?? 0,
    flowQuestionCount: data.flowQuestions?.length ?? 0,
    _note: 'Raw responses/events/participants/postTaskResponses/flowResponses omitted. Use get_responses for individual participant data.',
  }
}

function summarizeSurveyForLLM(data: any): Record<string, unknown> {
  const flowQuestions: any[] = data.flowQuestions ?? []
  const flowResponses: any[] = data.flowResponses ?? []

  // Compute per-question aggregates since survey has no pre-computed metrics
  const responsesByQuestion = new Map<string, any[]>()
  for (const resp of flowResponses) {
    const qId = resp.question_id
    if (!qId) continue
    if (!responsesByQuestion.has(qId)) responsesByQuestion.set(qId, [])
    responsesByQuestion.get(qId)!.push(resp)
  }

  const questionAggregates = flowQuestions.map((q: any) => {
    const qResponses = responsesByQuestion.get(q.id) ?? []
    const agg: Record<string, unknown> = {
      questionId: q.id,
      section: q.section,
      questionType: q.question_type,
      questionText: q.question_text,
      responseCount: qResponses.length,
    }

    const qType = q.question_type || ''

    // Choice-type questions: compute distribution
    if (['single_choice', 'multiple_choice', 'yes_no', 'dropdown', 'image_choice'].includes(qType)) {
      const counts: Record<string, number> = {}
      for (const r of qResponses) {
        const val = r.response_value
        if (Array.isArray(val)) {
          for (const v of val) {
            const label = typeof v === 'string' ? v : (v?.label || v?.value || String(v))
            counts[label] = (counts[label] || 0) + 1
          }
        } else if (typeof val === 'string') {
          counts[val] = (counts[val] || 0) + 1
        } else if (typeof val === 'boolean') {
          counts[val ? 'Yes' : 'No'] = (counts[val ? 'Yes' : 'No'] || 0) + 1
        } else if (val?.value) {
          counts[val.value] = (counts[val.value] || 0) + 1
        }
      }
      agg.distribution = Object.entries(counts)
        .map(([option, count]) => ({ option, count, percentage: qResponses.length > 0 ? Math.round((count / qResponses.length) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
    }

    // Numeric/rating questions: compute avg, median
    if (['rating', 'scale', 'opinion_scale', 'nps', 'slider', 'number'].includes(qType)) {
      const nums = qResponses
        .map((r: any) => {
          const v = r.response_value
          return typeof v === 'number' ? v : (typeof v === 'object' && v?.value != null ? Number(v.value) : parseFloat(String(v)))
        })
        .filter((n: number) => !isNaN(n))
        .sort((a: number, b: number) => a - b)
      if (nums.length > 0) {
        agg.average = Math.round((nums.reduce((a: number, b: number) => a + b, 0) / nums.length) * 100) / 100
        agg.median = nums[Math.floor(nums.length / 2)]
        agg.min = nums[0]
        agg.max = nums[nums.length - 1]
      }
    }

    // Text questions: sample up to 5
    if (['short_text', 'long_text', 'single_line_text', 'multi_line_text', 'email', 'phone'].includes(qType)) {
      agg.sampleResponses = qResponses.slice(0, 5).map((r: any) => {
        const v = r.response_value
        return typeof v === 'string' ? v.slice(0, 200) : JSON.stringify(v).slice(0, 200)
      })
    }

    // Ranking questions: compute average position per option
    if (qType === 'ranking') {
      const positionSums: Record<string, { total: number; count: number }> = {}
      for (const r of qResponses) {
        const val = r.response_value
        if (Array.isArray(val)) {
          val.forEach((item: any, idx: number) => {
            const label = typeof item === 'string' ? item : (item?.label || item?.value || String(item))
            if (!positionSums[label]) positionSums[label] = { total: 0, count: 0 }
            positionSums[label].total += idx + 1
            positionSums[label].count += 1
          })
        }
      }
      agg.averageRanking = Object.entries(positionSums)
        .map(([option, { total, count }]) => ({ option, avgPosition: Math.round((total / count) * 100) / 100 }))
        .sort((a, b) => a.avgPosition - b.avgPosition)
    }

    return agg
  })

  return {
    study: data.study,
    stats: data.stats,
    questionAggregates,
    questionCount: flowQuestions.length,
    participantCount: data.participants?.length ?? 0,
    _note: 'Raw participants and flowResponses omitted. Per-question aggregates computed. Use get_responses for individual participant data.',
  }
}

// ---------------------------------------------------------------------------
// Study-type result handlers (with summarization)
// ---------------------------------------------------------------------------

type ResultFetcher = (supabase: any, studyId: string) => Promise<{ data: any; error: Error | null }>
type ResultSummarizer = (data: any) => Record<string, unknown>

interface ResultHandlerConfig {
  fetcher: ResultFetcher
  summarizer: ResultSummarizer
}

const RESULT_HANDLERS: Record<string, ResultHandlerConfig> = {
  card_sort: { fetcher: getCardSortResults, summarizer: summarizeCardSortForLLM },
  tree_test: { fetcher: getTreeTestResults, summarizer: summarizeTreeTestForLLM },
  prototype_test: { fetcher: getPrototypeTestResults, summarizer: summarizePrototypeTestForLLM },
  first_click: { fetcher: getFirstClickResults, summarizer: summarizeFirstClickForLLM },
  first_impression: { fetcher: getFirstImpressionResults, summarizer: summarizeFirstImpressionForLLM },
  survey: { fetcher: getSurveyResults, summarizer: summarizeSurveyForLLM },
  live_website_test: {
    fetcher: async (supabase: any, studyId: string) => {
      const { getLiveWebsiteOverview } = await import('../results/live-website-overview')
      return getLiveWebsiteOverview(supabase, studyId)
    },
    summarizer: summarizeLiveWebsiteForLLM,
  },
}

/**
 * Generic result handler: fetch result, check error, summarize for LLM.
 * Reduces 6 identical handlers to a single reusable function.
 */
async function handleResultWithSummary(ctx: StudyToolContext, studyType: string): Promise<ToolExecutionResult> {
  const config = RESULT_HANDLERS[studyType]
  if (!config) {
    return { result: { error: `Unsupported study type: ${studyType}` } }
  }
  try {
    const result = await config.fetcher(ctx.supabase, ctx.studyId)
    if (result.error) {
      return { result: { error: result.error } }
    }
    return { result: config.summarizer(result.data) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { result: { error: `Failed to fetch ${studyType} results: ${message}` } }
  }
}

const handleGetCardSortResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'card_sort')
const handleGetTreeTestResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'tree_test')
const handleGetPrototypeTestResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'prototype_test')
const handleGetFirstClickResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'first_click')
const handleGetFirstImpressionResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'first_impression')
const handleGetSurveyResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'survey')
const handleGetLiveWebsiteResults = (ctx: StudyToolContext) => handleResultWithSummary(ctx, 'live_website_test')

async function handleExportStudyData(
  ctx: StudyToolContext,
  _args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const MAX_PARTICIPANTS = 100 // Reduced from 500 - use create_export_job for larger exports

  // Check participant count first
  const { count } = await ctx.supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', ctx.studyId)
    .eq('status', 'completed')

  const totalParticipants = count || 0

  // Redirect to async export for large datasets
  if (totalParticipants > MAX_PARTICIPANTS) {
    return {
      result: {
        error: 'too_many_participants',
        message: `This study has ${totalParticipants} completed participants. For studies with more than ${MAX_PARTICIPANTS} participants, please use the create_export_job tool instead to avoid memory issues.`,
        totalParticipants,
        maxParticipants: MAX_PARTICIPANTS,
        recommendation: 'Use create_export_job tool with integration="googlesheets" or integration="csv_download"',
      },
    }
  }

  // Fetch participants (capped)
  const { data: participants } = await ctx.supabase
    .from('participants')
    .select('id, status, started_at, completed_at, country, region, city, source_app')
    .eq('study_id', ctx.studyId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(MAX_PARTICIPANTS)

  const pList = participants ?? []

  // Build participants sheet
  const participantsSheet: ExportSheet = {
    name: 'Participants',
    headers: ['Participant ID', 'Status', 'Started At', 'Completed At', 'Country', 'Region', 'City', 'Source'],
    rows: pList.map((p: any) => [
      p.id,
      p.status ?? '',
      formatExportDate(p.started_at),
      formatExportDate(p.completed_at),
      p.country ?? '',
      p.region ?? '',
      p.city ?? '',
      p.source_app ?? '',
    ]),
  }

  // Fetch study-type-specific data and build response sheets
  let responsesSheet: ExportSheet | null = null
  let flowResponsesSheet: ExportSheet | null = null

  try {
    const result = await fetchResultData(ctx)
    if (result) {
      responsesSheet = formatResponsesSheet(ctx.studyType, result)
      flowResponsesSheet = formatFlowResponsesSheet(result)
    }
  } catch {
    // If result fetch fails, we still return participants
  }

  const sheets: ExportSheet[] = [participantsSheet]
  if (responsesSheet && responsesSheet.rows.length > 0) sheets.push(responsesSheet)
  if (flowResponsesSheet && flowResponsesSheet.rows.length > 0) sheets.push(flowResponsesSheet)

  // Cache full data server-side and return only metadata + dataRef to the LLM.
  // write_export_to_integration fetches cached data directly — the LLM never
  // needs to copy raw data through its output (which causes truncation).
  const dataRef = generateDataRef()
  exportDataCache.set(dataRef, {
    sheets,
    studyId: ctx.studyId,
    studyType: ctx.studyType,
    expiresAt: Date.now() + EXPORT_CACHE_TTL_MS,
  })

  return {
    result: {
      dataRef,
      studyId: ctx.studyId,
      studyType: ctx.studyType,
      sheets: sheets.map((s) => ({
        name: s.name,
        headers: s.headers,
        rowCount: s.rows.length,
      })),
      totalParticipants: pList.length,
      _note: 'Data is cached server-side. Use write_export_to_integration with this dataRef to write to an integration. Do NOT try to pass the raw data yourself — it will be too large.',
    },
  }
}

// ---------------------------------------------------------------------------
// Export data cache — server-side data flow
// ---------------------------------------------------------------------------
// export_study_data caches the full sheets data here and returns only metadata
// + a dataRef to the LLM. write_export_to_integration fetches cached data
// server-side so the LLM never copies raw data through its output.

interface ExportSheet {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

interface CachedExportData {
  sheets: ExportSheet[]
  studyId: string
  studyType: string
  expiresAt: number
}

const EXPORT_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const EXPORT_CACHE_MAX_SIZE = 50
const exportDataCache = new Map<string, CachedExportData>()

function generateDataRef(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function cleanExpiredExports(): void {
  const now = Date.now()
  for (const [key, value] of exportDataCache) {
    if (value.expiresAt < now) {
      exportDataCache.delete(key)
    }
  }
  // Evict oldest entries if over size cap
  while (exportDataCache.size > EXPORT_CACHE_MAX_SIZE) {
    const oldestKey = exportDataCache.keys().next().value
    if (oldestKey !== undefined) exportDataCache.delete(oldestKey)
    else break
  }
}

/** Retrieve cached export data by dataRef. Returns null if expired or not found. */
export function getExportData(dataRef: string): CachedExportData | null {
  cleanExpiredExports()
  const cached = exportDataCache.get(dataRef)
  if (!cached || cached.expiresAt < Date.now()) {
    return null
  }
  return cached
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function formatExportDate(date: string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

function formatExportValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === 'object' && v !== null) return v.label ?? v.value ?? v.text ?? JSON.stringify(v)
      return String(v)
    }).join('; ')
  }
  if (typeof value === 'object') {
    if ('value' in value && value.value !== undefined) return String(value.value)
    if ('selected' in value && Array.isArray(value.selected)) return value.selected.map(String).join('; ')
    return JSON.stringify(value)
  }
  return String(value)
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

async function fetchResultData(ctx: StudyToolContext): Promise<any> {
  const config = RESULT_HANDLERS[ctx.studyType]
  if (!config) return null
  return (await config.fetcher(ctx.supabase, ctx.studyId)).data
}

type ResponseFormatter = (data: any) => ExportSheet | null

const RESPONSE_FORMATTERS: Record<string, ResponseFormatter> = {
  survey: formatSurveyResponses,
  first_impression: formatFirstImpressionResponses,
  card_sort: formatCardSortResponses,
  tree_test: formatTreeTestResponses,
  first_click: formatFirstClickResponses,
  prototype_test: formatPrototypeTestResponses,
  live_website_test: formatLiveWebsiteResponses,
}

function formatResponsesSheet(studyType: string, data: any): ExportSheet | null {
  const formatter = RESPONSE_FORMATTERS[studyType]
  return formatter ? formatter(data) : null
}

// -- Survey --

function formatSurveyResponses(data: any): ExportSheet {
  const questions: any[] = data.flowQuestions ?? []
  const responses: any[] = data.flowResponses ?? []
  const sorted = [...questions].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return (a.position ?? 0) - (b.position ?? 0)
  })

  // Build participant → question → response map
  const byParticipant = new Map<string, Map<string, any>>()
  for (const r of responses) {
    if (!byParticipant.has(r.participant_id)) byParticipant.set(r.participant_id, new Map())
    byParticipant.get(r.participant_id)!.set(r.question_id, r)
  }

  const qLabels = sorted.map((q, i) => stripHtml(q.question_text || '').slice(0, 60) || `Q${i + 1}`)
  const headers = ['Participant ID', ...qLabels]
  const rows: (string | number)[][] = []

  for (const [pid, qMap] of byParticipant) {
    rows.push([pid, ...sorted.map((q) => formatExportValue(qMap.get(q.id)?.response_value))])
  }

  return { name: 'Responses', headers, rows }
}

// -- First Impression --

function formatFirstImpressionResponses(data: any): ExportSheet {
  const designs: any[] = data.designs ?? []
  const responses: any[] = data.responses ?? []

  const headers = ['Participant ID', 'Design', 'Question', 'Response', 'Response Time (ms)']
  const rows: (string | number)[][] = []

  const designMap = new Map(designs.map((d: any) => [d.id, d]))

  for (const r of responses) {
    const design = designMap.get(r.design_id)
    const designName = design?.name ?? r.design_id
    const questionText = r.question_text ?? r.question_id ?? ''
    rows.push([
      r.participant_id ?? r.session_id ?? '',
      designName,
      stripHtml(questionText),
      formatExportValue(r.response_value ?? r.value),
      r.response_time_ms ?? '',
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- Card Sort --

function formatCardSortResponses(data: any): ExportSheet {
  const cards: any[] = data.cards ?? []
  const responses: any[] = data.responses ?? []

  const cardLabels = cards.map((c: any) => c.label)
  const headers = ['Participant ID', 'Duration (s)', ...cardLabels]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const placements = r.card_placements ?? {}
    const durationSec = r.total_time_ms ? Math.round(r.total_time_ms / 1000) : ''
    rows.push([
      r.participant_id,
      durationSec,
      ...cards.map((c: any) => placements[c.id] ?? ''),
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- Tree Test --

function formatTreeTestResponses(data: any): ExportSheet {
  const tasks: any[] = data.tasks ?? []
  const nodes: any[] = data.nodes ?? []
  const responses: any[] = data.responses ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]))

  const headers = [
    'Participant ID', 'Task', 'Selected Node', 'Correct Answer',
    'Is Correct', 'Is Direct', 'Path Taken', 'Time (ms)',
  ]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const task = taskMap.get(r.task_id)
    const selectedNode = r.selected_node_id ? nodeMap.get(r.selected_node_id) : null
    const correctNode = task?.correct_node_id ? nodeMap.get(task.correct_node_id) : null
    const pathLabels = (r.path_taken ?? []).map((id: string) => nodeMap.get(id)?.label ?? id).join(' > ')

    rows.push([
      r.participant_id,
      task?.question ?? task?.title ?? '',
      selectedNode?.label ?? '',
      correctNode?.label ?? '',
      r.is_correct ? 'Yes' : 'No',
      r.is_direct ? 'Yes' : 'No',
      pathLabels,
      r.total_time_ms ?? '',
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- First Click --

function formatFirstClickResponses(data: any): ExportSheet {
  const tasks: any[] = data.tasks ?? []
  const responses: any[] = data.responses ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))

  const headers = [
    'Participant ID', 'Task', 'Click X', 'Click Y',
    'Is Correct', 'Time to Click (ms)',
  ]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const task = taskMap.get(r.task_id)
    rows.push([
      r.participant_id,
      task?.instruction ?? '',
      r.click_x ?? '',
      r.click_y ?? '',
      r.is_correct ? 'Yes' : 'No',
      r.time_to_click_ms ?? '',
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- Prototype Test --

function formatPrototypeTestResponses(data: any): ExportSheet {
  const tasks: any[] = data.tasks ?? []
  const attempts: any[] = data.taskAttempts ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))

  const headers = [
    'Participant ID', 'Task', 'Outcome', 'Time (ms)',
    'Click Count', 'Misclick Count', 'Is Direct',
  ]
  const rows: (string | number)[][] = []

  for (const a of attempts) {
    const task = taskMap.get(a.task_id)
    rows.push([
      a.participant_id,
      task?.title ?? '',
      a.outcome ?? '',
      a.total_time_ms ?? '',
      a.click_count ?? 0,
      a.misclick_count ?? 0,
      a.is_direct ? 'Yes' : 'No',
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- Live Website Test --

function formatLiveWebsiteResponses(data: any): ExportSheet {
  const tasks: any[] = data.tasks ?? []
  const responses: any[] = data.responses ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))

  const headers = [
    'Participant ID', 'Task', 'Status', 'Duration (ms)',
    'Completion Method', 'Self Reported Success',
  ]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const task = taskMap.get(r.task_id)
    rows.push([
      r.participant_id ?? '',
      task?.title ?? '',
      r.status ?? '',
      r.duration_ms ?? '',
      r.completion_method ?? '',
      r.self_reported_success != null ? (r.self_reported_success ? 'Yes' : 'No') : '',
    ])
  }

  return { name: 'Responses', headers, rows }
}

// -- Flow Responses (shared across study types) --

function formatFlowResponsesSheet(data: any): ExportSheet | null {
  const flowQuestions: any[] = data.flowQuestions ?? []
  const flowResponses: any[] = data.flowResponses ?? []

  // For survey type, flowResponses are the main responses — skip this sheet
  if (!flowResponses.length || !flowQuestions.length) return null

  // Only include non-survey flow questions (screening, pre_study, post_study)
  const flowOnly = flowQuestions.filter((q: any) => q.section !== 'survey')
  if (!flowOnly.length) return null

  const sorted = [...flowOnly].sort((a: any, b: any) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return (a.position ?? 0) - (b.position ?? 0)
  })

  const byParticipant = new Map<string, Map<string, any>>()
  for (const r of flowResponses) {
    if (!byParticipant.has(r.participant_id)) byParticipant.set(r.participant_id, new Map())
    byParticipant.get(r.participant_id)!.set(r.question_id, r)
  }

  const qLabels = sorted.map((q: any, i: number) => {
    const section = q.section === 'pre_study' ? '[Pre] ' : q.section === 'post_study' ? '[Post] ' : q.section === 'screening' ? '[Screen] ' : ''
    return section + (stripHtml(q.question_text || '').slice(0, 50) || `Q${i + 1}`)
  })
  const headers = ['Participant ID', ...qLabels]
  const rows: (string | number)[][] = []

  const flowQIds = new Set(sorted.map((q: any) => q.id))
  for (const [pid, qMap] of byParticipant) {
    // Only include participants who answered at least one flow question
    const hasFlowAnswer = Array.from(qMap.keys()).some((qId) => flowQIds.has(qId))
    if (!hasFlowAnswer) continue
    rows.push([pid, ...sorted.map((q: any) => formatExportValue(qMap.get(q.id)?.response_value))])
  }

  return rows.length > 0 ? { name: 'Flow Responses', headers, rows } : null
}

/**
 * Handle create_export_job tool
 * Creates an async export job for large datasets.
 * Uses direct DB access instead of HTTP roundtrip to own API.
 */
async function handleCreateExportJob(
  ctx: StudyToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const { integration, format = 'raw', config } = args

  // Validate integration
  if (!integration || typeof integration !== 'string') {
    return {
      result: {
        error: 'missing_integration',
        message: 'integration parameter is required',
      },
    }
  }

  const validIntegrations = ['googlesheets', 'googledocs', 'notion', 'airtable', 'csv_download']
  if (!validIntegrations.includes(integration)) {
    return {
      result: { error: `Unsupported integration: ${integration}. Supported: ${validIntegrations.join(', ')}` },
    }
  }

  const supportedIntegrations = ['googlesheets', 'csv_download']
  if (!supportedIntegrations.includes(integration)) {
    return {
      result: { error: `${integration} export is not yet implemented. Currently supported: ${supportedIntegrations.join(', ')}` },
    }
  }

  const supabase = ctx.supabase

  // Check connection (skip for CSV)
  if (integration !== 'csv_download') {
    const { data: connection } = await (supabase as any)
      .from('composio_connections')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('toolkit', integration)
      .single()

    if (!connection) {
      return {
        result: {
          error: `${integration} is not connected. Please connect it via the integrations bar.`,
        },
        metadata: {
          type: 'connect_prompt',
          toolkit: integration,
        },
      }
    }
  }

  // Count completed participants for estimation
  const { count: participantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', ctx.studyId)
    .eq('status', 'completed')

  const totalParticipants = participantCount || 0

  // Create export job record
  const { data: job, error: createError } = await (supabase as any)
    .from('export_jobs')
    .insert({
      user_id: ctx.userId,
      study_id: ctx.studyId,
      integration,
      format,
      config: config || {},
      status: 'pending',
      progress: {
        percentage: 0,
        processedParticipants: 0,
        totalParticipants,
        current_step: 'Queued',
      },
    })
    .select()
    .single()

  if (createError || !job) {
    return {
      result: {
        error: 'export_job_creation_failed',
        message: createError?.message || 'Failed to create export job',
      },
    }
  }

  // Estimate duration (~2 seconds per 100 participants)
  const estimatedSeconds = Math.max(30, Math.ceil((totalParticipants / 100) * 2))
  const estimatedDuration =
    estimatedSeconds < 60
      ? `~${estimatedSeconds} seconds`
      : `~${Math.ceil(estimatedSeconds / 60)} minutes`

  return {
    result: {
      success: true,
      jobId: job.id,
      status: job.status,
      estimatedDuration,
      message: `Export job created successfully. Job ID: ${job.id}. Estimated time: ${estimatedDuration}. The export will run in the background and you will be notified when it completes.`,
    },
    emitEvent: {
      topic: 'export-job-created',
      data: {
        job_id: job.id,
        user_id: ctx.userId!,
        study_id: ctx.studyId,
        integration,
        format,
      },
    },
  }
}

// ---------------------------------------------------------------------------
// AI Insights Report
// ---------------------------------------------------------------------------

async function handleGenerateInsightsReport(
  ctx: StudyToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const regenerate = args.regenerate === true

  // Check for existing processing report
  if (!regenerate) {
    const { data: existing } = await ctx.supabase
      .from('ai_insights_reports')
      .select('id, status')
      .eq('study_id', ctx.studyId)
      .in('status', ['processing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing?.status === 'processing') {
      return {
        result: {
          message: 'An insights report is already being generated. Check the Downloads tab for progress.',
          reportId: existing.id,
          status: 'processing',
        },
      }
    }

    if (existing?.status === 'completed') {
      return {
        result: {
          message: 'An insights report is already available. Check the Downloads tab to preview or download it. Ask again with regenerate=true to create a new one.',
          reportId: existing.id,
          status: 'completed',
        },
      }
    }
  }

  // Get participant count for the report
  const { count: responseCount } = await ctx.supabase
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('study_id', ctx.studyId)
    .eq('status', 'completed')

  if (!responseCount || responseCount === 0) {
    return {
      result: { error: 'No completed responses yet. The study needs at least one completed participant before generating an insights report.' },
    }
  }

  // Create the report row
  const { data: report, error } = await ctx.supabase
    .from('ai_insights_reports')
    .insert({
      study_id: ctx.studyId,
      user_id: ctx.userId!,
      status: 'processing',
      response_count_at_generation: responseCount,
      segment_filters: [],
    })
    .select('id')
    .single()

  if (error || !report) {
    return { result: { error: 'Failed to create insights report record' } }
  }

  return {
    result: {
      success: true,
      reportId: report.id,
      status: 'processing',
      message: `Insights report generation started (based on ${responseCount} responses). Check the Downloads tab for progress — it will show a preview and download button when ready.`,
    },
    emitEvent: {
      topic: 'insights-report-requested',
      data: {
        reportId: report.id,
        studyId: ctx.studyId,
        studyType: ctx.studyType,
        userId: ctx.userId!,
      },
    },
  }
}
