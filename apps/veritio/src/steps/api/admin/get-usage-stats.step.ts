import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUsageStats } from '../../../services/admin-service'

export const config = {
  name: 'AdminGetUsageStats',
  description: 'Get platform usage statistics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/usage',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (_req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Fetching usage stats')

  const supabase = getMotiaSupabaseClient()
  const stats = await getUsageStats(supabase, logger)

  return {
    status: 200,
    body: stats,
  }
}
