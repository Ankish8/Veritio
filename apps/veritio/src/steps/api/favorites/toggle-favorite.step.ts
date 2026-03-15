import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { toggleFavorite } from '../../../services/favorite-service'

const bodySchema = z.object({
  entity_type: z.enum(['project', 'study']),
  entity_id: z.string().uuid(),
})

const responseSchema = z.object({
  isFavorite: z.boolean(),
})

export const config = {
  name: 'ToggleFavorite',
  description: 'Toggle favorite status for a project or study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/favorites/toggle',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['favorite-toggled'],
  flows: ['favorites'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const body = bodySchema.parse(req.body)

  logger.info('Toggling favorite', { userId, entityType: body.entity_type, entityId: body.entity_id })

  const supabase = getMotiaSupabaseClient()
  const { isFavorite, error } = await toggleFavorite(
    supabase,
    userId,
    body.entity_type,
    body.entity_id
  )

  if (error) {
    logger.error('Failed to toggle favorite', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to toggle favorite' },
    }
  }

  logger.info('Favorite toggled successfully', { userId, entityType: body.entity_type, entityId: body.entity_id, isFavorite })

  enqueue({
    topic: 'favorite-toggled',
    data: {
      resourceType: 'favorite',
      action: isFavorite ? 'added' : 'removed',
      userId,
      metadata: { entityType: body.entity_type, entityId: body.entity_id },
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { isFavorite },
  }
}
