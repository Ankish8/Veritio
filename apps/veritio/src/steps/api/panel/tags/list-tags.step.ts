import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelTagService } from '../../../../services/panel/index'

export const config = {
  name: 'ListPanelTags',
  description: 'List all panel tags for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-tags-listed'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Listing panel tags', { userId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelTagService(supabase)

  try {
    const tags = await service.list(userId, organizationId)

    logger.info('Panel tags listed successfully', { userId, count: tags.length })

    enqueue({
      topic: 'panel-tags-listed',
      data: { resourceType: 'panel-tag', action: 'list', userId, count: tags.length },
    }).catch(() => {})

    return {
      status: 200,
      body: tags,
    }
  } catch (error) {
    logger.error('Failed to list panel tags', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to list tags' },
    }
  }
}
