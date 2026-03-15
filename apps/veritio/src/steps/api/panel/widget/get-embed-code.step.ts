import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService } from '../../../../services/panel/index'

export const config = {
  name: 'GetPanelWidgetEmbedCode',
  description: 'Get the HTML embed code for the widget',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/widget/embed-code',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Getting panel widget embed code', { userId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelWidgetService(supabase)

  try {
    // Get base URL from headers or environment
    const host = req.headers['host'] || process.env.NEXT_PUBLIC_APP_URL || 'https://app.veritio.com'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = `${protocol}://${host}`

    const embedCode = await service.getEmbedCode(userId, organizationId, baseUrl)

    logger.info('Panel widget embed code generated', { userId })

    return {
      status: 200,
      body: { embed_code: embedCode },
    }
  } catch (error) {
    logger.error('Failed to get panel widget embed code', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to get embed code' },
    }
  }
}
