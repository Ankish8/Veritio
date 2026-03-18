import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateOrganization } from '../../../services/organization-service'
import { updateOrganizationSchema } from '../../../lib/supabase/collaboration-types'

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
})

export const config = {
  name: 'UpdateOrganization',
  description: 'Update organization details (requires admin role)',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/organizations/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateOrganizationSchema as any,
    responseSchema: {
    200: responseSchema as any,
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
  enqueues: ['organization-updated'],
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

  const validation = validateRequest(updateOrganizationSchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Updating organization', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: organization, error } = await updateOrganization(
    supabase,
    organizationId,
    userId,
    validation.data
  )

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
        body: { error: 'Organization not found' },
      }
    }
    if (error.message.includes('already taken')) {
      return {
        status: 409,
        body: { error: error.message },
      }
    }
    logger.error('Failed to update organization', { userId, organizationId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to update organization' },
    }
  }

  logger.info('Organization updated successfully', { userId, organizationId })

  enqueue({
    topic: 'organization-updated',
    data: {
      organizationId: organization!.id,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: organization!,
  }
}
