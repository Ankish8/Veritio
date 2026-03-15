import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getInvitationByToken } from '../../../services/invitation-service'

// Public endpoint - no auth required (to preview invitation before login)
const responseSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  invite_type: z.string(),
  email: z.string().nullable(),
  role: z.string(),
  expires_at: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    avatar_url: z.string().nullable(),
  }),
})

export const config = {
  name: 'GetInvitationByToken',
  description: 'Get invitation details by token (public - for preview)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/invitations/:token',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    404: z.object({ error: z.string() }) as any,
    410: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const token = req.pathParams?.token as string

  if (!token) {
    return {
      status: 400,
      body: { error: 'Invitation token is required' },
    }
  }

  logger.info('Getting invitation by token', { token: token.slice(0, 8) + '...' })

  const supabase = getMotiaSupabaseClient()
  const { data: invitation, error } = await getInvitationByToken(supabase, token)

  if (error) {
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Invitation not found' },
      }
    }
    if (error.message.includes('expired')) {
      return {
        status: 410,
        body: { error: 'Invitation has expired' },
      }
    }
    logger.error('Failed to get invitation', { error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch invitation' },
    }
  }

  // Don't expose sensitive fields like invite_token in the response
  const response = {
    id: invitation!.id,
    organization_id: invitation!.organization_id,
    invite_type: invitation!.invite_type,
    email: invitation!.email,
    role: invitation!.role,
    expires_at: invitation!.expires_at,
    status: invitation!.status,
    created_at: invitation!.created_at,
    organization: invitation!.organization,
  }

  return {
    status: 200,
    body: response,
  }
}
