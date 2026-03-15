import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listAuditLogs } from '../../../services/audit-log-service'

export const config = {
  name: 'AdminListAuditLogs',
  description: 'List audit log entries with filters',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/audit-log',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '0'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '50'), 10)
  const action = req.queryParams.action ? String(req.queryParams.action) : undefined
  const resourceType = req.queryParams.resourceType ? String(req.queryParams.resourceType) : undefined
  const dateFrom = req.queryParams.dateFrom ? String(req.queryParams.dateFrom) : undefined
  const dateTo = req.queryParams.dateTo ? String(req.queryParams.dateTo) : undefined

  logger.info('Listing audit logs', { page, limit, action, resourceType })

  const supabase = getMotiaSupabaseClient()
  const result = await listAuditLogs(supabase, { page, limit, action, resourceType, dateFrom, dateTo }, logger)

  return {
    status: 200,
    body: result,
  }
}
