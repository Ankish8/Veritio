import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { addOrganizationMember } from '../../../services/organization-service'
import { addOrganizationMemberSchema, type InviteAssignableRole } from '../../../lib/supabase/collaboration-types'
import { classifyError } from '../../../lib/api/classify-error'

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
  name: 'AddOrganizationMember',
  description: 'Add a member directly to organization (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/organizations/:id/members',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: addOrganizationMemberSchema as any,
    responseSchema: {
    201: memberSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    409: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['member-added'],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = req.pathParams?.id as string

  if (!organizationId) {
    return {
      status: 400,
      body: { error: 'Organization ID is required' },
    }
  }

  const validation = validateRequest(addOrganizationMemberSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { user_id: targetUserId, role } = validation.data

  logger.info('Adding member to organization', { userId, organizationId, targetUserId, role })

  const supabase = getMotiaSupabaseClient()
  const { data: member, error } = await addOrganizationMember(
    supabase,
    organizationId,
    userId,
    targetUserId,
    role as InviteAssignableRole
  )

  if (error) {
    return classifyError(error, logger, 'Add member', {
      fallbackMessage: 'Failed to add member',
    })
  }

  logger.info('Member added successfully', { userId, organizationId, targetUserId })

  enqueue({
    topic: 'member-added',
    data: {
      organizationId,
      actorUserId: userId,
      targetUserId,
      role,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: member!,
  }
}
