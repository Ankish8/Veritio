import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listFlowQuestions } from '../../../services/flow-question-service'
import { flowQuestionSectionSchema } from '../../../services/types'

export const config = {
  name: 'ListFlowQuestions',
  description: 'List all flow questions for a study (screening, pre-study, post-study)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/flow-questions',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['flow-questions-listed'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const querySchema = z.object({
  section: flowQuestionSectionSchema.optional(),
})

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: questions, error } = await listFlowQuestions(supabase, params.studyId, query.section, userId)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'flow-questions-listed',
    data: { resourceType: 'flow-question', action: 'list', userId, studyId: params.studyId, count: questions?.length || 0 },
  }).catch(() => {})

  return {
    status: 200,
    body: questions || [],
  }
}
