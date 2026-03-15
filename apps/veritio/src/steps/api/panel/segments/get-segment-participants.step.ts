import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelSegmentService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  segmentId: z.string().uuid(),
})

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(500).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
})

export const config = {
  name: 'GetSegmentParticipants',
  description: 'Get participants matching a segment',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/segments/:segmentId/participants',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  if (!userId) {
    return {
      status: 401,
      body: { error: 'Unauthorized' },
    }
  }

  const { segmentId } = paramsSchema.parse(req.pathParams)
  const { limit, offset } = querySchema.parse((req as any).query || {})

  logger.info('Getting segment participants', { userId, segmentId, limit, offset })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelSegmentService(supabase)

  // Verify segment exists and belongs to org
  const segment = await service.get(userId, organizationId, segmentId)
  if (!segment) {
    return {
      status: 404,
      body: { error: 'Segment not found' },
    }
  }

  // Get matching participants
  const participants = await service.getParticipants(userId, organizationId, segmentId, limit)

  return {
    status: 200,
    body: {
      participants,
      total: segment.participant_count,
      limit,
      offset,
    },
  }
}
