import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { fetchAllParticipants, fetchAllFlowResponses } from './pagination'
import type { SurveyResultsResponse, ServiceResult } from './types'

type SupabaseClientType = SupabaseClient<Database>

export async function getSurveyResults(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ServiceResult<SurveyResultsResponse>> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, title, description, study_type, status, share_code, settings, launched_at, created_at')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { data: null, error: new Error('Study not found') }
  }

  if (study.study_type !== 'survey') {
    return { data: null, error: new Error('This endpoint is only for survey studies') }
  }

  const flowQuestionsResult = await supabase
    .from('study_flow_questions')
    .select('*')
    .eq('study_id', studyId)
    .order('position')

  const [participants, flowResponses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllFlowResponses(supabase, studyId),
  ])

  const flowQuestions = flowQuestionsResult.data || []

  const completedParticipants = participants.filter(p => p.status === 'completed')
  const abandonedParticipants = participants.filter(p => p.status === 'abandoned')
  const totalParticipants = participants.length

  const completionTimes = completedParticipants
    .filter(p => p.started_at && p.completed_at)
    .map(p => new Date(p.completed_at!).getTime() - new Date(p.started_at!).getTime())

  const avgCompletionTimeMs = completionTimes.length > 0
    ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
    : 0

  const completionRate = totalParticipants > 0
    ? Math.round((completedParticipants.length / totalParticipants) * 100)
    : 0

  return {
    data: {
      study: {
        id: study.id,
        title: study.title,
        description: study.description,
        study_type: study.study_type as 'survey',
        status: study.status,
        share_code: study.share_code,
        settings: study.settings,
        launched_at: study.launched_at,
        created_at: study.created_at,
      },
      stats: {
        totalParticipants,
        completedParticipants: completedParticipants.length,
        abandonedParticipants: abandonedParticipants.length,
        completionRate,
        avgCompletionTimeMs,
      },
      participants,
      flowQuestions,
      flowResponses,
    },
    error: null,
  }
}
