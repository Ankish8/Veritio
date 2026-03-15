import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listProjects, listArchivedProjects } from '../../../services/project-service'

const querySchema = z.object({
  archived: z.coerce.boolean().optional().default(false),
  organizationId: z.string().uuid().optional(),
})

const responseSchema = z.array(
  z.object({
    id: z.string().uuid(),
    user_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    is_archived: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    study_count: z.number(),
  })
)

export const config = {
  name: 'ListProjects',
  description: 'List all projects for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/projects',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Listing projects', { userId, archived: query.archived, organizationId: query.organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: projects, error } = query.archived
    ? await listArchivedProjects(supabase, userId, query.organizationId)
    : await listProjects(supabase, userId, { organizationId: query.organizationId })

  if (error) {
    logger.error('Failed to list projects', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch projects' },
    }
  }

  logger.info('Projects listed successfully', { userId, count: projects?.length || 0 })

  return {
    status: 200,
    body: projects || [],
  }
}
