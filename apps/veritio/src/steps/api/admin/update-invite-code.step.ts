import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateInviteCode } from '../../../services/invite-code-service'

const bodySchema = z.object({
  label: z.string().max(100).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const config = {
  name: 'AdminUpdateInviteCode',
  description: 'Update an invite code',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/admin/invite-codes/:id',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body)
  const codeId = req.pathParams?.id as string
  const userId = req.headers['x-user-id'] as string

  const supabase = getMotiaSupabaseClient()
  const result = await updateInviteCode(supabase, codeId, body, logger)

  if (result.error) {
    return {
      status: 500,
      body: { error: result.error },
    }
  }

  enqueue({
    topic: 'admin-audit-log',
    data: {
      userId,
      action: 'invite_code_updated',
      resourceType: 'invite_code',
      resourceId: codeId,
      metadata: body,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: result.data,
  }
}
