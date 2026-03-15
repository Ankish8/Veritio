import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelSegmentService } from '../../../../services/panel/index'
import { segmentConditionSchema } from '../../../../lib/supabase/panel-types'

const bodySchema = z.object({
  conditions: z.array(segmentConditionSchema).min(1).max(20),
  limit: z.number().int().min(1).max(50).optional().default(10),
})

export const config = {
  name: 'PreviewPanelSegment',
  description: 'Preview segment results without saving',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/segments/preview',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { conditions, limit } = bodySchema.parse(req.body || {})

  logger.info('Previewing panel segment', { userId, conditionCount: conditions.length })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelSegmentService(supabase)

  try {
    const result = await service.preview(userId, organizationId, conditions as any, limit)

    logger.info('Panel segment preview complete', { userId, count: result.count })

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    logger.error('Failed to preview panel segment', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to preview segment' },
    }
  }
}
