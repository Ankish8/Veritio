import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  computeSimilarityMatrix,
  getTopSimilarPairs,
  findNaturalClusters,
  type ParticipantResponse,
} from '../../../lib/algorithms/similarity-matrix'
import {
  buildDendrogram,
  getDendrogramOrder,
  suggestClusterCount,
  type LinkageMethod,
} from '../../../lib/algorithms/hierarchical-clustering'
import { WARD_PARTICIPANT_THRESHOLD } from '../../../lib/constants/analysis-thresholds'
import { fetchAllRows } from '../../../services/results/pagination'
import { cache, cacheKeys, cacheTTL } from '../../../lib/cache/memory-cache'

export const config = {
  name: 'GetCardSortAnalysis',
  description: 'Get card sort analysis data (similarity matrix, dendrogram, clusters) - lazy loaded',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/card-sort-analysis',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const cachedAnalytics = cache.get<any>(cacheKeys.cardSortAnalytics(params.studyId))
  const responses = await fetchAllRows<any>(supabase, 'card_sort_responses', params.studyId)

  if (cachedAnalytics && cachedAnalytics.responseCount === responses.length) {
    return {
      status: 200,
      body: cachedAnalytics,
    }
  }

  const { data: study } = await supabase
    .from('studies')
    .select('cards(*)')
    .eq('id', params.studyId)
    .single()

  if (!study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  interface CardType {
    id: string
    label: string
    position?: number
  }

  const cards: CardType[] = ((study.cards as CardType[] | null) || []).sort((a, b) => {
    return (a.position ?? 0) - (b.position ?? 0)
  })

  const participantResponses: ParticipantResponse[] = responses.map((r) => {
    const placements: { cardId: string; categoryId: string }[] = []
    const cardPlacements = r.card_placements as Record<string, string>

    for (const [cardId, categoryLabel] of Object.entries(cardPlacements)) {
      placements.push({
        cardId,
        categoryId: categoryLabel,
      })
    }

    return {
      participantId: r.participant_id,
      placements,
    }
  })

  if (participantResponses.length === 0 || cards.length === 0) {
    return {
      status: 200,
      body: null,
    }
  }

  const similarityResult = computeSimilarityMatrix(participantResponses, cards)

  // Ward's method for small samples, UPGMA for larger datasets
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

  const analysis = {
    similarityMatrix: similarityResult,
    dendrogram,
    dendrogramMethod,
    optimalOrder,
    suggestedClusters: clusterSuggestion,
    topSimilarPairs: topPairs,
    naturalClusters,
    responseCount: responses.length,
    computedAt: new Date().toISOString(),
  }

  cache.set(cacheKeys.cardSortAnalytics(params.studyId), analysis, cacheTTL.results)

  return {
    status: 200,
    body: analysis,
  }
}
