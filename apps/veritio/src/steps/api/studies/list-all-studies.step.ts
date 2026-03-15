import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listAllStudies } from '../../../services/dashboard-service'

const querySchema = z.object({
  type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  search: z.string().optional(),
  archived: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
})

const studySchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  created_at: z.string(),
  updated_at: z.string(),
  project_name: z.string(),
  participant_count: z.number(),
})

const responseSchema = z.object({
  data: z.array(studySchema),
  total: z.number(),
})

export const config = {
  name: 'ListAllStudies',
  description: 'List all studies across all projects for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['studies-fetched'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Listing all studies', { userId, ...query })

  const supabase = getMotiaSupabaseClient()
  const { data: studies, total, error } = await listAllStudies(supabase, userId, {
    type: query.type,
    status: query.status,
    search: query.search,
    archived: query.archived,
    limit: query.limit,
    offset: query.offset,
  })

  if (error) {
    logger.error('Failed to list studies', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch studies' },
    }
  }

  logger.info('Studies listed successfully', { userId, count: studies?.length || 0, total })

  enqueue({
    topic: 'studies-fetched',
    data: { resourceType: 'study', action: 'list-all', userId, metadata: { count: studies?.length || 0, total } },
  }).catch(() => {})

  return {
    status: 200,
    body: { data: studies || [], total },
  }
}
