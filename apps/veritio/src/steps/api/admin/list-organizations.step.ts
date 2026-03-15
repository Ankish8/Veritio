import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listOrganizations } from '../../../services/admin-service'

export const config = {
  name: 'AdminListOrganizations',
  description: 'List all organizations with owner and member info',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/organizations',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '0'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '25'), 10)

  logger.info('Listing organizations', { page, limit })

  const supabase = getMotiaSupabaseClient()
  const result = await listOrganizations(supabase, page, limit, logger)

  return {
    status: 200,
    body: result,
  }
}
