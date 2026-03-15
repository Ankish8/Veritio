import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listFavorites } from '../../../services/favorite-service'

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(20).optional().default(10),
})

const favoriteSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  entity_type: z.enum(['project', 'study']),
  entity_id: z.string().uuid(),
  created_at: z.string(),
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }).optional(),
  study: z.object({
    id: z.string().uuid(),
    title: z.string(),
    study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
    status: z.string(),
  }).optional(),
})

const responseSchema = z.array(favoriteSchema)

export const config = {
  name: 'ListFavorites',
  description: 'List favorites for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/favorites',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['favorites-fetched'],
  flows: ['favorites'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Listing favorites', { userId, limit: query.limit })

  const supabase = getMotiaSupabaseClient()
  const { data: favorites, error } = await listFavorites(supabase, userId, query.limit)

  if (error) {
    logger.error('Failed to list favorites', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch favorites' },
    }
  }

  logger.info('Favorites listed successfully', { userId, count: favorites?.length || 0 })

  enqueue({
    topic: 'favorites-fetched',
    data: { resourceType: 'favorite', action: 'list', userId, metadata: { count: favorites?.length || 0 } },
  }).catch(() => {})

  return {
    status: 200,
    body: favorites || [],
  }
}
