import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getOverviewStats } from '../../../services/admin-service'

export const config = {
  name: 'AdminGetOverview',
  description: 'Get admin panel overview statistics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/overview',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Fetching admin overview stats')

  const supabase = getMotiaSupabaseClient()
  const stats = await getOverviewStats(supabase, logger)

  return {
    status: 200,
    body: stats,
  }
}

