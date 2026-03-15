import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  fetchAllCardSortResponses,
  CATEGORY_STANDARDIZATION_COLUMNS,
} from './pagination'
import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'

type SupabaseClientType = SupabaseClient<Database>

export interface CardSortOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'card_sort'
    status: string | null
    share_code: string | null
    settings: unknown
    launched_at: string | null
    created_at: string | null
  }
  cards: unknown[]
  categories: unknown[]
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  responses: unknown[]
  participants: unknown[]
  analysis: null // Empty - lazy loaded by Analysis tab for better initial load performance
  standardizations: unknown[]
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

const cardSortResultsService = createResultsService({
  studyType: 'card_sort',

  fetchSmallTables: async (supabase, studyId) => {
    const { data: study } = await supabase
      .from('studies')
      .select('cards(*), categories(*)')
      .eq('id', studyId)
      .single()

    const standardizationsResult = await supabase
      .from('category_standardizations')
      .select(CATEGORY_STANDARDIZATION_COLUMNS)
      .eq('study_id', studyId)

    interface CardType {
      id: string
      label: string
      position?: number
    }

    const cards: CardType[] = ((study?.cards as CardType[] | null) || []).sort((a, b) => {
      return (a.position ?? 0) - (b.position ?? 0)
    })

    return {
      cards,
      categories: study?.categories || [],
      standardizations: standardizationsResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllCardSortResponses(supabase, studyId),
  }),

  computeAnalysis: async () => null,
})

export async function getCardSortOverview(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<CardSortOverviewData>> {
  const result = await cardSortResultsService.getOverview(supabase, studyId)
  return result as unknown as ServiceResult<CardSortOverviewData>
}
