import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteABTest } from '../../../services/ab-test-service'

export const config = {
  name: 'DeleteABTest',
  description: 'Delete an A/B test',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/ab-tests/:abTestId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['ab-testing'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  abTestId: z.string().uuid(),
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { error } = await deleteABTest(supabase, params.abTestId)

  if (error) {
    if (error.message === 'A/B test not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 204,
    body: null,
  }
}
