import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { removeMember } from '../../../services/organization-service'

export const config = {
  name: 'RemoveOrganizationMember',
  description: 'Remove a member from organization (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/organizations/:id/members/:userId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['member-removed'],
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

  logger.info('Removing member from organization', { actorUserId, organizationId, targetUserId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await removeMember(supabase, organizationId, actorUserId, targetUserId)

  if (error) {
    if (error.message.includes('Permission denied') || error.message.includes('Only owners') || error.message.includes('Cannot remove')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    logger.error('Failed to remove member', { actorUserId, organizationId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to remove member' },
    }
  }

  logger.info('Member removed successfully', { actorUserId, organizationId, targetUserId })

  enqueue({
    topic: 'member-removed',
    data: {
      organizationId,
      actorUserId,
      targetUserId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
