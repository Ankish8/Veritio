import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import { computePrototypeTestMetrics } from '../algorithms/prototype-test-analysis'
import { fetchAllPrototypeTestResponses } from './pagination'
import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'

// Use `any` to accept SupabaseClient with any Database schema (app vs package)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = SupabaseClient<any>
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
// PROTOTYPE TEST RESULTS SERVICE (Using Base Service Template)

const prototypeTestResultsService = createResultsService({
  studyType: 'prototype_test',

  fetchSmallTables: async (supabase, studyId) => {
    const tasksResult = await supabase
      .from('prototype_test_tasks')
      .select('*')
      .eq('study_id', studyId)
      .order('position')

    return {
      tasks: tasksResult.data || [],
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
    return {
      data: {
        ...result.data,
        metrics: result.data.analysis as ReturnType<typeof computePrototypeTestMetrics>,
        analysis: undefined,
      } as any,
      error: null,
    }
  }

  return result as unknown as ServiceResult<PrototypeTestOverviewData>
}
