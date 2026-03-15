/**
 * Data summarizer — compresses study results into compact JSON for LLM context.
 * Each study type gets a summarizer that extracts the most analytically relevant
 * data while staying within token budget (~4000 tokens of data per LLM call).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getCardSortResults } from '../results/card-sort'
import { getTreeTestResults } from '../results/tree-test'
import { getSurveyResults } from '../results/survey'
import { getPrototypeTestResults } from '../results/prototype-test'
import { getFirstClickResults } from '../results/first-click'
import { getFirstImpressionResults } from '../results/first-impression'
import { getLiveWebsiteOverview } from '../results/live-website-overview'

type SupabaseClientType = SupabaseClient<Database>

export interface StudySummary {
  studyTitle: string
  studyType: string
  participantCount: number
  completedCount: number
  completionRate: number
  avgCompletionTimeMs: number
  /** Compact data payload specific to study type */
  data: Record<string, unknown>
  /** Whether study has pre/post questionnaire responses */
  hasQuestionnaire: boolean
  questionnaireData?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Per-study-type summarizers
// ---------------------------------------------------------------------------

async function summarizeCardSort(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getCardSortResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch card sort results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const participantIds = new Set(participants.map((p: any) => p.id))
  const _responses = data.responses.filter((r: any) => participantIds.has(r.participant_id))

  // Compact category agreement: top 2 categories per card
  const categoryAgreement = data.analysis?.categoryAgreement
    ? Object.entries(data.analysis.categoryAgreement).slice(0, 20).map(([_cardId, agreement]) => ({
        card: agreement.cardLabel,
        topCategories: agreement.categories.slice(0, 2).map(c => ({ name: c.name, pct: c.percentage })),
      }))
    : []

  // Top similar pairs
  const topPairs = data.analysis?.topSimilarPairs
    ? (data.analysis.topSimilarPairs as any[]).slice(0, 10).map((p: any) => ({
        cards: [p.card1, p.card2],
        similarity: Math.round(p.similarity),
      }))
    : []

  // Natural clusters
  const clusters = data.analysis?.naturalClusters
    ? (data.analysis.naturalClusters as any[]).slice(0, 8).map((c: any) => ({
        cards: c.cards?.slice(0, 5) ?? [],
        avgSimilarity: Math.round(c.averageSimilarity ?? 0),
      }))
    : []

  const settings = data.study.settings as Record<string, unknown> | null
  const mode = (settings?.mode as string) || 'open'

  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'card_sort',
    participantCount: participants.length,
    completedCount: participants.filter((p: any) => p.status === 'completed').length,
    completionRate: data.stats.completionRate,
    avgCompletionTimeMs: data.stats.avgCompletionTimeMs,
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      mode,
      cardCount: data.cards.length,
      categoryCount: data.categories.length,
      cards: data.cards.slice(0, 30).map((c: any) => c.label),
      categories: data.categories.slice(0, 20).map((c: any) => (c as any).label),
      categoryAgreement,
      topSimilarPairs: topPairs,
      naturalClusters: clusters,
      suggestedClusterCount: data.analysis?.suggestedClusters,
    },
  }
}

async function summarizeTreeTest(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getTreeTestResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch tree test results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const completedCount = participants.filter((p: any) => p.status === 'completed').length

  const taskMetrics = (data.metrics?.taskMetrics ?? []).map((m: any) => ({
    taskId: m.taskId,
    title: m.taskTitle || m.taskId,
    successRate: Math.round(m.successRate ?? 0),
    directnessRate: Math.round(m.directnessRate ?? 0),
    avgTimeMs: Math.round(m.avgTimeMs ?? 0),
    firstClickCorrectRate: Math.round((m.firstClickCorrectRate ?? 0) * 100),
    responseCount: m.responseCount ?? 0,
  }))

  const flowResponses = data.flowResponses?.filter((r: any) =>
    new Set(participants.map((p: any) => p.id)).has(r.participant_id)
  ) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'tree_test',
    participantCount: participants.length,
    completedCount,
    completionRate: participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0,
    avgCompletionTimeMs: data.metrics?.averageCompletionTimeMs ?? 0,
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      taskCount: taskMetrics.length,
      nodeCount: data.nodes?.length ?? 0,
      overallSuccessRate: Math.round(data.metrics?.overallSuccessRate ?? 0),
      overallDirectnessRate: Math.round(data.metrics?.overallDirectnessRate ?? 0),
      taskMetrics,
    },
  }
}

