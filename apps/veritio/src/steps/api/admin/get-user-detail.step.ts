import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUserDetail } from '../../../services/admin-service'

export const config = {
  name: 'AdminGetUserDetail',
  description: 'Get detailed user profile for admin',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/users/:userId',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.pathParams.userId
  logger.info('Getting user detail', { userId })
  const supabase = getMotiaSupabaseClient()
  const detail = await getUserDetail(supabase, userId, logger)
  return { status: 200, body: detail }
}
