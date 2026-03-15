import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { revokeInvitation } from '../../../services/invitation-service'

export const config = {
  name: 'RevokeInvitation',
  description: 'Revoke an invitation (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/invitations/:invitationId/revoke',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['invitation-revoked'],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const invitationId = req.pathParams?.invitationId as string

  if (!invitationId) {
    return {
      status: 400,
      body: { error: 'Invitation ID is required' },
    }
  }

  logger.info('Revoking invitation', { userId, invitationId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await revokeInvitation(supabase, invitationId, userId)

  if (error) {
    if (error.message.includes('Permission denied')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Invitation not found' },
      }
    }
    if (error.message.includes('Cannot revoke')) {
      return {
        status: 400,
        body: { error: error.message },
      }
    }
    logger.error('Failed to revoke invitation', { userId, invitationId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to revoke invitation' },
    }
  }

  logger.info('Invitation revoked successfully', { userId, invitationId })

  enqueue({
    topic: 'invitation-revoked',
    data: {
      invitationId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
