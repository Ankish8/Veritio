import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototypeTestOverview } from '../../../services/results/prototype-test-overview'

export const config = {
  name: 'GetPrototypeTestOverview',
  description: 'Get lightweight prototype test results overview for faster initial load',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype-test-results/overview',
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
  { logger: _logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const result = await getPrototypeTestOverview(supabase, params.studyId)

  if (result.error) {
    return {
      status: 500,
      body: {
        error: result.error.message,
      },
    }
  }

  return {
    status: 200,
    body: result.data!,
  }
}
