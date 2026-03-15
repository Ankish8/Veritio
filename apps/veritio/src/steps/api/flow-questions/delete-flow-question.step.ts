import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteFlowQuestion } from '../../../services/flow-question-service'

export const config = {
  name: 'DeleteFlowQuestion',
  description: 'Delete a flow question',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/flow-questions/:questionId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['flow-question-deleted'],
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
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { success, error } = await deleteFlowQuestion(supabase, params.questionId, params.studyId)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'flow-question-deleted',
    data: { resourceType: 'flow-question', resourceId: params.questionId, action: 'delete', userId, studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
