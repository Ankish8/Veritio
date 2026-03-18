import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listPendingInvitations } from '../../../services/invitation-service'
import { classifyError } from '../../../lib/api/classify-error'

const invitationSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  invite_type: z.string(),
  email: z.string().nullable(),
  invite_token: z.string().nullable(),
  max_uses: z.number().nullable(),
  uses_count: z.number(),
  role: z.string(),
  invited_by_user_id: z.string(),
  message: z.string().nullable(),
  expires_at: z.string().nullable(),
  status: z.string(),
  accepted_at: z.string().nullable(),
  accepted_by_user_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

const responseSchema = z.array(invitationSchema)

export const config = {
  name: 'ListInvitations',
  description: 'List pending invitations for an organization (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations/:id/invitations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = req.pathParams?.id as string

  if (!organizationId) {
    return {
      status: 400,
      body: { error: 'Organization ID is required' },
    }
  }

  logger.info('Listing invitations', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: invitations, error } = await listPendingInvitations(supabase, organizationId, userId)

  if (error) {
    return classifyError(error, logger, 'List invitations', {
      fallbackMessage: 'Failed to fetch invitations',
    })
  }

  logger.info('Invitations listed successfully', { userId, organizationId, count: invitations?.length || 0 })

  return {
    status: 200,
    body: invitations || [],
  }
}
