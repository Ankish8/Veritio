import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'

type SupabaseClientType = SupabaseClient<Database>

export interface SurveyOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'survey'
    status: string | null
    share_code: string | null
    settings: unknown
    launched_at: string | null
    created_at: string | null
  }
  participants: unknown[]
  flowQuestions: unknown[]
  flowResponses: unknown[] // Empty initially, loaded by questions
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
}

const surveyResultsService = createResultsService({
  studyType: 'survey',

  fetchSmallTables: async () => ({}),
  fetchLargeTables: async () => ({ responses: [] }),
  computeAnalysis: async () => null,
})

export async function getSurveyOverview(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<SurveyOverviewData>> {
  const result = await surveyResultsService.getOverview(supabase, studyId)
  return result as unknown as ServiceResult<SurveyOverviewData>
}
