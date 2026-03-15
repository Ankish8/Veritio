import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getTreeTestResults } from '../../../services/results-service'

export const config = {
  name: 'GetTreeTestResults',
  description: 'Get tree test study results with metrics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/tree-test-results',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: ['results-fetched'],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { enqueue }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await getTreeTestResults(supabase, params.studyId)

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message === 'This endpoint is only for tree test studies') {
      return {
        status: 400,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  enqueue({
    topic: 'results-fetched',
    data: { resourceType: 'results', action: 'tree-test-results', studyId: params.studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: data,
  }
}
