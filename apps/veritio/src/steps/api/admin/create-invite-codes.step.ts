import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createInviteCodes } from '../../../services/invite-code-service'

const bodySchema = z.object({
  label: z.string().max(100).optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  count: z.number().int().min(1).max(50).optional().default(1),
})

export const config = {
  name: 'AdminCreateInviteCodes',
  description: 'Generate new invite codes',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/admin/invite-codes',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body)
  const userId = req.headers['x-user-id'] as string

  const supabase = getMotiaSupabaseClient()
  const result = await createInviteCodes(supabase, body, userId, logger)

  if (result.error || !result.data) {
    return {
      status: 500,
      body: { error: result.error },
    }
  }

  enqueue({
    topic: 'admin-audit-log',
    data: {
      userId,
      action: 'invite_codes_created',
      resourceType: 'invite_code',
      resourceId: result.data[0]?.id,
      metadata: { count: result.data.length, label: body.label },
    },
  }).catch(() => {})

  return {
    status: 201,
    body: { codes: result.data },
  }
}
