import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createFlowQuestion } from '../../../services/flow-question-service'
import { createFlowQuestionSchema } from '../../../services/types'

export const config = {
  name: 'CreateFlowQuestion',
  description: 'Create a new flow question for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/flow-questions',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: createFlowQuestionSchema as any,
  }],
  enqueues: ['flow-question-created'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = createFlowQuestionSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: question, error } = await createFlowQuestion(supabase, params.studyId, body)

  if (error) {
    return {
      status: 400,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'flow-question-created',
    data: { resourceType: 'flow-question', resourceId: question!.id, action: 'create', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 201,
    body: { data: question },
  }
}
