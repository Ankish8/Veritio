import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listOrganizationMembers } from '../../../services/organization-service'
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
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
})

const responseSchema = z.array(memberSchema)

export const config = {
  name: 'ListOrganizationMembers',
  description: 'List all members of an organization',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations/:id/members',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
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

  logger.info('Listing organization members', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: members, error } = await listOrganizationMembers(supabase, organizationId, userId)

  if (error) {
    return classifyError(error, logger, 'List members', {
      fallbackMessage: 'Failed to fetch members',
    })
  }

  logger.info('Members listed successfully', { userId, organizationId, count: members?.length || 0 })

  return {
    status: 200,
    body: members || [],
  }
}
