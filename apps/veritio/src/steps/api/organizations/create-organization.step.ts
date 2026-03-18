import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createOrganization } from '../../../services/organization-service'
import { createOrganizationSchema } from '../../../lib/supabase/collaboration-types'
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
    409: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['organization-created'],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(createOrganizationSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { name, slug, avatar_url, settings } = validation.data

  logger.info('Creating organization', { userId, name, slug })

  const supabase = getMotiaSupabaseClient()
  const { data: organization, error } = await createOrganization(supabase, userId, {
    name,
    slug,
    avatar_url,
    settings,
  })

  if (error) {
    return classifyError(error, logger, 'Create organization', {
      fallbackMessage: 'Failed to create organization',
    })
  }

  logger.info('Organization created successfully', { userId, organizationId: organization?.id })

  enqueue({
    topic: 'organization-created',
    data: {
      organizationId: organization!.id,
      userId,
      name: organization!.name,
      slug: organization!.slug,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: organization!,
  }
}
