import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listStudies } from '../../../services/admin-service'

export const config = {
  name: 'AdminListStudies',
  description: 'List all studies with filters and participant counts',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/studies',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '0'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '25'), 10)
  const status = req.queryParams.status ? String(req.queryParams.status) : undefined
  const type = req.queryParams.type ? String(req.queryParams.type) : undefined
  const search = req.queryParams.search ? String(req.queryParams.search) : undefined

  logger.info('Listing studies', { page, limit, status, type, search })

  const supabase = getMotiaSupabaseClient()
  const result = await listStudies(supabase, page, limit, { status, type, search }, logger)

  return {
    status: 200,
    body: result,
  }
}
