import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService } from '../../../../services/panel/index'

const paramsSchema = z.object({
  embedCodeId: z.string().min(8).max(20),
})

export const config = {
  name: 'GetPublicWidgetConfig',
  description: 'Public endpoint to get widget configuration',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/widget/public/:embedCodeId',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: ['panel-widget-impression'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const { embedCodeId } = paramsSchema.parse(req.pathParams)

  logger.info('Getting public widget config', { embedCodeId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelWidgetService(supabase)

  try {
    const publicConfig = await service.getPublicConfig(embedCodeId)

    if (!publicConfig) {
      logger.warn('Widget config not found or disabled', { embedCodeId })
      return {
        status: 404,
        body: { error: 'Widget not found or disabled' },
      }
    }

    logger.info('Public widget config fetched', { embedCodeId })

    // Track impression
    enqueue({
      topic: 'panel-widget-impression',
      data: { resourceType: 'panel-widget', action: 'impression', embedCodeId },
    }).catch(() => {})

    return {
      status: 200,
      body: publicConfig,
    }
  } catch (error) {
    logger.error('Failed to get public widget config', {
      embedCodeId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get widget configuration' },
    }
  }
}
