import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireSuperadmin } from '../../../middlewares/superadmin.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { validateRequest } from '../../../lib/api/validate-request'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { setOrgPlan } from '../../../services/entitlements-service'

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  plan: z
    .enum([
      'starter',
      'pro',
      'team',
      'legacy',
      // Education tiers are provisioned here: sold by invoice / purchase order,
      // so there is no self-serve checkout path that could set them.
      'edu_classroom',
      'edu_department',
      'edu_campus',
    ])
    .optional(),
  plan_status: z.enum(['trialing', 'active', 'past_due', 'canceled']).optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  extra_seats: z.number().int().min(0).max(10000).optional(),
  /** End of a fixed access term (education semester / academic year). */
  access_ends_at: z.string().datetime().nullable().optional(),
})

export const config = {
  name: 'AdminSetOrganizationPlan',
  description: 'Manually set an organization plan/status/seats (superadmin; pre-billing)',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/admin/organizations/plan',
    middleware: [authMiddleware, requireSuperadmin, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['admin-audit-log'],
  flows: ['admin'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { organizationId, ...patch } = validation.data
  logger.info('Setting organization plan', { userId, organizationId, patch })

  const supabase = getMotiaSupabaseClient()
  const { error } = await setOrgPlan(supabase, organizationId, patch)
  if (error) {
    return { status: 500, body: { error: 'Failed to update organization plan' } }
  }

  enqueue({
    topic: 'admin-audit-log',
    data: { userId, action: 'organization_plan_updated', resourceType: 'organization', resourceId: organizationId, metadata: patch },
  }).catch(() => {})

  return { status: 200, body: { success: true } }
}
