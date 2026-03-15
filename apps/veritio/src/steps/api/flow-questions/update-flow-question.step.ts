import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateFlowQuestion } from '../../../services/flow-question-service'
import { updateFlowQuestionSchema } from '../../../services/types'

export const config = {
  name: 'UpdateFlowQuestion',
  description: 'Update a flow question',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/flow-questions/:questionId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: updateFlowQuestionSchema as any,
  }],
  enqueues: ['flow-question-updated'],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  questionId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = updateFlowQuestionSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: question, error } = await updateFlowQuestion(supabase, params.questionId, params.studyId, body)

  if (error) {
    if (error.message === 'Question not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    return {
      status: 400,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'flow-question-updated',
    data: { resourceType: 'flow-question', resourceId: params.questionId, action: 'update', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: question },
  }
}
