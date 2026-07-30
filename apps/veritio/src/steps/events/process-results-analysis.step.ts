import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { cache, cacheKeys, cacheTTL } from '../../lib/cache/memory-cache'
import {
  computeSimilarityMatrix,
  getTopSimilarPairs,
  findNaturalClusters,
  toParticipantResponse,
  type ParticipantResponse,
} from '../../lib/algorithms/similarity-matrix'
import {
  buildDendrogram,
  getDendrogramOrder,
  suggestClusterCount,
  type LinkageMethod,
} from '../../lib/algorithms/hierarchical-clustering'
import { WARD_PARTICIPANT_THRESHOLD } from '../../lib/constants/analysis-thresholds'
import { computeTreeTestMetrics } from '../../lib/algorithms/tree-test-analysis'
import type { EventHandlerContext } from '../../lib/motia/types'
import { responseValidatedSchema } from '../../lib/events/schemas'
import { getOrgIdForStudy, hasFeature } from '../../services/entitlements-service'

export const config = {
  name: 'ProcessResultsAnalysis',
  description: 'Pre-compute analysis results for studies with new responses',
  triggers: [{
    type: 'queue',
    topic: 'response-validated',
    infrastructure: {
      handler: { timeout: 120 },
      queue: { maxRetries: 3 },
    },
  }],
  enqueues: ['notification', 'results-analytics-ready', 'live-website-semantic-analysis-requested'],
  flows: ['results-analysis'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof responseValidatedSchema>, { logger, enqueue, state }: EventHandlerContext) => {
  const data = responseValidatedSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  logger.info(`Processing results analysis for study: ${data.studyId} (${data.studyType})`)

  try {
    if (data.studyType === 'card_sort') {
      await processCardSortAnalysis(supabase, data.studyId, { logger, state })
    } else if (data.studyType === 'tree_test') {
      await processTreeTestAnalysis(supabase, data.studyId, { logger })
    } else if (data.studyType === 'prototype_test') {
      await processPrototypeTestAnalysis(supabase, data.studyId, { logger })
    } else if (data.studyType === 'first_click') {
      await processFirstClickAnalysis(supabase, data.studyId, { logger })
    } else if (data.studyType === 'survey') {
      await processSurveyAnalytics(supabase, data.studyId, { logger })
    } else if (data.studyType === 'first_impression') {
      await processFirstImpressionAnalysis(supabase, data.studyId, { logger })
    } else if (data.studyType === 'live_website_test') {
      // Trigger semantic analysis as a separate background step
      const orgId = await getOrgIdForStudy(supabase, data.studyId)
      if (await hasFeature(supabase, orgId, 'ai')) {
        enqueue({
          topic: 'live-website-semantic-analysis-requested',
          data: { studyId: data.studyId, participantId: data.participantId },
        }).catch(() => {})
        logger.info(`Enqueued semantic analysis for live website test study ${data.studyId}`)
      } else {
        logger.info(`Skipped semantic analysis for live website test study ${data.studyId}; plan does not include AI`)
      }
    }

    enqueue({
      topic: 'results-analytics-ready',
      data: {
        studyId: data.studyId,
        studyType: data.studyType,
        timestamp: Date.now(),
        resourceType: 'study_analytics',
        action: 'computed',
      },
    }).catch(() => {})

    if (data.userId) {
      enqueue({
        topic: 'notification',
        data: {
          userId: data.userId,
          type: 'analysis-complete',
          title: 'Analysis ready',
          message: 'Your study results have been analyzed and are ready to view.',
          studyId: data.studyId,
        },
      }).catch(() => {})
    }

    logger.info(`Analytics computed and cached for study ${data.studyId}`)
  } catch (error) {
    logger.error('Error processing results analysis', { error, studyId: data.studyId })
  }
}

async function processCardSortAnalysis(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger, state }: Pick<EventHandlerContext, 'logger' | 'state'>
) {
  const { data: cards } = await supabase
    .from('cards')
    .select('id, label, position')
    .eq('study_id', studyId)
    .order('position')

  if (!cards || cards.length === 0) {
    logger.info(`No cards found for study ${studyId}`)
    return
  }

  const { data: responses } = await supabase
    .from('card_sort_responses')
    .select('participant_id, card_placements, category_assignments')
    .eq('study_id', studyId)

  if (!responses || responses.length === 0) {
    logger.info(`No responses found for study ${studyId}`)
    return
  }

  const participantResponses: ParticipantResponse[] = responses.map(toParticipantResponse)

  logger.info(`Computing analysis for ${participantResponses.length} responses with ${cards.length} cards`)

  const similarityResult = computeSimilarityMatrix(participantResponses, cards)

  const dendrogramMethod: LinkageMethod =
    participantResponses.length < WARD_PARTICIPANT_THRESHOLD ? 'ward' : 'average'

  const dendrogram = buildDendrogram(
    similarityResult.matrix,
    similarityResult.cardLabels,
    dendrogramMethod
  )
  const suggestedClusters = suggestClusterCount(dendrogram)
  const naturalClusters = findNaturalClusters(similarityResult, 70)

  // Blob shape must match what get-analysis.step.ts caches/returns, since
  // both write the same cache key and the API serves the blob verbatim
  const analyticsData = {
    similarityMatrix: similarityResult,
    dendrogram,
    dendrogramMethod,
    optimalOrder: getDendrogramOrder(dendrogram),
    suggestedClusters,
    topSimilarPairs: getTopSimilarPairs(similarityResult, 10),
    naturalClusters,
    computedAt: new Date().toISOString(),
    responseCount: participantResponses.length,
  }

  await state.set('card-sort-analysis', studyId, analyticsData)
  cache.set(cacheKeys.cardSortAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`Card Sort analytics cached for study ${studyId} (${participantResponses.length} responses)`)

  return analyticsData
}

