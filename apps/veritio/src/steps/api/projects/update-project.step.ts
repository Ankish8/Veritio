import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateProject } from '../../../services/project-service'
import { updateProjectSchema } from '../../../services/types'
import { classifyError } from '../../../lib/api/classify-error'

const responseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'UpdateProject',
  description: 'Update a project',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/projects/:projectId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateProjectSchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['project-updated'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.pathParams

  const validation = validateRequest(updateProjectSchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Updating project', { userId, projectId })

  const supabase = getMotiaSupabaseClient()
  const { data: project, error } = await updateProject(supabase, projectId, userId, validation.data)

  if (error) {
    return classifyError(error, logger, 'Update project', {
      fallbackMessage: 'Failed to update project',
    })
  }

  logger.info('Project updated successfully', { userId, projectId })

  enqueue({
    topic: 'project-updated',
    data: { resourceType: 'project', resourceId: projectId, action: 'update', userId, projectId },
  }).catch(() => {})

  return {
    status: 200,
    body: project!,
  }
}
