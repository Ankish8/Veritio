import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelSegmentService } from '../../../../services/panel/index'
import { updateSegmentSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  segmentId: z.string().uuid(),
})

export const config = {
  name: 'UpdatePanelSegment',
  description: 'Update a panel segment',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/panel/segments/:segmentId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateSegmentSchema as any,
  }],
  enqueues: ['panel-segment-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { segmentId } = paramsSchema.parse(req.pathParams)
  const body = updateSegmentSchema.parse(req.body || {})

  logger.info('Updating panel segment', { userId, segmentId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelSegmentService(supabase)

  try {
    const existing = await service.get(userId, organizationId, segmentId)
    if (!existing) {
      logger.warn('Panel segment not found', { userId, segmentId })
      return {
        status: 404,
        body: { error: 'Segment not found' },
      }
    }

    const segment = await service.update(userId, organizationId, segmentId, body as any)

    logger.info('Panel segment updated successfully', { userId, segmentId })

    enqueue({
      topic: 'panel-segment-updated',
      data: { resourceType: 'panel-segment', action: 'update', userId, segmentId },
    }).catch(() => {})

    return {
      status: 200,
      body: segment,
    }
  } catch (error) {
    logger.error('Failed to update panel segment', {
      userId,
      segmentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update segment' },
    }
  }
}
