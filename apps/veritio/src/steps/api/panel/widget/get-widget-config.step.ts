import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService, createPanelTagService } from '../../../../services/panel/index'

export const config = {
  name: 'GetPanelWidgetConfig',
  description: 'Get the widget configuration for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/widget',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['panel-widget-config-fetched'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Getting panel widget config', { userId })

  const supabase = getMotiaSupabaseClient()
  const widgetService = createPanelWidgetService(supabase)
  const tagService = createPanelTagService(supabase)

  try {
    let widgetConfig = await widgetService.getConfig(userId, organizationId)

    // If no config exists, create default and ensure default tags exist
    if (!widgetConfig) {
      await tagService.createDefaultTags(userId, organizationId)
      widgetConfig = await widgetService.upsertConfig(userId, organizationId, {})
    }

    logger.info('Panel widget config fetched successfully', { userId })

    enqueue({
      topic: 'panel-widget-config-fetched',
      data: { resourceType: 'panel-widget', action: 'get', userId },
    }).catch(() => {})

    return {
      status: 200,
      body: widgetConfig,
    }
  } catch (error) {
    logger.error('Failed to get panel widget config', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get widget configuration' },
    }
  }
}
