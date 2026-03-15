import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { computePrototypeTestMetrics } from '../../lib/algorithms/prototype-test-analysis'
import { fetchAllPrototypeTestResponses } from './pagination'
import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'

type SupabaseClientType = SupabaseClient<Database>

export interface PrototypeTestOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'prototype_test'
    status: string | null
    share_code: string | null
    settings: unknown
    launched_at: string | null
    created_at: string | null
  }
  tasks: unknown[]
  responses: unknown[]
  participants: unknown[]
  metrics: ReturnType<typeof computePrototypeTestMetrics>
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

const prototypeTestResultsService = createResultsService({
  studyType: 'prototype_test',

  fetchSmallTables: async (supabase, studyId) => {
    const [tasksResult, postTaskResponsesResult] = await Promise.all([
      supabase
        .from('prototype_test_tasks')
        .select('*')
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('prototype_test_post_task_responses')
        .select('*')
        .eq('study_id', studyId),
    ])

    return {
      tasks: tasksResult.data || [],
      postTaskResponses: postTaskResponsesResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllPrototypeTestResponses(supabase, studyId),
  }),

  computeAnalysis: async (data) => {
    return computePrototypeTestMetrics(data.tasks as any, data.responses as any, data.participants as any)
  },
})

export async function getPrototypeTestOverview(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<PrototypeTestOverviewData>> {
  const result = await prototypeTestResultsService.getOverview(supabase, studyId)

  if (result.data) {
    const { responses, ...rest } = result.data as typeof result.data & { responses: unknown[] }
    return {
      data: {
        ...rest,
        taskAttempts: responses ?? [],
        postTaskResponses: (result.data as any).postTaskResponses || [],
        metrics: result.data.analysis as ReturnType<typeof computePrototypeTestMetrics>,
        frames: [],
        sessions: [],
        analysis: undefined,
      } as any,
      error: null,
    }
  }

  return result as unknown as ServiceResult<PrototypeTestOverviewData>
}
