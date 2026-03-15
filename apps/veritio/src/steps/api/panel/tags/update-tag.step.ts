import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagService } from '../../../../services/panel/index'
import { updatePanelTagSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  tagId: z.string().uuid(),
})

export const config = {
  name: 'UpdatePanelTag',
  description: 'Update a panel tag',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/panel/tags/:tagId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updatePanelTagSchema as any,
  }],
  enqueues: ['panel-tag-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const { tagId } = paramsSchema.parse(req.pathParams)
  const body = updatePanelTagSchema.parse(req.body || {})

  logger.info('Updating panel tag', { userId, tagId })

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
      logger.warn('Cannot update system tag', { userId, tagId })
      return {
        status: 403,
        body: { error: 'Cannot modify system tags' },
      }
    }

    const tag = await service.update(userId, organizationId, tagId, body)

    logger.info('Panel tag updated successfully', { userId, tagId })

    enqueue({
      topic: 'panel-tag-updated',
      data: { resourceType: 'panel-tag', action: 'update', userId, tagId },
    }).catch(() => {})

    return {
      status: 200,
      body: tag,
    }
  } catch (error) {
    logger.error('Failed to update panel tag', {
      userId,
      tagId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update tag' },
    }
  }
}
