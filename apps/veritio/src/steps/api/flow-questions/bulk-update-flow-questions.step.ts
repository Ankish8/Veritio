import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { bulkUpdateFlowQuestions } from '../../../services/flow-question-service'
import { flowQuestionSectionSchema, bulkFlowQuestionSchema } from '../../../services/types'

// Schema for bulk update - wrapped in object to match builder's request format
const bulkUpdateFlowQuestionsSchema = z.object({
  questions: z.array(bulkFlowQuestionSchema),
})

export const config = {
  name: 'BulkUpdateFlowQuestions',
  description: 'Bulk update flow questions (for reordering)',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/studies/:studyId/flow-questions',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    bodySchema: bulkUpdateFlowQuestionsSchema as any,
  }],
  enqueues: ['flow-questions-bulk-updated'],
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
  const body = bulkUpdateFlowQuestionsSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  // Extract questions array from the wrapped body
  const { data: questions, error } = await bulkUpdateFlowQuestions(
    supabase,
    params.studyId,
    body.questions,
    query.section
  )

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'flow-questions-bulk-updated',
    data: { resourceType: 'flow-question', action: 'bulk-update', userId, studyId: params.studyId, count: questions?.length || 0 },
  }).catch(() => {}) // Fire-and-forget

  return {
    status: 200,
    body: { data: questions },
  }
}
