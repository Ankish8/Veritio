import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototypeTestResults } from '../../../services/results-service'

export const config = {
  name: 'GetPrototypeTestResults',
  description: 'Get prototype test study results with metrics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype-test-results',
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
  _ctx: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await getPrototypeTestResults(supabase, params.studyId)

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message === 'This endpoint is only for prototype test studies') {
      return {
        status: 400,
        body: { error: error.message },
      }
    }
    console.error(`[GetPrototypeTestResults]`, error instanceof Error ? error.message : error)
    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }

  return {
    status: 200,
    body: data,
  }
}
