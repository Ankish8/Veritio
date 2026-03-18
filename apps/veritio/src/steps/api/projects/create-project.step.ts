import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireOrgManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createProject } from '../../../services/project-service'
import { createProjectSchema } from '../../../services/types'

const responseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'CreateProject',
  description: 'Create a new project',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/projects',
    middleware: [authMiddleware, requireOrgManager(), errorHandlerMiddleware],
    bodySchema: createProjectSchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['project-created'],
  flows: ['project-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const validation = validateRequest(createProjectSchema, req.body, logger)
  if (!validation.success) return validation.response

  const { name, description, organizationId } = validation.data

  logger.info('Creating project', { userId, name, organizationId })

  const supabase = getMotiaSupabaseClient()
  const { data: project, error } = await createProject(supabase, userId, { name, description, organizationId })

  if (error) {
    if (error.message.includes('Permission denied')) {
      logger.warn('Permission denied for project creation', { userId, error: error.message })
      return {
        status: 403,
        body: { error: error.message },
      }
    }

    logger.error('Failed to create project', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to create project' },
    }
  }

  logger.info('Project created successfully', { userId, projectId: project?.id })

  enqueue({
    topic: 'project-created',
    data: {
      projectId: project!.id,
      userId,
      name: project!.name,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: project!,
  }
}
