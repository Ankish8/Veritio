import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listParticipants } from '../../../services/admin-service'

export const config = {
  name: 'AdminListParticipants',
  description: 'List all participants with study info',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/participants',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '0'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '25'), 10)
  const status = req.queryParams.status ? String(req.queryParams.status) : undefined

  logger.info('Listing participants', { page, limit, status })

  const supabase = getMotiaSupabaseClient()
  const result = await listParticipants(supabase, page, limit, { status }, logger)

  return {
    status: 200,
    body: result,
  }
}
