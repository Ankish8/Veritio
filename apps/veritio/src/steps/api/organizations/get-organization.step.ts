import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getOrganization } from '../../../services/organization-service'
import { classifyError } from '../../../lib/api/classify-error'

const responseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  avatar_url: z.string().nullable(),
  settings: z.record(z.unknown()),
  created_by_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  member_count: z.number(),
  current_user_role: z.string().optional(),
})

export const config = {
  name: 'GetOrganization',
  description: 'Get organization details by ID',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations/:id',
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

  logger.info('Getting organization', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: organization, error } = await getOrganization(supabase, organizationId, userId)

  if (error) {
    return classifyError(error, logger, 'Get organization', {
      fallbackMessage: 'Failed to fetch organization',
    })
  }

  logger.info('Organization fetched successfully', { userId, organizationId })

  return {
    status: 200,
    body: organization!,
  }
}
