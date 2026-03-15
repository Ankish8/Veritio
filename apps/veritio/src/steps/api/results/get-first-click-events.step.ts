import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getFirstClickEvents } from '../../../services/results/first-click-clicks'

export const config = {
  name: 'GetFirstClickEvents',
  description: 'Get click events for first-click test click maps and heatmaps',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-click-events',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['results-analysis'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const querySchema = z.object({
  taskId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await getFirstClickEvents(supabase, studyId, {
    taskId: query.taskId,
    participantId: query.participantId,
  })

  if (error) {
    return { status: 500, body: { error: error.message } }
  }

  return { status: 200, body: data }
}
