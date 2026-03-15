import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getProject } from '../../../services/project-service'

const responseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'GetProject',
  description: 'Get a single project by ID',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/projects/:projectId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['project-fetched'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.pathParams

  logger.info('Getting project', { userId, projectId })

  const supabase = getMotiaSupabaseClient()
  const { data: project, error } = await getProject(supabase, projectId, userId)

  if (error) {
    if (error.message === 'Project not found') {
      logger.warn('Project not found', { userId, projectId })
      return {
        status: 404,
        body: { error: 'Project not found' },
      }
    }

    logger.error('Failed to get project', { userId, projectId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch project' },
    }
  }

  logger.info('Project fetched successfully', { userId, projectId })

  enqueue({
    topic: 'project-fetched',
    data: { resourceType: 'project', resourceId: projectId, action: 'get', userId, projectId },
  }).catch(() => {})

  return {
    status: 200,
    body: project!,
  }
}
