import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  tagId: z.string().uuid(),
})

export const config = {
  name: 'DeletePanelTag',
  description: 'Delete a panel tag',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/panel/tags/:tagId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-tag-deleted'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { tagId } = paramsSchema.parse(req.pathParams)

  logger.info('Deleting panel tag', { userId, tagId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelTagService(supabase)

  try {
    const existing = await service.get(userId, organizationId, tagId)
    if (!existing) {
      logger.warn('Panel tag not found', { userId, tagId })
      return {
        status: 404,
        body: { error: 'Tag not found' },
      }
    }

    if (existing.is_system) {
      logger.warn('Cannot delete system tag', { userId, tagId })
      return {
        status: 403,
        body: { error: 'Cannot delete system tags' },
      }
    }

    await service.delete(userId, organizationId, tagId)

    logger.info('Panel tag deleted successfully', { userId, tagId })

    enqueue({
      topic: 'panel-tag-deleted',
      data: { resourceType: 'panel-tag', action: 'delete', userId, tagId },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to delete panel tag', {
      userId,
      tagId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to delete tag' },
    }
  }
}
