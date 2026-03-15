import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { restoreProject } from '../../../services/project-service'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const responseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  is_archived: z.boolean(),
})

export const config = {
  name: 'RestoreProject',
  description: 'Restore an archived project and all its studies',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/projects/:id/restore',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['project-restored'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { id: projectId } = paramsSchema.parse(req.pathParams)

  logger.info('Restoring project', { userId, projectId })

  const supabase = getMotiaSupabaseClient()
  const { data: project, error } = await restoreProject(supabase, projectId, userId)

  if (error) {
    if (error.message === 'Project not found') {
      return {
        status: 404,
        body: { error: 'Project not found' },
      }
    }
    if (error.message.includes('Permission denied')) {
      logger.warn('Permission denied for project restore', { userId, projectId, error: error.message })
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    logger.error('Failed to restore project', { userId, projectId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to restore project' },
    }
  }

  logger.info('Project restored successfully', { userId, projectId })

  enqueue({
    topic: 'project-restored',
    data: { resourceType: 'project', action: 'restore', userId, resourceId: projectId },
  }).catch(() => {})

  return {
    status: 200,
    body: { id: project!.id, name: project!.name, is_archived: project!.is_archived },
  }
}
