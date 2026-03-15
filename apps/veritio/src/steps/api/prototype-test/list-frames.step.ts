import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listFrames } from '../../../services/prototype-service'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'

/**
 * @deprecated Use GET /api/studies/:studyId/prototype-test-frames instead (GetPrototypeTestFrames step).
 * This endpoint is kept for backward compatibility.
 * TODO: Remove after verifying no external consumers depend on this endpoint.
 *
 * Differences from the active endpoint:
 * - This uses listFrames() service function (with caching, explicit column selection)
 * - The active endpoint uses direct supabase query (select *, ordered by position)
 * - Frontend exclusively uses /prototype-test-frames via usePrototypeTestFrames hook
 */
export const config = {
  name: 'ListPrototypeFrames',
  description: 'List all frames for a prototype',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype/frames',
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

  const { data: frames, error } = await listFrames(supabase, params.studyId, userId)

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 200,
    body: { data: frames },
  }
}
