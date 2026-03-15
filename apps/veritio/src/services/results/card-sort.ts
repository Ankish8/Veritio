import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  computeSimilarityMatrix,
  getTopSimilarPairs,
  findNaturalClusters,
  type ParticipantResponse,
} from '../../lib/algorithms/similarity-matrix'
import {
  buildDendrogram,
  getDendrogramOrder,
  suggestClusterCount,
  type LinkageMethod,
} from '../../lib/algorithms/hierarchical-clustering'
import { WARD_PARTICIPANT_THRESHOLD } from '../../lib/constants/analysis-thresholds'
import { fetchAllRows, fetchAllParticipants, fetchAllFlowResponses } from './pagination'
import type { CardSortResultsResponse, ServiceResult, CategoryAgreement } from './types'
import { cache, cacheKeys } from '../../lib/cache/memory-cache'

type SupabaseClientType = SupabaseClient<Database>

function computeCategoryAgreement(
  responses: ParticipantResponse[],
  cards: { id: string; label: string }[]
): Record<string, CategoryAgreement> {
  const totalResponses = responses.length
  const cardCategoryCount = new Map<string, Map<string, number>>()

  // Initialize
  for (const card of cards) {
    cardCategoryCount.set(card.id, new Map())
  }

  // Count category assignments for each card
  for (const response of responses) {
    for (const placement of response.placements) {
      const categoryMap = cardCategoryCount.get(placement.cardId)
      if (categoryMap) {
        const current = categoryMap.get(placement.categoryId) || 0
        categoryMap.set(placement.categoryId, current + 1)
      }
    }
  }

  // Transform to result format
  const result: Record<string, CategoryAgreement> = {}

  for (const card of cards) {
    const categoryMap = cardCategoryCount.get(card.id)!
    const categories = Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalResponses) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    result[card.id] = {
      cardLabel: card.label,
      categories,
    }
  }

  return result
}

export async function getCardSortResults(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<CardSortResultsResponse>> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select(`
      *,
      cards(*),
      categories(*)
    `)
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { data: null, error: new Error('Study not found') }
  }

  if (study.study_type !== 'card_sort') {
    return { data: null, error: new Error('This endpoint is only for card sort studies') }
  }

  const [standardizationsResult, flowQuestionsResult] = await Promise.all([
    supabase
      .from('category_standardizations')
      .select('*')
      .eq('study_id', studyId),
    supabase
      .from('study_flow_questions')
      .select('*')
      .eq('study_id', studyId)
      .order('section')
      .order('position'),
  ])

  const [participants, responses, flowResponses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllRows<any>(supabase, 'card_sort_responses', studyId),
    fetchAllFlowResponses(supabase, studyId),
  ])

  const totalParticipants = participants.length
  const completedParticipants = participants.filter((p) => p.status === 'completed').length
  const abandonedParticipants = participants.filter((p) => p.status === 'abandoned').length
  const completionRate = totalParticipants > 0
    ? Math.round((completedParticipants / totalParticipants) * 100)
    : 0

  const completionTimes = responses
    .filter((r) => r.total_time_ms)
    .map((r) => r.total_time_ms as number)

  const avgCompletionTime = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
    : 0

  interface CardType {
    id: string
    label: string
    position?: number
  }

  const cards: CardType[] = ((study.cards as CardType[] | null) || []).sort((a, b) => {
    return (a.position ?? 0) - (b.position ?? 0)
  })

  const participantResponses: ParticipantResponse[] = responses.map((r) => ({
    participantId: r.participant_id,
    placements: Object.entries(r.card_placements as Record<string, string>).map(
      ([cardId, categoryId]) => ({ cardId, categoryId })
    ),
  }))

  let analysis = null

  if (participantResponses.length > 0 && cards.length > 0) {
    const cachedAnalytics = cache.get<any>(cacheKeys.cardSortAnalytics(studyId))

    if (cachedAnalytics && cachedAnalytics.responseCount === participantResponses.length) {
      analysis = {
        similarityMatrix: cachedAnalytics.similarityMatrix,
        dendrogram: cachedAnalytics.dendrogram,
        optimalOrder: getDendrogramOrder(cachedAnalytics.dendrogram),
        suggestedClusters: cachedAnalytics.suggestedClusters,
        topSimilarPairs: getTopSimilarPairs(cachedAnalytics.similarityMatrix, 10),
        naturalClusters: cachedAnalytics.naturalClusters,
        categoryAgreement: computeCategoryAgreement(participantResponses, cards),
      }
    } else {
      const similarityResult = computeSimilarityMatrix(participantResponses, cards)

      // Ward's method for small samples (<30), UPGMA for larger datasets
      const dendrogramMethod: LinkageMethod =
        participantResponses.length < WARD_PARTICIPANT_THRESHOLD ? 'ward' : 'average'

      const dendrogram = buildDendrogram(
        similarityResult.matrix,
        similarityResult.cardLabels,
        dendrogramMethod
      )
      const optimalOrder = getDendrogramOrder(dendrogram)
      const clusterSuggestion = suggestClusterCount(dendrogram)
      const topPairs = getTopSimilarPairs(similarityResult, 10)
      const naturalClusters = findNaturalClusters(similarityResult, 70)
      const categoryAgreement = computeCategoryAgreement(participantResponses, cards)

      analysis = {
        similarityMatrix: similarityResult,
        dendrogram,
        dendrogramMethod,
        optimalOrder,
        suggestedClusters: clusterSuggestion,
        topSimilarPairs: topPairs,
        naturalClusters,
        categoryAgreement,
      }
    }
  }

  return {
    data: {
      study: {
        id: study.id,
        title: study.title,
        description: study.description,
        study_type: study.study_type,
        status: study.status,
        share_code: study.share_code,
        settings: study.settings,
        launched_at: study.launched_at,
        created_at: study.created_at,
      },
      cards,
      categories: study.categories || [],
      stats: {
        totalParticipants,
        completedParticipants,
        abandonedParticipants,
        completionRate,
        avgCompletionTimeMs: avgCompletionTime,
      },
      responses,
      participants,
      analysis,
      standardizations: standardizationsResult.data || [],
      flowQuestions: flowQuestionsResult.data || [],
      flowResponses,
    },
    error: null,
  }
}
