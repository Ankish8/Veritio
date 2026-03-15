import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getOrganizationDetail } from '../../../services/admin-service'

export const config = {
  name: 'AdminGetOrganizationDetail',
  description: 'Get detailed organization profile for admin',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/organizations/:orgId',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const orgId = req.pathParams.orgId
  logger.info('Getting organization detail', { orgId })
  const supabase = getMotiaSupabaseClient()
  const detail = await getOrganizationDetail(supabase, orgId, logger)
  return { status: 200, body: detail }
}
