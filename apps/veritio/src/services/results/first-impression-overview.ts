import type { SupabaseClient } from '@supabase/supabase-js'
import type { ServiceResult } from './types'
import { calculateMetrics, type FirstImpressionMetrics } from './first-impression'
import { createResultsService } from './base-results-service'
import type { ExtendedFirstImpressionSettings } from '../../lib/supabase/study-flow-types'

export interface FirstImpressionOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'first_impression'
    status: 'draft' | 'active' | 'paused' | 'completed'
    share_code: string
    settings: ExtendedFirstImpressionSettings | null
    launched_at: string | null
    created_at: string
  }
  designs: {
    id: string
    name: string | null
    position: number
    image_url: string | null
    is_practice: boolean
    weight: number
    questions: unknown[]
  }[]
  sessions: unknown[]
  exposures: unknown[]
  responses: unknown[]
  participants: unknown[]
  metrics: FirstImpressionMetrics
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

const DESIGN_COLUMNS = 'id, name, position, image_url, is_practice, weight, questions, study_id'
const SESSION_COLUMNS = 'id, study_id, participant_id, assignment_mode, assigned_design_id, device_type, started_at, completed_at, total_time_ms'
const EXPOSURE_COLUMNS = 'id, session_id, study_id, participant_id, design_id, exposure_sequence, configured_duration_ms, actual_display_ms, exposure_started_at, exposure_ended_at'
const RESPONSE_COLUMNS = 'id, exposure_id, session_id, study_id, participant_id, design_id, question_id, response_value, response_time_ms'

const firstImpressionResultsService = createResultsService({
  studyType: 'first_impression',

  fetchSmallTables: async (supabase, studyId) => {
    const [designsResult, sessionsResult, exposuresResult] = await Promise.all([
      supabase
        .from('first_impression_designs')
        .select(DESIGN_COLUMNS)
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('first_impression_sessions')
        .select(SESSION_COLUMNS)
        .eq('study_id', studyId),
      supabase
        .from('first_impression_exposures')
        .select(EXPOSURE_COLUMNS)
        .eq('study_id', studyId),
    ])

    return {
      designs: designsResult.data || [],
      sessions: sessionsResult.data || [],
      exposures: exposuresResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => {
    const { data } = await supabase
      .from('first_impression_responses')
      .select(RESPONSE_COLUMNS)
      .eq('study_id', studyId)

    return {
      responses: data || [],
    }
  },

  computeAnalysis: async (data) => {
    return calculateMetrics(
      data.designs as any,
      data.sessions as any,
      data.exposures as any,
      data.responses as any,
      data.participants as any
    )
  },
})

export async function getFirstImpressionOverview(
  supabase: SupabaseClient,
  studyId: string
): Promise<ServiceResult<FirstImpressionOverviewData>> {
  const result = await firstImpressionResultsService.getOverview(supabase, studyId)

  if (result.data) {
    return {
      data: {
        ...result.data,
        metrics: result.data.analysis as FirstImpressionMetrics,
        analysis: undefined,
      } as any,
      error: null,
    }
  }

  return result as unknown as ServiceResult<FirstImpressionOverviewData>
}
