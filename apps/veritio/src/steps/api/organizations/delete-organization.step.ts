import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteOrganization } from '../../../services/organization-service'

export const config = {
  name: 'DeleteOrganization',
  description: 'Delete an organization (soft delete, requires owner role)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/organizations/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['organization-deleted'],
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

  logger.info('Deleting organization', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { error } = await deleteOrganization(supabase, organizationId, userId)

  if (error) {
    if (error.message.includes('Permission denied')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to delete organization', { userId, organizationId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to delete organization' },
    }
  }

  logger.info('Organization deleted successfully', { userId, organizationId })

  enqueue({
    topic: 'organization-deleted',
    data: {
      organizationId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
