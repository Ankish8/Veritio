import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deactivateInviteCode } from '../../../services/invite-code-service'

export const config = {
  name: 'AdminDeactivateInviteCode',
  description: 'Deactivate an invite code',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/admin/invite-codes/:id',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const codeId = req.pathParams?.id as string
  const userId = req.headers['x-user-id'] as string

  const supabase = getMotiaSupabaseClient()
  const result = await deactivateInviteCode(supabase, codeId, logger)

  if (!result.success) {
    return {
      status: 500,
      body: { error: result.error },
    }
  }

  enqueue({
    topic: 'admin-audit-log',
    data: {
      userId,
      action: 'invite_code_deactivated',
      resourceType: 'invite_code',
      resourceId: codeId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
