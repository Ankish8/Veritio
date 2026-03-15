import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { computePrototypeTestMetrics } from '../../lib/algorithms/prototype-test-analysis'
import { fetchAllParticipants, fetchAllFlowResponses, fetchAllRows } from './pagination'
import type { PrototypeTestResultsResponse, ServiceResult } from './types'

type SupabaseClientType = SupabaseClient<Database>

async function fetchAllTaskAttempts(
  supabase: SupabaseClientType,
  studyId: string
) {
  return fetchAllRows<Database['public']['Tables']['prototype_test_task_attempts']['Row']>(
    supabase,
    'prototype_test_task_attempts',
    studyId
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

  let metrics
  try {
    metrics = computePrototypeTestMetrics(tasks, taskAttempts, participants)
  } catch (err) {
    return {
      data: null,
      error: new Error(`Metrics computation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
      postTaskResponses: [],
    },
    error: null,
  }
}