async function processTreeTestAnalysis(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger }: Pick<EventHandlerContext, 'logger'>
) {
  logger.info(`Computing Tree Test analytics for study ${studyId}`)

  const { data: study } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  if (!study) {
    logger.info(`No study found for ${studyId}`)
    return null
  }

  const [tasksResult, nodesResult, responsesResult, participantsResult] = await Promise.all([
    supabase.from('tasks').select('*').eq('study_id', studyId).order('position'),
    supabase.from('tree_nodes').select('*').eq('study_id', studyId),
    supabase.from('tree_test_responses').select('*').eq('study_id', studyId),
    supabase.from('participants').select('*').eq('study_id', studyId),
  ])

  const tasks = tasksResult.data || []
  const nodes = nodesResult.data || []
  const responses = responsesResult.data || []
  const participants = participantsResult.data || []

  if (responses.length === 0) {
    logger.info(`No responses found for study ${studyId}`)
    return null
  }

  const analytics = computeTreeTestMetrics(tasks as any, nodes as any, responses as any, participants as any)

  const analyticsData = {
    ...analytics,
    computedAt: new Date().toISOString(),
    responseCount: responses.length,
  }

  cache.set(cacheKeys.treeTestAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`Tree Test analytics cached for study ${studyId} (${responses.length} responses)`)

  return analyticsData
}

async function processPrototypeTestAnalysis(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger }: Pick<EventHandlerContext, 'logger'>
) {
  logger.info(`Computing Prototype Test analytics for study ${studyId}`)

  const [tasksResult, taskAttemptsResult, participantsResult] = await Promise.all([
    supabase.from('prototype_test_tasks').select('*').eq('study_id', studyId).order('position'),
    supabase.from('prototype_test_task_attempts').select('*').eq('study_id', studyId),
    supabase.from('participants').select('*').eq('study_id', studyId),
  ])

  const tasks = tasksResult.data || []
  const taskAttempts = taskAttemptsResult.data || []
  const participants = participantsResult.data || []

  if (taskAttempts.length === 0) {
    logger.info(`No task attempts found for study ${studyId}`)
    return null
  }

  const { computePrototypeTestMetrics } = await import('../../lib/algorithms/prototype-test-analysis')
  const analytics = computePrototypeTestMetrics(tasks as any, taskAttempts as any, participants as any)

  const analyticsData = {
    ...analytics,
    computedAt: new Date().toISOString(),
    responseCount: taskAttempts.length,
  }

  cache.set(cacheKeys.prototypeTestAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`Prototype Test analytics cached for study ${studyId} (${taskAttempts.length} task attempts)`)

  return analyticsData
}

