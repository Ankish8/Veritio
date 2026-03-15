import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelSegmentService } from '../../../../services/panel/index'

export const config = {
  name: 'ListPanelSegments',
  description: 'List all panel segments for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/segments',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-segments-listed'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Listing panel segments', { userId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelSegmentService(supabase)

  try {
    const segments = await service.list(userId, organizationId)

    logger.info('Panel segments listed successfully', { userId, count: segments.length })

    enqueue({
      topic: 'panel-segments-listed',
      data: { resourceType: 'panel-segment', action: 'list', userId, count: segments.length },
    }).catch(() => {})

    return {
      status: 200,
      body: segments,
    }
  } catch (error) {
    logger.error('Failed to list panel segments', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to list segments' },
    }
  }
}
