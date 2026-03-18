import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateMemberRole } from '../../../services/organization-service'
import { ORGANIZATION_ROLES, type OrganizationRole } from '../../../lib/supabase/collaboration-types'
import { classifyError } from '../../../lib/api/classify-error'

const bodySchema = z.object({
  role: z.enum(ORGANIZATION_ROLES),
})

const memberSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string(),
  role: z.string(),
  invited_by_user_id: z.string().nullable(),
  invited_at: z.string().nullable(),
  joined_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'UpdateMemberRole',
  description: 'Update member role in organization (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/organizations/:id/members/:userId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: memberSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['member-role-updated'],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const actorUserId = req.headers['x-user-id'] as string
  const organizationId = req.pathParams?.id as string
  const targetUserId = req.pathParams?.userId as string

  if (!organizationId || !targetUserId) {
    return {
      status: 400,
      body: { error: 'Organization ID and user ID are required' },
    }
  }

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { role } = validation.data

  logger.info('Updating member role', { actorUserId, organizationId, targetUserId, role })

  const supabase = getMotiaSupabaseClient()
  const { data: member, error } = await updateMemberRole(
    supabase,
    organizationId,
    actorUserId,
    targetUserId,
    role as OrganizationRole
  )

  if (error) {
    return classifyError(error, logger, 'Update member role', {
      fallbackMessage: 'Failed to update member role',
    })
  }

  logger.info('Member role updated successfully', { actorUserId, organizationId, targetUserId, role })

  enqueue({
    topic: 'member-role-updated',
    data: {
      organizationId,
      actorUserId,
      targetUserId,
      newRole: role,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: member!,
  }
}
