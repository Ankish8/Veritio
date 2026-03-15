import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPrototype } from '../../../services/prototype-service'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

export const config = {
  name: 'GetPrototype',
  description: 'Get prototype info for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string

  const { data: prototype, error } = await getPrototype(supabase, params.studyId, userId)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 200,
    body: { data: prototype },
  }
}
