import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listStudiesByProject } from '../../../services/study-service'

const studySchema = z.object({
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
  participant_count: z.number(),
})

export const config = {
  name: 'ListStudies',
  description: 'List all studies in a project with cursor-based pagination',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/projects/:projectId/studies',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({
      data: z.array(studySchema),
      pagination: z.object({
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
        total: z.number().nullable(),
      }),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-listed'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest,
  { logger, enqueue }: ApiHandlerContext
) => {
  const userId = req.headers['x-user-id'] as string
  const { projectId } = req.pathParams
  const { cursor, limit } = req.queryParams || {}

  logger.info('Listing studies with pagination', { userId, projectId, cursor, limit })

  const supabase = getMotiaSupabaseClient()
  const { data: allStudies, total, error } = await listStudiesByProject(supabase, projectId, userId, {
    cursor: cursor as string | undefined,
    limit: limit as number | undefined,
  })

  if (error) {
    if (error.message === 'Project not found') {
      logger.warn('Project not found for studies list', { userId, projectId })
      return {
        status: 404,
        body: { error: 'Project not found' },
      }
    }

    logger.error('Failed to list studies', { userId, projectId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch studies' },
    }
  }

  // We fetched limit+1 to check hasMore, so split the data
  const pageSize = (limit as number | undefined) || 50
  const hasMore = (allStudies?.length || 0) > pageSize
  const studies = hasMore ? (allStudies || []).slice(0, pageSize) : allStudies || []

  logger.info('Studies listed successfully', {
    userId,
    projectId,
    count: studies.length,
    hasMore,
  })

  enqueue({
    topic: 'study-listed',
    data: {
      resourceType: 'study',
      action: 'list',
      userId,
      projectId,
      metadata: { count: studies.length, hasMore },
    },
  }).catch(() => {})

  const nextCursor = hasMore && studies.length > 0 ? studies[studies.length - 1]!.created_at : null

  return {
    status: 200,
    body: {
      data: studies,
      pagination: {
        nextCursor,
        hasMore,
        total: total ?? null,
      },
    },
  }
}
