import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireProjectManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createStudy } from '../../../services/study-service'
import { getStudyDefaults } from '../../../services/user-preferences-service'
import { createStudySchema } from '../../../services/types'
import { classifyError } from '../../../lib/api/classify-error'

const responseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string(),
  study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  share_code: z.string(),
  settings: z.any(),
  welcome_message: z.string().nullable(),
  thank_you_message: z.string().nullable(),
  launched_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'CreateStudy',
  description: 'Create a new study in a project',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/projects/:projectId/studies',
    middleware: [authMiddleware, requireProjectManager(), errorHandlerMiddleware],
    bodySchema: createStudySchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-created'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.pathParams

  const validation = validateRequest(createStudySchema, req.body, logger)
  if (!validation.success) return validation.response

  const { title, study_type, description, initial_settings } = validation.data

  logger.info('Creating study', { userId, projectId, title, studyType: study_type })

  const supabase = getMotiaSupabaseClient()

  const { data: userDefaults } = await getStudyDefaults(supabase, userId)

  const { data: study, error } = await createStudy(
    supabase,
    projectId,
    userId,
    { title, study_type, description },
    userDefaults || undefined,
    initial_settings
  )

  if (error) {
    return classifyError(error, logger, 'Create study', {
      fallbackMessage: 'Failed to create study',
    })
  }

  logger.info('Study created successfully', { userId, projectId, studyId: study?.id })

  enqueue({
    topic: 'study-created',
    data: {
      studyId: study!.id,
      studyType: study!.study_type,
      projectId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: study!,
  }
}
