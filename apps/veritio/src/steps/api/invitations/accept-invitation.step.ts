import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { acceptInvitation } from '../../../services/invitation-service'
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
  name: 'AcceptInvitation',
  description: 'Accept an invitation to join an organization',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/invitations/:token/accept',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: memberSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    409: z.object({ error: z.string() }) as any,
    410: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['invitation-accepted'],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const token = req.pathParams?.token as string

  if (!token) {
    return {
      status: 400,
      body: { error: 'Invitation token is required' },
    }
  }

  logger.info('Accepting invitation', { userId, token: token.slice(0, 8) + '...' })

  const supabase = getMotiaSupabaseClient()
  const { data: member, error } = await acceptInvitation(supabase, token, userId)

  if (error) {
    return classifyError(error, logger, 'Accept invitation', {
      fallbackMessage: 'Failed to accept invitation',
      extraRules: [
        { pattern: 'Invalid', status: 404 },
        { pattern: 'different email', status: 403 },
      ],
    })
  }

  logger.info('Invitation accepted successfully', { userId, organizationId: member?.organization_id })

  enqueue({
    topic: 'invitation-accepted',
    data: {
      organizationId: member!.organization_id,
      userId,
      role: member!.role,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: member!,
  }
}
