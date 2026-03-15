import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUsersPageStats } from '../../../services/admin-service'

export const config = {
  name: 'AdminGetUsersPageStats',
  description: 'Get analytics stats for users page',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/users-stats',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  logger.info('Getting users page stats')
  const supabase = getMotiaSupabaseClient()
  const stats = await getUsersPageStats(supabase, logger)
  return { status: 200, body: stats }
}
