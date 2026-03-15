import type { SupabaseClient } from '@supabase/supabase-js'
import type { ServiceResult } from './types'
import { calculateMetrics, type FirstClickMetrics } from './first-click'
import { createResultsService } from './base-results-service'

export interface FirstClickOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'first_click'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  tasks: {
    id: string
    instruction: string
    position: number
    study_id: string
    created_at: string
    post_task_questions: unknown
  }[]
  responses: unknown[]
  participants: unknown[]
  metrics: FirstClickMetrics
  flowQuestions: unknown[]
  flowResponses: unknown[]
  postTaskResponses: unknown[]
}

const firstClickResultsService = createResultsService({
  studyType: 'first_click',

  fetchSmallTables: async (supabase, studyId) => {
    const [tasksResult, postTaskResponsesResult] = await Promise.all([
      supabase
        .from('first_click_tasks')
        .select('id, instruction, position, study_id, created_at, post_task_questions')
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('first_click_post_task_responses')
        .select('*')
        .eq('study_id', studyId),
    ])

    return {
      tasks: tasksResult.data || [],
      postTaskResponses: postTaskResponsesResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => {
    const responsesResult = await supabase
      .from('first_click_responses')
      .select('*')
      .eq('study_id', studyId)

    return { responses: responsesResult.data || [] }
  },

  computeAnalysis: async (data) => {
    return calculateMetrics(data.tasks as any, data.responses as any, data.participants as any)
  },
})

export async function getFirstClickOverview(
  supabase: SupabaseClient,
  studyId: string
): Promise<ServiceResult<FirstClickOverviewData>> {
  const result = await firstClickResultsService.getOverview(supabase, studyId)

  if (!result.data) {
    return { data: null, error: result.error || new Error('Failed to fetch overview') }
  }

  const { analysis, ...rest } = result.data
  return {
    data: { ...rest, metrics: analysis as FirstClickMetrics } as unknown as FirstClickOverviewData,
    error: null,
  }
}
