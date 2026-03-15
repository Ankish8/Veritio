import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'
import { bulkMarkSentSchema } from '../../../../lib/supabase/panel-types'

export const config = {
  name: 'BulkMarkDistributionsSent',
  description: 'Mark multiple distributions as sent',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/incentives/bulk-mark-sent',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bulkMarkSentSchema as any,
  }],
  enqueues: ['incentive-distributions-bulk-sent'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const body = bulkMarkSentSchema.parse(req.body || {})

  logger.info('Bulk marking distributions as sent', {
    userId,
    count: body.distribution_ids.length,
    method: body.fulfillment_method
  })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const updatedCount = await service.bulkMarkSent(
      body.distribution_ids,
      body.fulfillment_method,
      body.fulfillment_reference,
      body.notes
    )

    logger.info('Distributions bulk marked as sent', { userId, updatedCount })

    enqueue({
      topic: 'incentive-distributions-bulk-sent',
      data: {
        resourceType: 'incentive-distribution',
        action: 'bulk-update',
        userId,
        updatedCount
      },
    }).catch(() => {})

    return {
      status: 200,
      body: { updated_count: updatedCount },
    }
  } catch (error) {
    logger.error('Failed to bulk mark distributions as sent', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to mark distributions as sent' },
    }
  }
}
