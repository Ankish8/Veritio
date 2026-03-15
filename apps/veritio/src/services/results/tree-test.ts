import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { computeTreeTestMetrics } from '../../lib/algorithms/tree-test-analysis'
import { fetchAllParticipants, fetchAllFlowResponses, fetchAllTreeTestResponses } from './pagination'
import type { TreeTestResultsResponse, ServiceResult } from './types'
import { cache, cacheKeys } from '../../lib/cache/memory-cache'
import {
  getCachedOverallMetrics,
  setCachedOverallMetrics,
  setCachedTaskMetrics,
} from '../../lib/cache/metrics-cache'

type SupabaseClientType = SupabaseClient<Database>

export async function getTreeTestResults(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<TreeTestResultsResponse>> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, description, study_type, status, share_code, settings, launched_at, created_at')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { data: null, error: new Error('Study not found') }
  }

  if (study.study_type !== 'tree_test') {
    return { data: null, error: new Error('This endpoint is only for tree test studies') }
  }

  const [
    tasksResult,
    nodesResult,
    flowQuestionsResult,
  ] = await Promise.all([
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
      .from('study_flow_questions')
      .select('*')
      .eq('study_id', studyId)
      .order('position'),
  ])

  const [responses, participants, flowResponses, postTaskResponsesResult] = await Promise.all([
    fetchAllTreeTestResponses(supabase, studyId),
    fetchAllParticipants(supabase, studyId),
    fetchAllFlowResponses(supabase, studyId),
    supabase
      .from('tree_test_post_task_responses')
      .select('*')
      .eq('study_id', studyId),
  ])

  if (tasksResult.error) {
    return { data: null, error: new Error(`Failed to fetch tasks: ${tasksResult.error.message}`) }
  }
  if (nodesResult.error) {
    return { data: null, error: new Error(`Failed to fetch nodes: ${nodesResult.error.message}`) }
  }

  const tasks = tasksResult.data || []
  const nodes = nodesResult.data || []
  const flowQuestions = flowQuestionsResult.data || []

  const cachedMetrics = cache.get<any>(cacheKeys.treeTestAnalytics(studyId))

  let metrics
  if (cachedMetrics && cachedMetrics.responseCount === responses.length) {
    metrics = cachedMetrics
  } else {
    const cachedOverall = getCachedOverallMetrics(studyId, responses as any)
    if (cachedOverall) {
      metrics = cachedOverall
    } else {
      try {
        metrics = computeTreeTestMetrics(tasks, nodes, responses as any, participants as any)
      } catch (err) {
        return {
          data: null,
          error: new Error(`Metrics computation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }
  }

  if (metrics) {
    setCachedOverallMetrics(studyId, responses as any, metrics)
    for (const taskMetric of metrics.taskMetrics || []) {
      setCachedTaskMetrics(studyId, taskMetric.taskId, responses as any, taskMetric)
    }
  }

  return {
    data: {
      study: {
        id: study.id,
        title: study.title,
        description: study.description,
        study_type: study.study_type as 'tree_test',
        status: study.status,
        share_code: study.share_code,
        settings: study.settings,
        launched_at: study.launched_at,
        created_at: study.created_at,
      },
      tasks,
      nodes,
      responses,
      postTaskResponses: postTaskResponsesResult.data || [],
      participants,
      metrics,
      flowQuestions,
      flowResponses,
    },
    error: null,
  }
}
