import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { createOrganizationSchema } from '../../../lib/supabase/collaboration-types'

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
  name: 'CreateOrganization',
  description: 'Create a new organization',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/organizations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createOrganizationSchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({
      error: z.string(),
      code: z.string().optional(),
      requiredPlan: z.string().optional(),
    }) as any,
    409: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(createOrganizationSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { name, slug, sourceOrganizationId } = validation.data

  logger.info('Creating organization', { userId, name, slug, sourceOrganizationId })

  return {
    status: 400,
    body: {
      error: 'Team workspaces are created by upgrading your current workspace to Team.',
    },
  }
}
