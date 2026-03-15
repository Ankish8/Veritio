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

export const config = {
  name: 'DeletePanelSegment',
  description: 'Delete a panel segment',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/panel/segments/:segmentId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-segment-deleted'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { segmentId } = paramsSchema.parse(req.pathParams)

  logger.info('Deleting panel segment', { userId, segmentId })

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

    await service.delete(userId, organizationId, segmentId)

    logger.info('Panel segment deleted successfully', { userId, segmentId })

    enqueue({
      topic: 'panel-segment-deleted',
      data: { resourceType: 'panel-segment', action: 'delete', userId, segmentId },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to delete panel segment', {
      userId,
      segmentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to delete segment' },
    }
  }
}
