import type { StepConfig } from '@/lib/motia/types'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listInviteCodes, getInviteCodeStats } from '../../../services/invite-code-service'

export const config = {
  name: 'AdminListInviteCodes',
  description: 'List all invite codes with stats',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/invite-codes',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const page = parseInt(String(req.queryParams.page ?? '1'), 10)
  const limit = parseInt(String(req.queryParams.limit ?? '25'), 10)

  const supabase = getMotiaSupabaseClient()

  const [list, stats] = await Promise.all([
    listInviteCodes(supabase, page, limit, logger),
    getInviteCodeStats(supabase),
  ])

  return {
    status: 200,
    body: {
      codes: list.data,
      total: list.total,
      stats,
    },
  }
}
