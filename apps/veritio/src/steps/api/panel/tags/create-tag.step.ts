import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagService } from '../../../../services/panel/index'
import { createPanelTagSchema } from '../../../../lib/supabase/panel-types'

export const config = {
  name: 'CreatePanelTag',
  description: 'Create a new panel tag',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createPanelTagSchema as any,
  }],
  enqueues: ['panel-tag-created'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const body = createPanelTagSchema.parse(req.body || {})

  logger.info('Creating panel tag', { userId, name: body.name })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelTagService(supabase)

  try {
    // Check if tag name already exists
    const existing = await service.findByName(userId, organizationId, body.name)
    if (existing) {
      logger.warn('Panel tag with name already exists', { userId, name: body.name })
      return {
        status: 409,
        body: { error: 'A tag with this name already exists' },
      }
    }

    const tag = await service.create(userId, organizationId, body)

    logger.info('Panel tag created successfully', { userId, tagId: tag.id })

    enqueue({
      topic: 'panel-tag-created',
      data: { resourceType: 'panel-tag', action: 'create', userId, tagId: tag.id },
    }).catch(() => {})

    return {
      status: 201,
      body: tag,
    }
  } catch (error) {
    logger.error('Failed to create panel tag', {
      userId,
      name: body.name,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to create tag' },
    }
  }
}