async function summarizeSurvey(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getSurveyResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch survey results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const participantIds = new Set(participants.map((p: any) => p.id))
  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  // Summarize each question's response distribution
  const questionSummaries = (data.flowQuestions ?? []).map((q: any) => {
    const qResponses = flowResponses.filter((r: any) => r.question_id === q.id)
    const summary: Record<string, unknown> = {
      id: q.id,
      text: q.question_text?.slice(0, 100),
      type: q.question_type,
      responseCount: qResponses.length,
    }

    if (['multiple_choice', 'yes_no', 'single_choice'].includes(q.question_type)) {
      const counts: Record<string, number> = {}
      for (const r of qResponses) {
        const val = typeof (r as any).response_value === 'string' ? (r as any).response_value : JSON.stringify((r as any).response_value)
        counts[val] = (counts[val] || 0) + 1
      }
      summary.distribution = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([option, count]) => ({ option, count, pct: Math.round((count / qResponses.length) * 100) }))
    } else if (['opinion_scale', 'nps', 'slider', 'rating'].includes(q.question_type)) {
      const values = qResponses
        .map((r: any) => typeof r.response_value === 'number' ? r.response_value : Number(r.response_value?.value ?? r.response_value))
        .filter((v: number) => !isNaN(v))
      if (values.length > 0) {
        summary.avg = Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) / 10
        summary.min = Math.min(...values)
        summary.max = Math.max(...values)
      }
    } else if (['single_line_text', 'multi_line_text', 'short_text', 'long_text'].includes(q.question_type)) {
      summary.sampleResponses = qResponses.slice(0, 5).map((r: any) => {
        const val = typeof r.response_value === 'string' ? r.response_value : r.response_value?.value ?? ''
        return (val as string).slice(0, 200)
      })
    }

    return summary
  })

  return {
    studyTitle: data.study.title,
    studyType: 'survey',
    participantCount: participants.length,
    completedCount: data.stats.completedParticipants,
    completionRate: data.stats.completionRate,
    avgCompletionTimeMs: data.stats.avgCompletionTimeMs,
    hasQuestionnaire: false, // survey IS the questionnaire
    data: {
      questionCount: data.flowQuestions?.length ?? 0,
      questionSummaries,
    },
  }
}

async function summarizePrototypeTest(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getPrototypeTestResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch prototype test results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const completedCount = participants.filter((p: any) => p.status === 'completed').length
  const participantIds = new Set(participants.map((p: any) => p.id))

  const taskMetrics = (data.metrics?.taskMetrics ?? []).map((m: any) => ({
    taskId: m.taskId,
    title: m.taskTitle || m.taskId,
    successRate: Math.round(m.successRate ?? 0),
    avgTimeMs: Math.round(m.avgTimeMs ?? 0),
    avgMisclicks: Math.round((m.avgMisclicks ?? 0) * 10) / 10,
    completedCount: m.completedCount ?? 0,
    abandonedCount: m.abandonedCount ?? 0,
  }))

  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'prototype_test',
    participantCount: participants.length,
    completedCount,
    completionRate: participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0,
    avgCompletionTimeMs: data.metrics?.averageCompletionTimeMs ?? 0,
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      taskCount: taskMetrics.length,
      frameCount: data.frames?.length ?? 0,
      overallSuccessRate: Math.round(data.metrics?.overallSuccessRate ?? 0),
      taskMetrics,
    },
  }
}

async function summarizeFirstClick(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getFirstClickResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch first click results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const participantIds = new Set(participants.map((p: any) => p.id))
  const _responses = data.responses.filter((r: any) => participantIds.has(r.participant_id))

  const taskMetrics = data.metrics.taskMetrics.map(m => ({
    taskId: m.taskId,
    instruction: m.instruction?.slice(0, 80),
    successRate: Math.round(m.successRate),
    avgTimeMs: Math.round(m.avgTimeToClickMs),
    responseCount: m.responseCount,
    missRate: Math.round(m.missRate),
    aoiHits: m.aoiHits.slice(0, 5).map(h => ({ name: h.aoiName, pct: Math.round(h.hitPercent) })),
  }))

  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'first_click',
    participantCount: participants.length,
    completedCount: data.metrics.completedParticipants,
    completionRate: participants.length > 0
      ? Math.round((data.metrics.completedParticipants / participants.length) * 100)
      : 0,
    avgCompletionTimeMs: data.metrics.averageCompletionTimeMs,
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      taskCount: taskMetrics.length,
      overallSuccessRate: Math.round(data.metrics.overallSuccessRate),
      taskMetrics,
    },
  }
}

async function summarizeFirstImpression(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getFirstImpressionResults(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch first impression results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const participantIds = new Set(participants.map((p: any) => p.id))
  const _responses = data.responses.filter(r => participantIds.has(r.participant_id))

  const designMetrics = data.metrics.designMetrics
    .filter(d => !d.isPractice)
    .map(d => ({
      name: d.designName,
      exposures: d.exposureCount,
      avgExposureDurationMs: Math.round(d.avgExposureDurationMs),
      questionMetrics: d.questionMetrics.map(q => {
        const summary: Record<string, unknown> = {
          prompt: q.prompt?.slice(0, 80),
          type: q.type,
          responseCount: q.responseCount,
        }
        if (q.avgRating !== undefined) summary.avgRating = Math.round(q.avgRating * 10) / 10
        if (q.optionCounts) summary.topOptions = q.optionCounts.slice(0, 5).map(o => ({ option: o.option, pct: Math.round(o.percentage) }))
        if (q.sampleResponses) summary.samples = q.sampleResponses.slice(0, 3).map(s => s.slice(0, 100))
        return summary
      }),
    }))

  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'first_impression',
    participantCount: participants.length,
    completedCount: data.metrics.completedParticipants,
    completionRate: Math.round(data.metrics.overallCompletionRate),
    avgCompletionTimeMs: Math.round(data.metrics.averageSessionTimeMs),
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      designCount: designMetrics.length,
      designMetrics,
    },
  }
}

