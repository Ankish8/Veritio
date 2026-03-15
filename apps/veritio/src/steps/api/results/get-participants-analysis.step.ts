import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetParticipantsAnalysis',
  description: 'Get all participants with their flags and exclusion status for analysis',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/participants-analysis',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['participants-analysis-fetched'],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, study_type')
    .eq('id', params.studyId)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.study_type !== 'card_sort') {
    return {
      status: 400,
      body: { error: 'This endpoint is only for card sort studies' },
    }
  }

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, study_id, status, started_at, completed_at')
    .eq('study_id', params.studyId)
    .order('started_at', { ascending: false })

  if (participantsError) {
    logger.error('Failed to fetch participants', {
      studyId: params.studyId,
      error: participantsError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch participants' },
    }
  }

  const { data: flags, error: flagsError } = await supabase
    .from('participant_analysis_flags')
    .select('*')
    .eq('study_id', params.studyId)

  if (flagsError) {
    logger.error('Failed to fetch participant flags', {
      studyId: params.studyId,
      error: flagsError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch participant flags' },
    }
  }

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('id, label, position')
    .eq('study_id', params.studyId)
    .order('position')

  if (cardsError) {
    logger.error('Failed to fetch cards', {
      studyId: params.studyId,
      error: cardsError.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch cards' },
    }
  }

  const flagsByParticipant = new Map<string, typeof flags>()
  const exclusionStatus = new Map<string, boolean>()

  for (const flag of flags || []) {
    if (!flagsByParticipant.has(flag.participant_id)) {
      flagsByParticipant.set(flag.participant_id, [])
    }
    flagsByParticipant.get(flag.participant_id)!.push(flag)

    if (flag.is_excluded) {
      exclusionStatus.set(flag.participant_id, true)
    }
  }

  const participantsWithFlags = (participants || []).map((participant) => ({
    ...participant,
    flags: flagsByParticipant.get(participant.id) || [],
    isExcluded: exclusionStatus.get(participant.id) || false,
  }))

  enqueue({
    topic: 'participants-analysis-fetched',
    data: {
      resourceType: 'participants-analysis',
      action: 'get',
      studyId: params.studyId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      participants: participantsWithFlags,
      cards: cards || [],
    },
  }
}
