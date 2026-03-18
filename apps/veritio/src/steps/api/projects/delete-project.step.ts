import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireProjectManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteProject } from '../../../services/project-service'
import { classifyError } from '../../../lib/api/classify-error'

export const config = {
  name: 'DeleteProject',
  description: 'Delete a project',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/projects/:projectId',
    middleware: [authMiddleware, requireProjectManager(), errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['project-deleted'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.pathParams

  logger.info('Deleting project', { userId, projectId })

  const supabase = getMotiaSupabaseClient()
  const { success, error } = await deleteProject(supabase, projectId, userId)

  if (error) {
    return classifyError(error, logger, 'Delete project', {
      fallbackMessage: 'Failed to delete project',
    })
  }

  logger.info('Project deleted successfully', { userId, projectId })

  enqueue({
    topic: 'project-deleted',
    data: { resourceType: 'project', resourceId: projectId, action: 'delete', userId, projectId },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
