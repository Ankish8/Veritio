import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelIncentiveService } from '../../../../services/panel/index'

export const config = {
  name: 'GetIncentiveStats',
  description: 'Get overall incentive statistics for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/incentives/stats',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Getting incentive stats', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelIncentiveService(supabase)

  try {
    const stats = await service.getUserStats(userId, organizationId)

    logger.info('Incentive stats fetched', { userId })

    return {
      status: 200,
      body: stats,
    }
  } catch (error) {
    logger.error('Failed to get incentive stats', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get incentive statistics' },
    }
  }
}
