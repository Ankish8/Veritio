import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelSegmentService } from '../../../../services/panel/index'
import { createSegmentSchema } from '../../../../lib/supabase/panel-types'
import { classifyError } from '../../../../lib/api/classify-error'

export const config = {
  name: 'CreatePanelSegment',
  description: 'Create a new panel segment',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/segments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createSegmentSchema as any,
  }],
  enqueues: ['panel-segment-created'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const body = createSegmentSchema.parse(req.body || {})

  logger.info('Creating panel segment', { userId, name: body.name })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelSegmentService(supabase)

  try {
    const segment = await service.create(userId, organizationId, body as any)

    logger.info('Panel segment created successfully', { userId, segmentId: segment.id })

    enqueue({
      topic: 'panel-segment-created',
      data: { resourceType: 'panel-segment', action: 'create', userId, segmentId: segment.id },
    }).catch(() => {})

    return {
      status: 201,
      body: segment,
    }
  } catch (error) {
    return classifyError(error, logger, 'Create panel segment', {
      fallbackMessage: 'Failed to create segment',
    })
  }
}
