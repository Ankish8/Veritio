import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { computeTreeTestMetrics } from '../../lib/algorithms/tree-test-analysis'
import {
  fetchAllTreeTestResponses,
} from './pagination'
import type { ServiceResult } from './types'
import { createResultsService } from './base-results-service'
import {
  getCachedOverallMetrics,
  setCachedOverallMetrics,
  setCachedTaskMetrics,
} from '../../lib/cache/metrics-cache'

type SupabaseClientType = SupabaseClient<Database>

export interface TreeTestOverviewData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'tree_test'
    status: string | null
    share_code: string | null
    settings: unknown
    launched_at: string | null
    created_at: string | null
  }
  tasks: unknown[]
  nodes: unknown[]
  responses: unknown[]
  participants: unknown[]
  metrics: ReturnType<typeof computeTreeTestMetrics>
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

const treeTestResultsService = createResultsService({
  studyType: 'tree_test',

  fetchSmallTables: async (supabase, studyId) => {
    const [tasksResult, nodesResult, postTaskResponsesResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('tree_nodes')
        .select('*')
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('tree_test_post_task_responses')
        .select('*')
        .eq('study_id', studyId),
    ])

    return {
      tasks: tasksResult.data || [],
      nodes: nodesResult.data || [],
      postTaskResponses: postTaskResponsesResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllTreeTestResponses(supabase, studyId),
  }),

  computeAnalysis: async (data) => {
    const studyId = data.study.id
    const responses = data.responses as any

    const cached = getCachedOverallMetrics(studyId, responses)
    if (cached) {
      return cached
    }

    const metrics = computeTreeTestMetrics(
      data.tasks as any,
      data.nodes as any,
      responses,
      data.participants as any
    )

    setCachedOverallMetrics(studyId, responses, metrics)
    for (const taskMetric of metrics.taskMetrics || []) {
      setCachedTaskMetrics(studyId, taskMetric.taskId, responses, taskMetric)
    }

    return metrics
  },
})

export async function getTreeTestOverview(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<TreeTestOverviewData>> {
  const result = await treeTestResultsService.getOverview(supabase, studyId)

  if (result.data) {
    return {
      data: {
        ...result.data,
        postTaskResponses: (result.data as any).postTaskResponses || [],
        metrics: result.data.analysis as ReturnType<typeof computeTreeTestMetrics>,
        analysis: undefined,
      } as any,
      error: null,
    }
  }

  return result as unknown as ServiceResult<TreeTestOverviewData>
}