async function summarizeLiveWebsite(
  supabase: SupabaseClientType,
  studyId: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const { data, error } = await getLiveWebsiteOverview(supabase, studyId)
  if (error || !data) throw new Error(`Failed to fetch live website results: ${error?.message}`)

  const participants = filteredParticipantIds
    ? data.participants.filter((p: any) => filteredParticipantIds.has(p.id))
    : data.participants
  const participantIds = new Set(participants.map((p: any) => p.id))
  const completedCount = participants.filter((p: any) => p.status === 'completed').length

  const taskMetrics = data.metrics.taskMetrics.map(m => ({
    taskId: m.taskId,
    title: m.taskTitle,
    successRate: Math.round(m.successRate * 100),
    directSuccessRate: Math.round(m.directSuccessRate * 100),
    avgTimeMs: Math.round(m.avgTimeMs),
    avgPages: Math.round(m.avgPages * 10) / 10,
    completedCount: m.completedCount,
    abandonedCount: m.abandonedCount,
  }))

  const flowResponses = data.flowResponses?.filter((r: any) => participantIds.has(r.participant_id)) ?? []

  return {
    studyTitle: data.study.title,
    studyType: 'live_website_test',
    participantCount: participants.length,
    completedCount,
    completionRate: participants.length > 0 ? Math.round((completedCount / participants.length) * 100) : 0,
    avgCompletionTimeMs: Math.round(data.metrics.averageCompletionTimeMs),
    hasQuestionnaire: (data.flowQuestions?.length ?? 0) > 0,
    questionnaireData: summarizeQuestionnaire(data.flowQuestions, flowResponses),
    data: {
      usabilityScore: data.metrics.usabilityScore,
      overallSuccessRate: Math.round(data.metrics.overallSuccessRate * 100),
      overallDirectSuccessRate: Math.round(data.metrics.overallDirectSuccessRate * 100),
      totalEvents: data.metrics.totalEvents,
      totalRageClicks: data.metrics.totalRageClicks,
      avgPagesPerTask: Math.round(data.metrics.avgPagesPerTask * 10) / 10,
      taskMetrics,
    },
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function summarizeQuestionnaire(
  questions?: unknown[],
  responses?: unknown[],
): Record<string, unknown> | undefined {
  if (!questions || questions.length === 0) return undefined

  const questionSummaries = (questions as any[]).map(q => {
    const qResponses = (responses as any[] ?? []).filter(r => r.question_id === q.id)
    const summary: Record<string, unknown> = {
      text: q.question_text?.slice(0, 100),
      type: q.question_type,
      section: q.section,
      responseCount: qResponses.length,
    }

    if (['multiple_choice', 'yes_no'].includes(q.question_type)) {
      const counts: Record<string, number> = {}
      for (const r of qResponses) {
        const val = typeof (r as any).response_value === 'string' ? (r as any).response_value : JSON.stringify((r as any).response_value)
        counts[val] = (counts[val] || 0) + 1
      }
      summary.distribution = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([option, count]) => ({ option, count }))
    } else if (['opinion_scale', 'nps', 'slider'].includes(q.question_type)) {
      const values = qResponses
        .map((r: any) => typeof r.response_value === 'number' ? r.response_value : Number(r.response_value?.value ?? r.response_value))
        .filter((v: number) => !isNaN(v))
      if (values.length > 0) {
        summary.avg = Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) / 10
      }
    } else if (['single_line_text', 'multi_line_text'].includes(q.question_type)) {
      summary.samples = qResponses.slice(0, 3).map((r: any) => {
        const val = typeof r.response_value === 'string' ? r.response_value : r.response_value?.value ?? ''
        return (val as string).slice(0, 150)
      })
    }

    return summary
  })

  return { questions: questionSummaries }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const SUMMARIZER_MAP: Record<string, (supabase: SupabaseClientType, studyId: string, filtered?: Set<string>) => Promise<StudySummary>> = {
  card_sort: summarizeCardSort,
  tree_test: summarizeTreeTest,
  survey: summarizeSurvey,
  prototype_test: summarizePrototypeTest,
  first_click: summarizeFirstClick,
  first_impression: summarizeFirstImpression,
  live_website_test: summarizeLiveWebsite,
}

export async function getStudySummary(
  supabase: SupabaseClientType,
  studyId: string,
  studyType: string,
  filteredParticipantIds?: Set<string>,
): Promise<StudySummary> {
  const summarizer = SUMMARIZER_MAP[studyType]
  if (!summarizer) throw new Error(`Unsupported study type: ${studyType}`)
  return summarizer(supabase, studyId, filteredParticipantIds)
}
