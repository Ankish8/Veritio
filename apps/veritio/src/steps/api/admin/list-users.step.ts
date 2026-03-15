import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listUsers } from '../../../services/admin-service'

export const config = {
  name: 'AdminListUsers',
  description: 'List all users with org and study counts',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/users',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '0'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '25'), 10)

  logger.info('Listing users', { page, limit })

  const supabase = getMotiaSupabaseClient()
  const result = await listUsers(supabase, page, limit, logger)

  return {
    status: 200,
    body: result,
  }
}
