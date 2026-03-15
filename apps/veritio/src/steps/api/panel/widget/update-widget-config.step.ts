import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService } from '../../../../services/panel/index'
import { updateWidgetConfigSchema } from '../../../../lib/supabase/panel-types'

export const config = {
  name: 'UpdatePanelWidgetConfig',
  description: 'Update the widget configuration for the current user',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/panel/widget',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: updateWidgetConfigSchema as any,
  }],
  enqueues: ['panel-widget-config-updated'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const body = updateWidgetConfigSchema.parse(req.body || {})

  logger.info('Updating panel widget config', { userId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelWidgetService(supabase)

  try {
    const widgetConfig = await service.upsertConfig(userId, organizationId, body as any)

    logger.info('Panel widget config updated successfully', { userId })

    enqueue({
      topic: 'panel-widget-config-updated',
      data: { resourceType: 'panel-widget', action: 'update', userId },
    }).catch(() => {})

    return {
      status: 200,
      body: widgetConfig,
    }
  } catch (error) {
    logger.error('Failed to update panel widget config', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to update widget configuration' },
    }
  }
}
