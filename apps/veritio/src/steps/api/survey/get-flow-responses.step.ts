import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { fetchAllFlowResponses } from '../../../services/results/pagination'

export const config = {
  name: 'GetSurveyFlowResponses',
  description: 'Get survey flow responses for lazy loading (can be 10,000+ rows)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/survey-flow-responses',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const flowResponses = await fetchAllFlowResponses(supabase, params.studyId)

  return {
    status: 200,
    body: flowResponses || [],
  }
}
