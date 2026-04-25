import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getInviteCodeUsages } from '../../../services/invite-code-service'

export const config = {
  name: 'AdminGetInviteCodeUsages',
  description: 'Get usage details for an invite code',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/admin/invite-codes/:id/usages',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const codeId = req.pathParams?.id as string

  const supabase = getMotiaSupabaseClient()
  const usages = await getInviteCodeUsages(supabase, codeId, logger)

  return {
    status: 200,
    body: { usages },
  }
}
