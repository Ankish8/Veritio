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
  /** True when the raw `participants`/`flowResponses` arrays were omitted to shrink the payload. */
  rawOmitted?: boolean
}

export interface SurveyOverviewOptions {
  /**
   * When false, omit the raw `participants`/`flowResponses` arrays from the
   * payload (stats are still computed server-side from the full data). Defaults
   * to true so all existing callers behave exactly as before.
   */
  includeRaw?: boolean
}

const surveyResultsService = createResultsService({
  studyType: 'survey',

  fetchSmallTables: async () => ({}),
  fetchLargeTables: async () => ({ responses: [] }),
  computeAnalysis: async () => null,
})

export async function getSurveyOverview(
  supabase: SupabaseClientType,
  studyId: string,
  options: SurveyOverviewOptions = {}
): Promise<ServiceResult<SurveyOverviewData>> {
  const includeRaw = options.includeRaw ?? true
  const result = await surveyResultsService.getOverview(supabase, studyId)

  if (includeRaw || !result.data) {
    return result as unknown as ServiceResult<SurveyOverviewData>
  }

  // Strip the heavy raw arrays from the payload; stats/flowQuestions stay.
  const data = result.data as unknown as SurveyOverviewData
  return {
    data: {
      ...data,
      participants: [],
      flowResponses: [],
      rawOmitted: true,
    },
    error: null,
  }
}
