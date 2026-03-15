import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listUserOrganizations } from '../../../services/organization-service'

const responseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    avatar_url: z.string().nullable(),
    settings: z.record(z.unknown()),
    is_personal: z.boolean(),
    created_by_user_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
    member_count: z.number(),
    current_user_role: z.string().optional(),
    user_role: z.string().optional(), // Alias for frontend compatibility
  })
)

export const config = {
  name: 'ListOrganizations',
  description: 'List all organizations the current user belongs to',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/organizations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['organization-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Listing organizations', { userId })

  const supabase = getMotiaSupabaseClient()
  const { data: organizations, error } = await listUserOrganizations(supabase, userId)

  if (error) {
    logger.error('Failed to list organizations', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch organizations' },
    }
  }

  logger.info('Organizations listed successfully', { userId, count: organizations?.length || 0 })

  return {
    status: 200,
    body: organizations || [],
  }
}
