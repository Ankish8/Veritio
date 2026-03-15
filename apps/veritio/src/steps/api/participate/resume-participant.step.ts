import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getStudyStatusErrorMessage } from '../../../services/participant/types'
import type { StudyStatusForError } from '../../../services/participant/types'

export const config = {
  name: 'ResumeParticipant',
  description: 'Resume a participant session using resume token (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/participate/:shareCode/resume/:resumeToken',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
  resumeToken: z.string().min(1),
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, status, title')
    .or(`share_code.eq.${params.shareCode},url_slug.eq.${params.shareCode}`)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.status !== 'active') {
    return {
      status: 410,
      body: { error: getStudyStatusErrorMessage(study.status as StudyStatusForError) },
    }
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, session_token, status, metadata, started_at')
    .eq('study_id', study.id)
    .eq('session_token', params.resumeToken)
    .single()

  if (participantError || !participant) {
    return {
      status: 404,
      body: { error: 'Resume session not found or expired' },
    }
  }

  if (participant.status === 'completed') {
    return {
      status: 410,
      body: { error: 'This survey has already been completed' },
    }
  }

  const metadata = (participant.metadata as Record<string, unknown>) || {}
  const savedProgress = metadata.saved_progress as {
    currentStep?: string
    currentQuestionIndex?: number
    responses?: Array<{ questionId: string; value: unknown }>
    saved_at?: string
    expires_at?: string
  } | undefined

  if (savedProgress?.expires_at && new Date(savedProgress.expires_at) < new Date()) {
    return {
      status: 410,
      body: { error: 'Resume link has expired' },
    }
  }

  const { data: dbResponses } = await supabase
    .from('study_flow_responses')
    .select('question_id, response_value')
    .eq('participant_id', participant.id)

  let savedResponses: Array<{ questionId: string; value: unknown }> = []

  if (savedProgress?.responses && savedProgress.responses.length > 0) {
    savedResponses = savedProgress.responses
  } else if (dbResponses && dbResponses.length > 0) {
    savedResponses = dbResponses.map(r => ({
      questionId: r.question_id,
      value: r.response_value,
    }))
  }

  return {
    status: 200,
    body: {
      data: {
        participantId: participant.id,
        sessionToken: participant.session_token,
        status: participant.status,
        startedAt: participant.started_at,
        currentStep: savedProgress?.currentStep || null,
        currentQuestionIndex: savedProgress?.currentQuestionIndex ?? 0,
        savedResponses,
        responseCount: savedResponses.length,
      },
    },
  }
}
