import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getStudy } from '../../../services/study-service'

const studyResponseSchema = z.object({
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
  purpose: z.string().nullable(),
  participant_requirements: z.string().nullable(),
  url_slug: z.string().nullable(),
  language: z.string(),
  password: z.string().nullable(),
  session_recording_settings: z.any(),
  closing_rule: z.any(),
  branding: z.any(),
  participant_count: z.number(),
  cards: z.array(z.any()),
  categories: z.array(z.any()),
  tree_nodes: z.array(z.any()),
  tasks: z.array(z.any()),
})

export const config = {
  name: 'GetStudy',
  description: 'Get a single study with all related content',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: studyResponseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-fetched'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  logger.info('Getting study', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: study, error } = await getStudy(supabase, studyId, userId)

  if (error) {
    if (error.message === 'Study not found') {
      logger.warn('Study not found', { userId, studyId })
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    logger.error('Failed to get study', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch study' },
    }
  }

  logger.info('Study fetched successfully', { userId, studyId })

  // Await emit to prevent worker exit before completion (EPIPE cascade)
  enqueue({
    topic: 'study-fetched',
    data: { resourceType: 'study', resourceId: studyId, action: 'get', userId, studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: study!,
  }
}
