import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  createEmailInvitation,
  createInviteLink,
} from '../../../services/invitation-service'
import {
  createEmailInvitationSchema,
  createLinkInvitationSchema,
  type InviteAssignableRole,
} from '../../../lib/supabase/collaboration-types'

const bodySchema = z.discriminatedUnion('type', [
  createEmailInvitationSchema.extend({ type: z.literal('email') }),
  createLinkInvitationSchema.extend({ type: z.literal('link') }),
])

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

export const config = {
  name: 'CreateInvitation',
  description: 'Create an invitation to join an organization (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/organizations/:id/invitations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: invitationSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    409: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['invitation-created'],
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

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  const supabase = getMotiaSupabaseClient()
  let result

  if (validation.data.type === 'email') {
    logger.info('Creating email invitation', { userId, organizationId, email: validation.data.email })
    result = await createEmailInvitation(
      supabase,
      organizationId,
      userId,
      validation.data.email,
      validation.data.role as InviteAssignableRole,
      {
        message: validation.data.message,
        expiresInDays: validation.data.expires_in_days,
      }
    )
  } else {
    logger.info('Creating invite link', { userId, organizationId, role: validation.data.role })
    result = await createInviteLink(
      supabase,
      organizationId,
      userId,
      validation.data.role as InviteAssignableRole,
      {
        maxUses: validation.data.max_uses,
        expiresInDays: validation.data.expires_in_days,
      }
    )
  }

  if (result.error) {
    if (result.error.message.includes('Permission denied')) {
      return {
        status: 403,
        body: { error: result.error.message },
      }
    }
    if (result.error.message.includes('already a member') || result.error.message.includes('already exists')) {
      return {
        status: 409,
        body: { error: result.error.message },
      }
    }
    logger.error('Failed to create invitation', { userId, organizationId, error: result.error.message })
    return {
      status: 500,
      body: { error: 'Failed to create invitation' },
    }
  }

  logger.info('Invitation created successfully', { userId, organizationId, invitationId: result.data?.id })

  enqueue({
    topic: 'invitation-created',
    data: {
      organizationId,
      invitationId: result.data!.id,
      inviteType: validation.data.type,
      userId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: result.data!,
  }
}
