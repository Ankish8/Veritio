import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetExcludedParticipants',
  description: 'Get all excluded participant IDs for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/excluded-participants',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: flags, error } = await supabase
    .from('participant_analysis_flags')
    .select('participant_id')
    .eq('study_id', params.studyId)
    .eq('is_excluded', true)

  if (error) {
    logger.error('Failed to fetch excluded participants', {
      studyId: params.studyId,
      error: error.message,
    })
    return {
      status: 500,
      body: { error: 'Failed to fetch excluded participants' },
    }
  }

  const excludedIds = [...new Set((flags || []).map(f => f.participant_id))]

  return {
    status: 200,
    body: { excludedIds },
  }
}