async function processFirstClickAnalysis(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger }: Pick<EventHandlerContext, 'logger'>
) {
  logger.info(`Computing First Click analytics for study ${studyId}`)

  const [tasksResult, responsesResult, participantsResult] = await Promise.all([
    supabase.from('first_click_tasks').select(`
      *,
      image:first_click_images(*),
      aois:first_click_aois(*)
    `).eq('study_id', studyId).order('position'),
    supabase.from('first_click_responses').select('*').eq('study_id', studyId),
    supabase.from('participants').select('*').eq('study_id', studyId),
  ])

  const tasks = tasksResult.data || []
  const responses = responsesResult.data || []
  const participants = participantsResult.data || []

  if (responses.length === 0) {
    logger.info(`No responses found for study ${studyId}`)
    return null
  }

  const { calculateMetrics } = await import('../../services/results/first-click')
  const analytics = (calculateMetrics as any)(tasks, responses, participants)

  const analyticsData = {
    ...analytics,
    computedAt: new Date().toISOString(),
    responseCount: responses.length,
  }

  cache.set(cacheKeys.firstClickAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`First Click analytics cached for study ${studyId} (${responses.length} responses)`)

  return analyticsData
}

async function processSurveyAnalytics(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger }: Pick<EventHandlerContext, 'logger'>
) {
  logger.info(`Computing Survey analytics for study ${studyId}`)

  // Response rows are only needed for their COUNT (head-only), and the old
  // flow-questions fetch was destructured into a hole — both were pure waste.
  const [participantsResult, flowResponsesCountResult] = await Promise.all([
    supabase.from('participants').select('id, status, started_at, completed_at').eq('study_id', studyId),
    supabase.from('study_flow_responses').select('id', { count: 'exact', head: true }).eq('study_id', studyId),
  ])

  const participants = participantsResult.data || []
  const flowResponseCount = flowResponsesCountResult.count || 0

  if (participants.length === 0) {
    logger.info(`No participants found for study ${studyId}`)
    return null
  }

  const completedParticipants = participants.filter(p => p.status === 'completed')
  const abandonedParticipants = participants.filter(p => p.status === 'abandoned')
  const totalParticipants = participants.length

  const completionTimes = completedParticipants
    .filter(p => p.started_at && p.completed_at)
    .map(p => new Date(p.completed_at!).getTime() - new Date(p.started_at!).getTime())

  const avgCompletionTimeMs = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
    : 0

  const completionRate = totalParticipants > 0
    ? Math.round((completedParticipants.length / totalParticipants) * 100)
    : 0

  const analyticsData = {
    stats: {
      totalParticipants,
      completedParticipants: completedParticipants.length,
      abandonedParticipants: abandonedParticipants.length,
      completionRate,
      avgCompletionTimeMs,
    },
    computedAt: new Date().toISOString(),
    responseCount: flowResponseCount,
  }

  cache.set(cacheKeys.surveyAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`Survey analytics cached for study ${studyId} (${totalParticipants} participants, ${flowResponseCount} responses)`)

  return analyticsData
}

async function processFirstImpressionAnalysis(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  { logger }: Pick<EventHandlerContext, 'logger'>
) {
  logger.info(`Computing First Impression analytics for study ${studyId}`)

  const analyticsData = {
    computedAt: new Date().toISOString(),
    note: 'First Impression analytics computed on-demand (lightweight)',
  }

  cache.set(cacheKeys.firstImpressionAnalytics(studyId), analyticsData, cacheTTL.results)

  logger.info(`First Impression analytics cached for study ${studyId}`)

  return analyticsData
}
