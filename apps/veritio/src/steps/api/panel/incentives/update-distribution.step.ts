import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'
import { updateDistributionStatusSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  distributionId: z.string().uuid(),
})

export const config = {
  name: 'UpdateIncentiveDistribution',
  description: 'Update an incentive distribution status',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/panel/incentives/:distributionId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateDistributionStatusSchema as any,
  }],
  enqueues: ['incentive-distribution-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { distributionId } = paramsSchema.parse(req.pathParams)
  const body = updateDistributionStatusSchema.parse(req.body || {})

  logger.info('Updating incentive distribution', { userId, distributionId, status: body.status })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const distribution = await service.updateDistribution(distributionId, body)

    logger.info('Incentive distribution updated', { userId, distributionId })

    enqueue({
      topic: 'incentive-distribution-updated',
      data: {
        resourceType: 'incentive-distribution',
        action: 'update',
        userId,
        distributionId,
        status: body.status
      },
    }).catch(() => {})

    return {
      status: 200,
      body: distribution,
    }
  } catch (error) {
    logger.error('Failed to update incentive distribution', {
      userId,
      distributionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update distribution' },
    }
  }
}
