import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { computePrototypeTestMetrics } from '../../lib/algorithms/prototype-test-analysis'
import { fetchAllParticipants, fetchAllFlowResponses, fetchAllRows } from './pagination'
import type { PrototypeTestResultsResponse, ServiceResult } from './types'
import { cache, cacheKeys } from '../../lib/cache/memory-cache'
import { latestCreatedAt } from '../../lib/analytics/latest-created-at'

type SupabaseClientType = SupabaseClient<Database>

async function fetchAllTaskAttempts(
  supabase: SupabaseClientType,
  studyId: string
) {
  return fetchAllRows<Database['public']['Tables']['prototype_test_task_attempts']['Row']>(
    supabase,
    'prototype_test_task_attempts',
    studyId,
    {
      // cursorColumn defaults to created_at; keep it in the column list so
      // cursor-based pagination continues to work while narrowing the rest.
      columns: `
        id, created_at, session_id, participant_id, task_id, outcome, path_taken,
        is_direct, total_time_ms, time_to_first_click_ms, click_count,
        misclick_count, backtrack_count, post_task_responses
      `.replace(/\s+/g, ' ').trim(),
    }
  )
}

async function fetchAllSessions(
  supabase: SupabaseClientType,
  studyId: string
) {
  return fetchAllRows<Database['public']['Tables']['prototype_test_sessions']['Row']>(
    supabase,
    'prototype_test_sessions',
    studyId
  )
}

async function fetchAllComponentStateEvents(
  supabase: SupabaseClientType,
  studyId: string
) {
  return fetchAllRows<Database['public']['Tables']['prototype_test_component_state_events']['Row']>(
    supabase,
    'prototype_test_component_state_events',
    studyId
  )
}

// Not using BaseResultsService: fetches more data than overview (prototype, frames, sessions, component state events)
export async function getPrototypeTestResults(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<PrototypeTestResultsResponse>> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, description, study_type, status, share_code, settings, launched_at, created_at')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { data: null, error: new Error('Study not found') }
  }

  if (study.study_type !== 'prototype_test') {
    return { data: null, error: new Error('This endpoint is only for prototype test studies') }
  }

  const [
    prototypeResult,
    tasksResult,
    framesResult,
    flowQuestionsResult,
    postTaskResponsesResult,
  ] = await Promise.all([
    supabase
      .from('prototype_test_prototypes')
      .select('*')
      .eq('study_id', studyId)
      .single(),
    supabase
      .from('prototype_test_tasks')
      .select('*')
      .eq('study_id', studyId)
      .order('position'),
    supabase
      .from('prototype_test_frames')
      .select('*')
      .eq('study_id', studyId)
      .order('position'),
    supabase
      .from('study_flow_questions')
      .select('*')
      .eq('study_id', studyId)
      .order('position'),
    // Was hardcoded to [] in the response, so the normalized post-task answers
    // never reached the full results endpoint (only the overview fetched them).
    supabase
      .from('prototype_test_post_task_responses')
      .select('*')
      .eq('study_id', studyId),
  ])

  const [taskAttempts, sessions, participants, flowResponses, componentStateEvents] = await Promise.all([
    fetchAllTaskAttempts(supabase, studyId),
    fetchAllSessions(supabase, studyId),
    fetchAllParticipants(supabase, studyId),
    fetchAllFlowResponses(supabase, studyId),
    fetchAllComponentStateEvents(supabase, studyId),
  ])

  if (tasksResult.error) {
    return { data: null, error: new Error(`Failed to fetch tasks: ${tasksResult.error.message}`) }
  }
  if (framesResult.error) {
    return { data: null, error: new Error(`Failed to fetch frames: ${framesResult.error.message}`) }
  }

  const prototype = prototypeResult.data
  const tasks = tasksResult.data || []
  const frames = framesResult.data || []
  const flowQuestions = flowQuestionsResult.data || []

  // Prefer the analytics precomputed on submission (tiered L1+Redis, written by
  // process-results-analysis.step). Accept only when it covers exactly the
  // attempt set we just fetched; strip the bookkeeping fields it appends.
  const precomputed = await cache.getTiered<
    ReturnType<typeof computePrototypeTestMetrics> & {
      computedAt?: string
      responseCount?: number
      latestAttemptAt?: string | null
    }
  >(cacheKeys.prototypeTestAnalytics(studyId))

  // Count *and* newest-attempt timestamp must both match. On count alone, a
  // delete-plus-insert between computations left the counts equal and served
  // metrics computed from a different set of attempts.
  const cacheMatchesAttempts =
    precomputed &&
    precomputed.responseCount === taskAttempts.length &&
    precomputed.latestAttemptAt === latestCreatedAt(taskAttempts)

  let metrics
  if (precomputed && cacheMatchesAttempts) {
    const {
      computedAt: _computedAt,
      responseCount: _responseCount,
      latestAttemptAt: _latestAttemptAt,
      ...precomputedMetrics
    } = precomputed
    metrics = precomputedMetrics as ReturnType<typeof computePrototypeTestMetrics>
  } else {
    try {
      metrics = computePrototypeTestMetrics(tasks, taskAttempts, participants)
    } catch (err) {
      return {
        data: null,
        error: new Error(`Metrics computation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
  }

  return {
    data: {
      study: {
        id: study.id,
        title: study.title,
        description: study.description,
        study_type: study.study_type as 'prototype_test',
        status: study.status,
        share_code: study.share_code,
        settings: study.settings,
        launched_at: study.launched_at,
        created_at: study.created_at,
      },
      prototype,
      tasks,
      frames,
      taskAttempts,
      sessions,
      participants,
      metrics,
      flowQuestions,
      flowResponses,
      componentStateEvents,
      postTaskResponses: postTaskResponsesResult.data || [],
    },
    error: null,
  }
}
