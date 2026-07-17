import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Participant, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { fetchAllParticipants, fetchAllFlowResponses } from './pagination'
import type { SurveyResultsResponse, ServiceResult } from './types'
import {
  evaluateSurveyCompletion,
  getAllowSkipQuestions,
  type CompletionQuestion,
  type StoredQuestionResponse,
} from '../participant/submissions/survey'

type SupabaseClientType = SupabaseClient<Database>

function getLatestResponseCreatedAt(responses: StudyFlowResponseRow[]): string | null {
  let latest: string | null = null

  for (const response of responses) {
    if (!response.created_at) continue
    if (!latest || new Date(response.created_at).getTime() > new Date(latest).getTime()) {
      latest = response.created_at
    }
  }

  return latest
}

async function repairStaleSurveyCompletions(
  supabase: SupabaseClientType,
  studyId: string,
  settings: unknown,
  participants: Participant[],
  flowQuestions: StudyFlowQuestionRow[],
  flowResponses: StudyFlowResponseRow[]
): Promise<Participant[]> {
  const allowSkipQuestions = getAllowSkipQuestions(settings)
  const questions = flowQuestions as unknown as CompletionQuestion[]
  const responsesByParticipant = new Map<string, StudyFlowResponseRow[]>()

  for (const response of flowResponses) {
    const existing = responsesByParticipant.get(response.participant_id) ?? []
    existing.push(response)
    responsesByParticipant.set(response.participant_id, existing)
  }

  const repairs: Array<{ participantId: string; completedAt: string }> = []

  for (const participant of participants) {
    if (participant.status === 'completed') continue

    const participantResponses = responsesByParticipant.get(participant.id) ?? []
    if (participantResponses.length === 0) continue

    const completion = evaluateSurveyCompletion(
      questions,
      participantResponses as unknown as StoredQuestionResponse[],
      allowSkipQuestions,
      { requireAllVisibleQuestions: true }
    )

    if (!completion.isComplete || completion.visibleQuestionCount === 0) continue

    repairs.push({
      participantId: participant.id,
      completedAt: getLatestResponseCreatedAt(participantResponses) ?? new Date().toISOString(),
    })
  }

  if (repairs.length === 0) return participants

  // Each repair carries its own completed_at, so rows can't be collapsed into one
  // UPDATE; chunk instead so a large backlog doesn't fire hundreds of concurrent requests.
  const REPAIR_CHUNK_SIZE = 25
  for (let i = 0; i < repairs.length; i += REPAIR_CHUNK_SIZE) {
    const chunk = repairs.slice(i, i + REPAIR_CHUNK_SIZE)
    const updateResults = await Promise.all(
      chunk.map(({ participantId, completedAt }) =>
        supabase
          .from('participants')
          .update({ status: 'completed', completed_at: completedAt })
          .eq('id', participantId)
          .eq('study_id', studyId)
          .neq('status', 'completed')
      )
    )

    const failedUpdate = updateResults.find((result) => result.error)
    if (failedUpdate?.error) {
      throw new Error(`Failed to repair survey completion status: ${failedUpdate.error.message}`)
    }
  }

  const repairedByParticipantId = new Map(
    repairs.map(({ participantId, completedAt }) => [participantId, completedAt])
  )

  return participants.map((participant) => {
    const completedAt = repairedByParticipantId.get(participant.id)
    if (!completedAt) return participant

    return {
      ...participant,
      status: 'completed',
      completed_at: completedAt,
    }
  })
}

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

  const [rawParticipants, flowResponses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllFlowResponses(supabase, studyId),
  ])

  const flowQuestions = flowQuestionsResult.data || []
  let participants = rawParticipants

  try {
    participants = await repairStaleSurveyCompletions(
      supabase,
      studyId,
      study.settings,
      rawParticipants,
      flowQuestions,
      flowResponses
    )
  } catch (repairError) {
    console.warn(
      '[getSurveyResults] Failed to repair stale survey completions',
      repairError instanceof Error ? repairError.message : repairError
    )
  }

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
