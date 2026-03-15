import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getClickEventsForStudy } from '../../../services/results/prototype-test-clicks'
import type { PageVisitFilter } from '../../../types/analytics'

export const config = {
  name: 'GetClickEvents',
  description: 'Get click events for prototype test click maps and heatmaps',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/click-events',
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
  frameId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  pageVisit: z.enum(['all', 'first', 'second', 'third', 'fourth_plus']).optional(),
})

export const handler = async (
  req: ApiRequest,
  _ctx: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await getClickEventsForStudy(supabase, params.studyId, {
    taskId: query.taskId,
    frameId: query.frameId,
    participantId: query.participantId,
    pageVisit: query.pageVisit as PageVisitFilter | undefined,
  })

  if (error) {
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  return {
    status: 200,
    body: data,
  }
}
